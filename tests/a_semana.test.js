// Bloque A · recorrido semanal completo con datos de prueba identificados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { startEnv, scenario } from './helpers.js';
import { TINY_JPG } from '../server/seed/client.js';

test('Recorrido 1: captura en dos ubicaciones, revisión, observación, nueva versión, autorización y pago', async (t) => {
  const env = await startEnv(); t.after(() => env.stop());
  const S = await scenario(env); const L = S.lucia;
  const sup = await env.as('supervisor'), con = await env.as('contratista'), tes = await env.as('tesoreria');

  // El supervisor captura piso en sótano 1 y planta baja (generador con fórmula visible).
  const cap = await sup.post('/api/progress', { entries: [
    { workId: S.work, locationId: S.sotano, conceptId: S.piso, contractorId: S.contractor, executionDate: '2026-08-27', submit: true, generator: [{ label: 'Lobby', length: '5.08', width: '2', pieces: '1' }, { label: 'Pasillo', length: '5.63', width: '1' }] },
    { workId: S.work, locationId: S.pb, conceptId: S.piso, contractorId: S.contractor, executionDate: '2026-08-28', submit: true, qty: '25.24', description: 'Sala y comedor' },
  ] });
  const [e1, e2] = cap.results.map((r) => r.id);
  const d1 = await sup.get(`/api/progress/${e1}`);
  assert.equal(d1.qty, '15.7900'); assert.equal(d1.generator.length, 2); assert.equal(d1.generator[0].formula, 'largo × ancho × piezas − deducciones');
  assert.equal(d1.location, 'Sótano 1'); assert.equal(d1.author, 'Supervisor (prueba)'); assert.equal(d1.unit, 'm2');
  // Criterio 36: una fotografía solo cuenta como evidencia cuando el servidor confirmó la carga.
  assert.equal(d1.evidence, 0);
  const att = await sup.upload('foto-sotano.jpg', TINY_JPG, { kind: 'foto', workId: S.work });
  assert.equal(att.confirmed, true);
  await sup.post('/api/evidence', { attachmentId: att.id, objectType: 'progressEntry', objectId: e1 });
  assert.equal((await sup.get(`/api/progress/${e1}`)).evidence, 1);

  // El supervisor no valida sus propios avances ni ve estimaciones.
  assert.equal((await sup.try('POST', `/api/progress/${e1}/review`, { decision: 'validar' })).status, 403);
  assert.equal((await sup.try('GET', '/api/c-estimates')).data.total, 0);
  for (const id of [e1, e2]) await L.post(`/api/progress/${id}/review`, { decision: 'validar' });

  // Estimación agrupada por concepto: 15.79 + 25.24 = 41.03 m² conservando ambas ubicaciones (criterio 12).
  const est = await L.post('/api/c-estimates', { workId: S.work, contractorId: S.contractor, periodId: S.period });
  await L.post(`/api/c-estimates/${est.id}/generate`, { groupBy: 'concepto' });
  let doc = await L.get(`/api/c-estimates/${est.id}`);
  assert.equal(doc.items.length, 1); assert.equal(doc.items[0].qty, '41.0300'); assert.equal(doc.items[0].amount, '14360.50');
  assert.deepEqual(doc.items[0].allocations.map((a) => [a.location, a.qty]).sort(), [['Planta baja', '25.2400'], ['Sótano 1', '15.7900']]);
  // Criterio 11: incorporar de nuevo no vuelve a incluir la misma ejecución.
  assert.equal((await L.post(`/api/c-estimates/${est.id}/generate`, { groupBy: 'concepto' })).added, 0);
  // No puede existir otra estimación ordinaria para la misma obra, contratista y semana.
  assert.equal((await L.try('POST', '/api/c-estimates', { workId: S.work, contractorId: S.contractor, periodId: S.period })).status, 409);

  // El contratista no la ve hasta que se le comparte.
  assert.equal((await con.try('GET', `/api/c-estimates/${est.id}`)).status, 404);
  await L.post(`/api/c-estimates/${est.id}/transition`, { to: 'revision_interna' });
  await L.post(`/api/c-estimates/${est.id}/transition`, { to: 'revision_contratista' });
  doc = await con.get(`/api/c-estimates/${est.id}`);
  assert.equal(doc.version, 1); const item = doc.items[0];
  const pbAlloc = item.allocations.find((a) => a.location === 'Planta baja');

  // El contratista observa una cantidad; no sobrescribe la captura.
  const obs = await con.post(`/api/c-estimates/${est.id}/observe`, { itemId: item.id, allocationId: pbAlloc.id, proposedQty: '42.03', text: 'En planta baja faltó medir el vestíbulo: 26.24 m².' });
  assert.equal((await L.get(`/api/progress/${e2}`)).qty, '25.2400');
  assert.equal((await L.get(`/api/c-estimates/${est.id}`)).status, 'conciliacion');
  // Mientras está observada no se autoriza como si estuviera acordada.
  const early = await L.try('POST', `/api/c-estimates/${est.id}/authorize`, {});
  assert.equal(early.status, 409);

  // Lucía resuelve; se conserva el antes y el después y la medición original.
  const res = await L.post(`/api/observations/${obs.id}/resolve`, { resolution: 'aceptada', note: 'Se verificó en sitio la medición del vestíbulo.' });
  assert.equal(res.before.qty, '41.0300'); assert.equal(res.after.qty, '42.0300'); assert.equal(res.after.version, 2);
  const en2 = await L.get(`/api/progress/${e2}`);
  assert.equal(en2.qty, '25.2400'); assert.equal(en2.effectiveQty, '26.2400'); assert.equal(en2.adjustments.length, 1);

  // Criterio 9: aceptar la versión anterior no vale para la vigente.
  const stale = await con.try('POST', `/api/c-estimates/${est.id}/accept`, { version: 1 });
  assert.equal(stale.status, 409);
  const acc = await con.post(`/api/c-estimates/${est.id}/accept`, { version: 2 });
  assert.equal(acc.status, 'lista_autorizar');
  doc = await L.get(`/api/c-estimates/${est.id}`);
  assert.equal(doc.conformity.version, 2); assert.equal(doc.conformity.valid, true); assert.equal(doc.conformity.actorName, 'Contratista Uno (prueba)');

  // Coordinación revisa pero no autoriza (sus facultades financieras se conceden aparte).
  const luis = await env.as('coordinacion');
  assert.equal((await luis.try('POST', `/api/c-estimates/${est.id}/authorize`, {})).status, 403);
  const au = await L.post(`/api/c-estimates/${est.id}/authorize`, {});
  assert.equal(au.authorizedTotal, '14710.50'); // 42.03 × 350

  // Criterio 7: cambiar la tarifa mañana no modifica el documento autorizado ayer.
  await L.post('/api/rates', { circuit: 'contratacion', conceptId: S.piso, price: '400', validFrom: '2026-08-30' });
  doc = await L.get(`/api/c-estimates/${est.id}`);
  assert.equal(doc.items[0].unitPrice, '350.0000'); assert.equal(doc.totals.authorized, '14710.50');
  const frozen = await L.get(`/api/c-estimates/${est.id}/versions/2`);
  assert.equal(frozen.items[0].amount, '14710.50'); assert.equal(frozen.items[0].rate.price, '350.0000');

  // Cierre semanal → instrucciones; pago preparado ≠ confirmado (criterio 15).
  const board = await L.get(`/api/closes/board?periodId=${S.period}`);
  assert.equal(board.totals.cash, '14710.50'); assert.ok(board.checks.every((c) => c.ok));
  const close = await L.post('/api/closes', { periodId: S.period });
  assert.equal(close.totals.cash, '14710.50'); assert.equal(close.totals.reconciliation, '0.00');
  const ob = au.obligationId;
  const pay = await tes.post('/api/disbursements', { date: '2026-08-29', accountId: S.cash, methodId: S.method.efectivo, amount: '10000', applications: [{ obligationId: ob, amount: '10000' }] });
  let o = await tes.get(`/api/obligations/${ob}`);
  assert.equal(o.paid, '0.00'); assert.equal(o.payStatus, 'sin_pago'); assert.equal(o.reserved, '10000.00');
  // Tesorería no autoriza sus propios pagos ni confirma sin autorización.
  assert.equal((await tes.try('POST', `/api/disbursements/${pay.id}/authorize`, {})).status, 403);
  assert.equal((await tes.try('POST', `/api/disbursements/${pay.id}/confirm`, {})).status, 409);
  await L.post(`/api/disbursements/${pay.id}/authorize`, {});
  // El efectivo se confirma con recibo.
  assert.equal((await tes.try('POST', `/api/disbursements/${pay.id}/confirm`, {})).status, 409);
  const rec = await tes.upload('recibo.jpg', TINY_JPG, { kind: 'comprobante' });
  await tes.post(`/api/disbursements/${pay.id}/confirm`, { receiptAttachmentId: rec.id, deliveredByName: 'Tesorería (prueba)' });
  // Criterio 16: pago parcial con saldo exacto.
  o = await tes.get(`/api/obligations/${ob}`);
  assert.equal(o.paid, '10000.00'); assert.equal(o.balance, '4710.50'); assert.equal(o.payStatus, 'parcial');
  // No se puede aplicar más que el saldo.
  assert.equal((await tes.try('POST', '/api/disbursements', { date: '2026-08-29', accountId: S.cash, methodId: S.method.efectivo, amount: '5000', applications: [{ obligationId: ob, amount: '5000' }] })).status, 409);

  // Criterio 17: el reverso restaura saldos y conserva el movimiento original.
  const rv = await L.post(`/api/disbursements/${pay.id}/reverse`, { reason: 'Se entregó a la persona equivocada' });
  o = await tes.get(`/api/obligations/${ob}`);
  assert.equal(o.paid, '0.00'); assert.equal(o.balance, '14710.50'); assert.equal(o.payStatus, 'con_reverso');
  assert.equal((await tes.get(`/api/disbursements/${pay.id}`)).status, 'revertido');
  assert.equal((await tes.get(`/api/disbursements/${rv.reversalId}`)).status, 'confirmado');

  // Vista del contratista: su estado de cuenta, sin datos internos (criterio 2).
  const st = await con.get('/api/contractor/statement');
  assert.equal(st.totals.gross, '14710.50'); assert.equal(st.totals.balance, '14710.50');
  const con2 = await env.as('contratista2');
  assert.equal((await con2.try('GET', `/api/c-estimates/${est.id}`)).status, 404);
  assert.equal((await con2.try('GET', `/api/obligations/${ob}`)).status, 404);
  assert.equal((await con.try('GET', '/api/rates')).status, 404);
  assert.equal((await con.try('GET', '/api/progress')).status, 404);
  assert.equal((await con.try('GET', `/api/attachments/${att.id}/content`)).status, 200); // evidencia de su propia partida
  assert.equal((await con2.try('GET', `/api/attachments/${att.id}/content`)).status, 404);

  // Auditoría encadenada e íntegra.
  const aud = await (await env.as('auditor')).get('/api/audit/verify');
  assert.equal(aud.ok, true);
});

