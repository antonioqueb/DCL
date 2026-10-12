// Bloques B y C · costos, caja, presupuesto, estimaciones al cliente y cobranza (datos de prueba identificados).
import test from 'node:test';
import assert from 'node:assert/strict';
import { startEnv, scenario } from './helpers.js';
import { TINY_JPG } from '../server/seed/client.js';

async function validated(S, sup, L, o) { const r = await sup.post('/api/progress', { workId: S.work, contractorId: S.contractor, submit: true, ...o }); await L.post(`/api/progress/${r.id}/review`, { decision: 'validar' }); return r.id; }
async function budget(S, L) {
  const b = await L.post(`/api/works/${S.work}/budgets`, { name: 'Presupuesto de prueba' });
  await L.put(`/api/budget-versions/${b.id}/items`, { items: [
    { chapter: 'PISOS INTERIORES', locationId: S.sotano, conceptId: S.kPiso, description: 'Piso de mármol en sótano 1', unitId: S.unit.m2, qty: '135', price: '1280' },
    { chapter: 'PISOS INTERIORES', locationId: S.pb, conceptId: S.kPiso, description: 'Piso de mármol en planta baja', unitId: S.unit.m2, qty: '240', price: '1280' },
    { chapter: 'BAÑOS', locationId: S.bano, conceptId: S.kLimpieza, description: 'Limpieza y sellado de baño', unitId: S.unit.m2, qty: '78.3', price: '270' },
  ] });
  await L.post(`/api/budget-versions/${b.id}/transition`, { to: 'enviado' });
  await L.post(`/api/budget-versions/${b.id}/transition`, { to: 'aceptado', acceptedByName: 'Representante del cliente (prueba)' });
  const v = await L.get(`/api/budget-versions/${b.id}`);
  return { id: b.id, sotano: v.items[0].id, pb: v.items[1].id, limpieza: v.items[2].id };
}

test('Recorridos 3 y 4: estimación al cliente con avances de varias semanas, anticipo, amortización y cobro parcial', async (t) => {
  const env = await startEnv(); t.after(() => env.stop());
  const S = await scenario(env); const L = S.lucia; const sup = await env.as('supervisor'), cli = await env.as('cliente'), aux = await env.as('auxiliar');
  const B = await budget(S, L);
  // Criterio 21: la partida de $21,141 sin ejecución sigue visible como pendiente (no como dinero perdido).
  let tr = await L.get(`/api/works/${S.work}/budget-tracking`);
  const limp = tr.rows.find((r) => r.id === B.limpieza);
  assert.equal(limp.budgetAmount, '21141.00'); assert.equal(limp.state, 'pendiente'); assert.equal(limp.executedQty, '0.0000'); assert.equal(limp.pendingAmount, '21141.00');

  // Contrato de prueba: impuesto 8 %, amortización 7 % sobre subtotal (condiciones del contrato, no reglas generales).
  await L.post(`/api/works/${S.work}/contracts`, { taxRate: '8', taxLabel: 'IVA 8 % (según contrato de prueba)', amortizationPct: '7', amortizationBase: 'subtotal', advanceKind: 'importe', advanceAmount: '350283.56', dueDays: 15, termsValidated: true });
  // Anticipo: bruto, comisión y neto en conceptos separados (criterio de la sección 25).
  const adv = await aux.post('/api/receipts', { kind: 'anticipo', date: '2026-03-14', accountId: S.bank, clientId: S.client, workId: S.work, grossAmount: '350283.56', commission: '35028.36', netAmount: '315255.20', reference: 'ANT-PRUEBA' });
  let advs = await L.get('/api/client-advances');
  assert.deepEqual([advs.items[0].gross, advs.items[0].commission, advs.items[0].net, advs.items[0].balance], ['350283.56', '35028.36', '315255.20', '350283.56']);
  assert.equal(advs.items[0].commissionValidated, false);
  const bankBefore = (await L.get('/api/cash/accounts')).items.find((a) => a.code === 'BANCO').balance;
  assert.equal(bankBefore, '1315255.20'); // entra el neto, no el bruto

  // Avances de dos semanas distintas, ligados al presupuesto.
  const e1 = await validated(S, sup, L, { locationId: S.sotano, conceptId: S.piso, executionDate: '2026-08-20', qty: '15.79', budgetItemId: B.sotano });
  const e2 = await validated(S, sup, L, { locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-27', qty: '25.24', budgetItemId: B.pb });
  const e3 = await validated(S, sup, L, { locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-28', qty: '10', budgetItemId: B.pb });

  // Se paga al contratista antes de estimar al cliente (criterio 19).
  const ce = await L.post('/api/c-estimates', { workId: S.work, contractorId: S.contractor, periodId: S.period });
  await L.post(`/api/c-estimates/${ce.id}/generate`, {}); await L.post(`/api/c-estimates/${ce.id}/transition`, { to: 'revision_interna' });
  await L.post(`/api/c-estimates/${ce.id}/authorize`, { exceptionReason: 'Prueba: conformidad registrada fuera del sistema' });
  const pend = await L.get('/api/reports/ejecucion-no-estimada');
  assert.equal(pend.total, 3); assert.ok(pend.items.every((r) => r.paidToContractor === r.available));

  const k = await L.post('/api/k-estimates', { workId: S.work, periodFrom: '2026-08-01', periodTo: '2026-08-31' });
  const gen = await L.post(`/api/k-estimates/${k.id}/generate`, {});
  assert.equal(gen.added, 2);
  let kd = await L.get(`/api/k-estimates/${k.id}`);
  const pbItem = kd.items.find((i) => i.budgetItemId === B.pb);
  assert.equal(pbItem.proposedQty, '35.2400'); assert.equal(pbItem.price, '1280.0000'); // precio del presupuesto, no la tarifa del contratista (350)
  assert.equal(pbItem.allocations.length, 2); assert.deepEqual(pbItem.allocations.map((a) => a.period).sort(), ['2026-S35', '2026-S35']);
  assert.equal(kd.summary.subtotal, '65318.40'); // (15.79 + 35.24) × 1280
  assert.equal(kd.summary.taxAmount, '5225.47'); assert.equal(kd.summary.amortization, '4572.29'); assert.equal(kd.summary.total, '65971.58');
  // La ejecución no se duplica: una segunda estimación no encuentra nada disponible.
  const k2 = await L.post('/api/k-estimates', { workId: S.work, periodFrom: '2026-09-01', periodTo: '2026-09-15' });
  assert.equal((await L.post(`/api/k-estimates/${k2.id}/generate`, {})).added, 0);
  assert.equal((await L.try('POST', `/api/k-estimates/${k2.id}/items`, { budgetItemId: B.sotano, allocations: [{ progressEntryId: e1, qty: '1' }] })).status, 409);

  // El cliente no la ve hasta que se publica; ve la versión exacta publicada, sin costos.
  assert.equal((await cli.try('GET', `/api/k-estimates/${k.id}`)).status, 404);
  const preview = await L.get(`/api/k-estimates/${k.id}/client-preview`);
  await L.post(`/api/k-estimates/${k.id}/transition`, { to: 'revision_interna' });
  await L.post(`/api/k-estimates/${k.id}/transition`, { to: 'enviada' });
  const seen = await cli.get(`/api/k-estimates/${k.id}`);
  assert.deepEqual(seen.items, preview.items); assert.equal(seen.summary.total, '65971.58');
  const txt = JSON.stringify(seen);
  for (const banned of ['350.0000', 'Contratista de Prueba', 'Supervisor (prueba)', 'internalNotes', 'unitPrice', 'margin']) assert.ok(!txt.includes(banned), `el cliente no debe ver: ${banned}`);
  // Criterio 3: sin acceso a costos, márgenes ni datos internos por API directa.
  for (const u of ['/api/results', '/api/expenses', `/api/works/${S.work}/summary`, '/api/c-estimates', '/api/progress', '/api/obligations', '/api/audit', '/api/catalog/workers', '/api/rates', '/api/receivables']) { const r = await cli.try('GET', u); assert.ok(r.status === 404 || r.status === 403 || r.data.total === 0, `${u} → ${r.status}`); }
  assert.equal((await (await env.as('cliente2')).try('GET', `/api/k-estimates/${k.id}`)).status, 404);

  // Aprobación parcial: el cliente acepta menos en planta baja; lo no aceptado vuelve a quedar disponible.
  const sotItem = seen.items.find((i) => i.description.includes('sótano'));
  const pbSeen = seen.items.find((i) => i.description.includes('planta baja'));
  assert.equal((await cli.try('POST', `/api/k-estimates/${k.id}/respond`, { decision: 'aceptar', version: 99 })).status, 409);
  const ap = await cli.post(`/api/k-estimates/${k.id}/respond`, { decision: 'aceptar', version: 1, items: [{ itemId: sotItem.id, status: 'aceptada' }, { itemId: pbSeen.id, status: 'aceptada', acceptedQty: '25.24' }] });
  // subtotal 41.03 × 1280 = 52,518.40; IVA 8 % = 4,201.47; amortización 7 % = 3,676.29
  assert.equal(ap.total, '53043.58');
  const rest = await L.get(`/api/works/${S.work}/billable`);
  assert.equal(rest.items.length, 1); assert.equal(rest.items[0].available, '10.0000'); assert.equal(rest.items[0].entryId, e3);
  // Criterio 18: la amortización reduce el anticipo sin crear otra entrada bancaria.
  advs = await L.get('/api/client-advances');
  assert.equal(advs.items[0].balance, '346607.27');
  assert.equal((await L.get('/api/cash/accounts')).items.find((a) => a.code === 'BANCO').balance, bankBefore);

  // Factura relacionada: no duplica la cuenta por cobrar (criterio 20).
  await aux.post('/api/invoices', { folio: 'F-PRUEBA-1', clientId: S.client, workId: S.work, date: '2026-09-02', total: '53043.58', links: [{ kEstimateId: k.id, amount: '53043.58' }] });
  let ar = await L.get('/api/receivables');
  assert.equal(ar.summary.approvedBalance, '53043.58'); assert.equal(ar.summary.pendingInvoice, '0.00'); assert.equal(ar.items[0].invoiced, '53043.58');
  // Cobro parcial: saldo distinto al efecto de la amortización.
  assert.equal((await aux.try('POST', '/api/receipts', { date: '2026-09-10', accountId: S.bank, clientId: S.client, workId: S.work, grossAmount: '60000', applications: [{ kEstimateId: k.id, amount: '60000' }] })).status, 409);
  await aux.post('/api/receipts', { date: '2026-09-10', accountId: S.bank, clientId: S.client, workId: S.work, grossAmount: '30000', reference: 'TRF-1', applications: [{ kEstimateId: k.id, amount: '30000' }] });
  ar = await L.get('/api/receivables');
  assert.equal(ar.items[0].collected, '30000.00'); assert.equal(ar.items[0].balance, '23043.58'); assert.equal(ar.summary.advancesAvailable, '346607.27');
  assert.equal((await L.get('/api/cash/accounts')).items.find((a) => a.code === 'BANCO').balance, '1345255.20');
  // Lo aprobado al cliente no cambió lo autorizado al contratista.
  assert.equal((await L.get(`/api/c-estimates/${ce.id}`)).totals.authorized, '17860.50'); // 51.03 × 350
  // Resumen de obra: cada estado por separado.
  const sum = await L.get(`/api/works/${S.work}/summary`); const card = (k2) => sum.cards.find((x) => x.key === k2).value;
  assert.equal(card('aprobado'), '52518.40'); assert.equal(card('cobrado'), '30000.00'); assert.equal(card('porCobrar'), '23043.58'); assert.equal(card('manoObra'), '17860.50'); assert.equal(card('pagado'), '0.00'); assert.equal(card('anticipo'), '346607.27');
  assert.equal(sum.margin.partial, true);
});

test('Recorrido 2: adicional con costo autorizado y cobro pendiente = exposición, no ingreso (criterio 22)', async (t) => {
  const env = await startEnv(); t.after(() => env.stop());
  const S = await scenario(env); const L = S.lucia; const sup = await env.as('supervisor');
  const a = await sup.post('/api/additionals', { workId: S.work, locationId: S.bano, date: '2026-08-26', description: 'Reposición de dos piezas dañadas por otro contratista en regadera', kind: 'reposicion', executorId: S.contractor, executed: true, qty: '1', unitId: S.unit.lote });
  // Sin evidencia no se valida; el supervisor no autoriza costos.
  assert.equal((await L.try('POST', `/api/additionals/${a.id}/operation`, { status: 'validado' })).status, 409);
  const ph = await sup.upload('adicional.jpg', TINY_JPG, { kind: 'foto', workId: S.work });
  await sup.post('/api/evidence', { attachmentId: ph.id, objectType: 'additional', objectId: a.id });
  await L.post(`/api/additionals/${a.id}/operation`, { status: 'validado' });
  assert.equal((await sup.try('POST', `/api/additionals/${a.id}/cost`, { amount: '1500' })).status, 403);
  assert.equal((await L.try('POST', `/api/additionals/${a.id}/cost`, {})).status, 422); // nunca cero por omisión
  await L.post(`/api/additionals/${a.id}/cost`, { amount: '1500' });
  let d = await L.get(`/api/additionals/${a.id}`);
  assert.equal(d.costStatus, 'autorizado'); assert.equal(d.saleStatus, 'pendiente'); assert.equal(d.exposure, '1500.00');
  // Se puede pagar aunque el cobro siga pendiente.
  const est = await L.post('/api/c-estimates', { workId: S.work, contractorId: S.contractor, periodId: S.period });
  assert.equal((await L.post(`/api/c-estimates/${est.id}/generate`, {})).added, 1);
  await L.post(`/api/c-estimates/${est.id}/transition`, { to: 'revision_interna' });
  await L.post(`/api/c-estimates/${est.id}/authorize`, { exceptionReason: 'Prueba sin conformidad' });
  // No puede cobrarse al cliente sin su aprobación, y no aparece como ingreso.
  const k = await L.post('/api/k-estimates', { workId: S.work, periodFrom: '2026-08-01', periodTo: '2026-08-31' });
  assert.equal((await L.try('POST', `/api/k-estimates/${k.id}/items`, { additionalId: a.id, proposedQty: '1' })).status, 409);
  const sum = await L.get(`/api/works/${S.work}/summary`);
  assert.equal(sum.cards.find((x) => x.key === 'aprobado').value, '0.00'); assert.equal(sum.cards.find((x) => x.key === 'manoObra').value, '1500.00');
  const rep = await L.get('/api/additionals?exposed=1'); assert.equal(rep.total, 1); assert.equal(rep.totals.exposure.value, '1500.00');
  // Rechazado para venta: sigue visible y diferenciado.
  await L.post(`/api/additionals/${a.id}/sale`, { status: 'rechazado_cliente', reason: 'El cliente no aceptó el cargo' });
  d = await L.get(`/api/additionals/${a.id}`);
  assert.deepEqual([d.opStatus, d.costStatus, d.saleStatus, d.exposure], ['validado', 'autorizado', 'rechazado_cliente', '1500.00']);
  // El supervisor no ve importes de costo ni de venta.
  const sv = await sup.get(`/api/additionals/${a.id}`); assert.equal(sv.costAmount, undefined); assert.equal(sv.saleAmount, undefined);
});

test('Recorrido 5: gasto distribuido entre dos obras y administración, pagado una vez con efectivo y banco (criterios 23–26)', async (t) => {
  const env = await startEnv(); t.after(() => env.stop());
  const S = await scenario(env); const L = S.lucia; const aux = await env.as('auxiliar'), tes = await env.as('tesoreria');
  const g = await aux.post('/api/expenses', { supplierId: S.supplier, docDate: '2026-08-25', description: 'Adhesivo para piso, 40 bultos', categoryId: S.cat.Adhesivo, voucherTypeId: S.voucher.Factura, subtotal: '10000', tax: '1600', total: '11600', reference: 'A-123' });
  // La distribución debe conciliar exactamente.
  assert.equal((await aux.try('PUT', `/api/expenses/${g.id}/allocations`, { allocations: [{ target: 'obra', workId: S.work, amount: '5000' }, { target: 'obra', workId: S.work2, amount: '5000' }] })).status, 422);
  await aux.put(`/api/expenses/${g.id}/allocations`, { allocations: [{ target: 'obra', workId: S.work, method: 'porcentaje', pct: '33.3333' }, { target: 'obra', workId: S.work2, method: 'porcentaje', pct: '33.3333' }, { target: 'administracion', method: 'porcentaje', pct: '33.3334' }] });
  let e = await aux.get(`/api/expenses/${g.id}`);
  assert.equal(e.allocated, '11600.00'); assert.deepEqual(e.allocations.map((a) => a.amount), ['3866.66', '3866.66', '3866.68']); assert.equal(e.allocations[0].method, 'porcentaje');
  assert.equal((await aux.try('POST', `/api/expenses/${g.id}/status`, { status: 'autorizado' })).status, 404); // la auxiliar captura; no autoriza
  const au = await L.post(`/api/expenses/${g.id}/status`, { status: 'autorizado' });
  // Posible duplicado: alerta, no eliminación.
  const dup = await aux.post('/api/expenses', { supplierId: S.supplier, docDate: '2026-08-25', description: 'Adhesivo (recaptura)', total: '11600', reference: 'A-123' });
  assert.equal(dup.warnings[0].type, 'posible_duplicado'); assert.equal((await aux.get('/api/expenses')).total, 2);
  await aux.post(`/api/expenses/${dup.id}/status`, { status: 'cancelado', reason: 'Recaptura del mismo comprobante' });

  // Un gasto, dos desembolsos (efectivo y banco): el costo no se duplica.
  const p1 = await tes.post('/api/disbursements', { date: '2026-08-26', accountId: S.cash, methodId: S.method.efectivo, amount: '1600', applications: [{ obligationId: au.obligationId, amount: '1600' }] });
  const p2 = await tes.post('/api/disbursements', { date: '2026-08-27', accountId: S.bank, methodId: S.method.transferencia, amount: '10000', reference: 'SPEI-9', applications: [{ obligationId: au.obligationId, amount: '10000' }] });
  const rec = await tes.upload('recibo.jpg', TINY_JPG, { kind: 'comprobante' });
  for (const p of [p1, p2]) { await L.post(`/api/disbursements/${p.id}/authorize`, {}); await tes.post(`/api/disbursements/${p.id}/confirm`, { receiptAttachmentId: rec.id }); }
  e = await L.get(`/api/expenses/${g.id}`);
  assert.equal(e.payStatus, 'pagado'); assert.equal(e.payments.length, 2);
  const costs = await L.get('/api/reports/costos');
  assert.equal(costs.totals.amount.value, '7733.32'); // 3,866.66 por obra; administración aparte; sin duplicar por los dos pagos
  assert.equal((await L.get('/api/expenses')).totals.total.value, '23200.00'); // el cancelado sigue visible en el listado

  // Criterio 24: un traspaso entre cuentas propias no altera ingresos ni gastos.
  const r0 = await L.get('/api/results?from=2026-01-01&to=2026-12-31');
  await tes.post('/api/cash/transfers', { fromAccountId: S.bank, toAccountId: S.cash, date: '2026-08-28', amount: '50000' });
  const r1 = await L.get('/api/results?from=2026-01-01&to=2026-12-31');
  assert.equal(r1.cashFlow.classes.operacion.net, r0.cashFlow.classes.operacion.net); assert.equal(r1.cashFlow.classes.transferencia.net, '0.00');
  assert.deepEqual(r1.result.lines.map((l) => l.value), r0.result.lines.map((l) => l.value));
  assert.equal(r1.result.lines.at(-1).value, null); assert.equal(r1.result.partial, true); // el resultado final no se inventa

  // Criterio 26: caja chica. Entregar y reponer no generan gasto; el gasto nace de la comprobación.
  const fund = await L.post('/api/petty-funds', { name: 'Obra de prueba', responsibleId: S.supervisorId, authorizedAmount: '5000', date: '2026-08-01' });
  await tes.post(`/api/petty-funds/${fund.id}/movements`, { kind: 'entrega', date: '2026-08-20', amount: '5000', accountId: S.cash });
  const before = (await L.get('/api/expenses')).totals.total.value;
  const pe = await aux.post('/api/expenses', { supplierId: S.supplier, docDate: '2026-08-22', description: 'Discos de corte', categoryId: S.cat['Otros insumos'], total: '800', pettyFundId: fund.id, allocations: [{ target: 'obra', workId: S.work, amount: '800' }] });
  await L.post(`/api/expenses/${pe.id}/status`, { status: 'autorizado' });
  await aux.post(`/api/petty-funds/${fund.id}/movements`, { kind: 'comprobacion', date: '2026-08-23', expenseId: pe.id });
  assert.equal((await aux.try('POST', `/api/petty-funds/${fund.id}/movements`, { kind: 'comprobacion', date: '2026-08-23', expenseId: pe.id })).status, 409);
  await tes.post(`/api/petty-funds/${fund.id}/movements`, { kind: 'reposicion', date: '2026-08-29', amount: '800', accountId: S.cash });
  const f = (await L.get('/api/petty-funds')).items[0];
  assert.deepEqual([f.balance, f.delivered, f.verified, f.replenished, f.toReplenish], ['5000.00', '5000.00', '800.00', '800.00', '0.00']);
  assert.equal((await L.get('/api/expenses')).totals.total.value, '24000.00'); assert.equal(before, '23200.00'); // solo +800: ni la entrega ni la reposición son gasto

  // Criterio 27: material recibido para stock no se considera consumido en una obra.
  const sup = (await L.post('/api/catalog/supplies', { name: 'Adhesivo gris (prueba)', unitId: S.unit.bulto })).id;
  await aux.post('/api/supplies/movements', { supplyId: sup, kind: 'recepcion', date: '2026-08-25', qty: '40', expenseId: g.id });
  let st = (await aux.get('/api/supplies/stock')).items[0];
  assert.deepEqual([st.inStore, st.atWorks, st.consumed], ['40.0000', '0.0000', '0.0000']);
  const ratio = await aux.get(`/api/supplies/ratio?supplyId=${sup}&workId=${S.work}&conceptIds=${S.piso}&from=2026-08-01&to=2026-08-31`);
  assert.equal(ratio.ratio, null); assert.equal(ratio.reliable, false); // criterio 28: no calculable, nunca cero ni #DIV/0
  await aux.post('/api/supplies/movements', { supplyId: sup, kind: 'entrega_obra', date: '2026-08-26', qty: '10', workId: S.work });
  st = (await aux.get('/api/supplies/stock')).items[0];
  assert.deepEqual([st.inStore, st.atWorks, st.consumed], ['30.0000', '10.0000', '0.0000']);
});

test('Conciliación bancaria por CSV: sugerir no confirma; reimportar no duplica', async (t) => {
  const env = await startEnv(); t.after(() => env.stop());
  const S = await scenario(env); const L = S.lucia; const tes = await env.as('tesoreria');
  await tes.post('/api/cash/movements', { type: 'comision', accountId: S.bank, date: '2026-08-03', amount: '58', reference: 'COM-1' });
  const csv = 'Fecha,Referencia,Descripción,Cargo,Abono\r\n03/08/2026,COM-1,Comisión,58.00,\r\n04/08/2026,X-9,Depósito no identificado,,"1,250.00"\r\n';
  const b = await tes.post('/api/recon/batches', { accountId: S.bank, fileName: 'estado-prueba.csv', csv, cutoffDate: '2026-08-31' });
  assert.equal(b.lines, 2);
  assert.equal((await tes.post('/api/recon/batches', { accountId: S.bank, fileName: 'estado-prueba.csv', csv })).already, true);
  assert.equal((await tes.post(`/api/recon/batches/${b.id}/suggest`, {})).suggested, 1);
  let d = await tes.get(`/api/recon/batches/${b.id}`);
  assert.equal(d.lines[0].links[0].status, 'sugerido'); assert.equal(d.lines[0].status, 'sin_conciliar'); assert.equal(d.summary.linesPending, 2);
  await tes.post('/api/recon/links', { linkId: d.lines[0].links[0].id, decision: 'aceptar' });
  d = await tes.get(`/api/recon/batches/${b.id}`);
  assert.equal(d.lines[0].status, 'conciliada'); assert.equal(d.summary.linesPending, 1); assert.equal(d.summary.pendingBankAmount, '1250.00');
  // Un ajuste de saldo exige motivo, categoría y autorización; tesorería no lo autoriza.
  assert.equal((await tes.try('POST', '/api/cash/movements', { type: 'ajuste', accountId: S.bank, date: '2026-08-31', amount: '1250' })).status, 403);
  assert.equal((await L.try('POST', '/api/cash/movements', { type: 'ajuste', accountId: S.bank, date: '2026-08-31', amount: '1250' })).status, 422);
});