test('Caso documentado de cierre: bruto 322,879.30 → efectivo 277,999.30 (criterio 14) y atomicidad (criterio 32)', async (t) => {
  const env = await startEnv(); t.after(() => env.stop());
  const S = await scenario(env); const L = S.lucia;
  const est = await L.post('/api/c-estimates', { workId: S.work, contractorId: S.contractor, periodId: S.period });
  await L.post(`/api/c-estimates/${est.id}/items`, { description: 'Importe de prueba del caso documentado de cierre', amount: '322879.30', reason: 'Caso de prueba aislado' });
  await L.post(`/api/c-estimates/${est.id}/transition`, { to: 'revision_interna' });
  const au = await L.post(`/api/c-estimates/${est.id}/authorize`, { exceptionReason: 'Caso de prueba: sin conformidad del contratista' });
  const ob = au.obligationId;
  await L.post(`/api/obligations/${ob}/components`, { kind: 'nomina_bancaria', amount: '41110', support: 'Dispersión de nómina bancaria', authorize: true });
  await L.post(`/api/obligations/${ob}/components`, { kind: 'descuento', amount: '3500', support: 'Cuotas de seguridad social capturadas con soporte', authorize: true });
  // Un descuento sin soporte no se acepta; uno sin autorizar bloquea el cierre.
  assert.equal((await L.try('POST', `/api/obligations/${ob}/components`, { kind: 'descuento', amount: '270' })).status, 422);
  const tes = await env.as('tesoreria');
  assert.equal((await tes.try('POST', `/api/obligations/${ob}/components`, { kind: 'descuento', amount: '270', support: 'Crédito de vivienda' })).status, 403);
  const c3 = await L.post(`/api/obligations/${ob}/components`, { kind: 'descuento', amount: '270', support: 'Crédito de vivienda, aviso de retención' });
  let b = await L.get(`/api/closes/board?periodId=${S.period}`);
  assert.equal(b.checks.find((c) => c.code === 'descuentos').ok, false);
  assert.equal((await L.try('POST', '/api/closes', { periodId: S.period })).status, 409);
  await L.post(`/api/pay-components/${c3.id}/decide`, { decision: 'autorizar' });
  b = await L.get(`/api/closes/board?periodId=${S.period}`);
  assert.equal(b.totals.grossToClose, '322879.30'); assert.equal(b.totals.bank, '41110.00'); assert.equal(b.totals.discounts, '3770.00'); assert.equal(b.totals.cash, '277999.30'); assert.equal(b.totals.difference, '0.00');

  // Fallo simulado a mitad del cierre: no queda nada a medias.
  const before = env.store.manifest.generation;
  env.store.failpoint = 'after-first-collection';
  assert.equal((await L.try('POST', '/api/closes', { periodId: S.period })).status, 500);
  env.store.failpoint = null;
  assert.equal(env.store.manifest.generation, before);
  const db = env.store.view();
  assert.equal(db.count('weeklyCloses'), 0); assert.equal(db.count('paymentInstructions'), 0); assert.equal(db.count('closeDocuments'), 0);
  assert.equal(db.get('cEstimates', est.id).status, 'autorizada');

  // Reintento con la misma clave idempotente: un solo cierre (criterio 33).
  const r1 = await L.post('/api/closes', { periodId: S.period }, { key: 'cierre-s35' });
  const r2 = await L.post('/api/closes', { periodId: S.period }, { key: 'cierre-s35' });
  assert.equal(r1.id, r2.id); assert.equal(env.store.view().count('weeklyCloses'), 1);
  assert.deepEqual(r1.totals, { gross: '322879.30', discounts: '3770.00', advances: '0.00', bank: '41110.00', cash: '277999.30', extraCost: '0.00', reconciliation: '0.00' });
  const closeDoc = await L.get(`/api/closes/${r1.id}`);
  assert.deepEqual(closeDoc.instructions.map((i) => [i.medium, i.amount]).sort(), [['banco', '41110.00'], ['efectivo', '277999.30']]);
  // El importe asignado a banco no es un pago bancario confirmado.
  assert.equal((await L.get(`/api/obligations/${ob}`)).paid, '0.00');
});
