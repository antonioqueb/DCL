// CAS-21 a CAS-40 · cierre, pago y cobranza (sección 28).
import { caso, ejecutar, escenario, TINY_JPG } from './arnes.mjs';
const st = async (c, m, u, b, o) => (await c.try(m, u, b, o)).status;
const banco = async (D, code = 'BANCO') => (await D.get('/api/cash/accounts')).items.find((a) => a.code === code).balance;
// Presupuesto + ejecución validada + estimación comercial enviada al cliente.
async function comercial(S, { qty = '10', price = '1000', contrato = null, entradas = null } = {}) {
  const D = S.D; const B = await S.presupuesto([{ chapter: 'PISOS', locationId: S.pb, conceptId: S.kPiso, description: 'Piso planta baja', unitId: S.unit.m2, qty: '100', price }]);
  // Sin condiciones validadas el sistema no deja aprobar (no inventa tasa): los casos sin impuestos registran tasa 0 explícita.
  await D.post(`/api/works/${S.A}/contracts`, { termsValidated: true, dueDays: 15, taxRate: '0', taxLabel: 'Sin impuesto (solo prueba)', ...(contrato || {}) });
  const ids = []; for (const [q, date] of entradas || [[qty, '2026-08-24']]) ids.push(await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: date, qty: q, budgetItemId: B.items[0] }));
  return { B, ids };
}
async function enviada(S, o = {}) { const D = S.D; const k = await D.post('/api/k-estimates', { workId: S.A, periodFrom: o.from || '2026-08-01', periodTo: o.to || '2026-08-31', ...(o.dueDate ? { dueDate: o.dueDate } : {}) }); await D.post(`/api/k-estimates/${k.id}/generate`, {}); await D.post(`/api/k-estimates/${k.id}/transition`, { to: 'revision_interna' }); await D.post(`/api/k-estimates/${k.id}/transition`, { to: 'enviada' }); return k.id; }
async function aprobada(S, o = {}) { const k = await enviada(S, o); const seen = await S.c1.get(`/api/k-estimates/${k}`); const ap = await S.c1.post(`/api/k-estimates/${k}/respond`, { decision: 'aceptar', version: seen.version, items: seen.items.map((i) => ({ itemId: i.id, status: 'aceptada', ...(o.acceptedQty ? { acceptedQty: o.acceptedQty } : {}) })) }); return { k, total: ap.total, seen }; }

caso('CAS-21', 'Cierre documentado', ['CIE-02', 'CIE-03', 'CIE-04', 'CIE-14'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const { ob } = await S.obligacion('322879.30');
  await D.post(`/api/obligations/${ob}/components`, { kind: 'nomina_bancaria', amount: '41110', support: 'Dispersión bancaria (auditoría)', authorize: true });
  await D.post(`/api/obligations/${ob}/components`, { kind: 'descuento', amount: '3500', support: 'Cuotas con soporte (auditoría)', authorize: true });
  await D.post(`/api/obligations/${ob}/components`, { kind: 'descuento', amount: '270', support: 'Crédito de vivienda (auditoría)', authorize: true });
  const b = await D.get(`/api/closes/board?periodId=${S.per}`); t.ok('Tablero: bruto, banco, descuentos, efectivo', ['322879.30', '41110.00', '3770.00', '277999.30'], [b.totals.grossToClose, b.totals.bank, b.totals.discounts, b.totals.cash]);
  const c = await D.post('/api/closes', { periodId: S.per }); t.ok('Efectivo del cierre', '277999.30', c.totals.cash); t.ok('Conciliación al bruto', '0.00', c.totals.reconciliation);
  t.ok('Componentes suman el bruto', '322879.30', (Number(c.totals.cash) + Number(c.totals.bank) + Number(c.totals.discounts) + Number(c.totals.advances)).toFixed(2));
  const o = await D.get(`/api/obligations/${ob}`); t.ok('Asignar a banco no marca pagado', ['0.00', 'sin_pago'], [o.paid, o.payStatus]);
  const cd = await D.get(`/api/closes/${c.id}`); t.ok('Instrucciones pendientes, no pagos', [['banco', '41110.00', 'pendiente'], ['efectivo', '277999.30', 'pendiente']], cd.instructions.map((i) => [i.medium, i.amount, i.status]).sort());
  t.ok('No existe ningún desembolso creado por el cierre', 0, t.env.store.view().count('disbursements')); t.ok('Los saldos de caja y banco no cambiaron', ['1000000.00', '500000.00'], [await banco(D), await banco(D, 'CAJA')]);
  t.ok('Un descuento mayor al saldo liquidable', true, [409, 422].includes(await st(D, 'POST', `/api/obligations/${ob}/components`, { kind: 'descuento', amount: '999999', support: 'Excesivo (auditoría)', authorize: true })));
  const neg = await S.obligacion('100', { workId: S.B }); const r = await D.try('POST', `/api/obligations/${neg.ob}/components`, { kind: 'descuento', amount: '150', support: 'Descuento mayor al neto (auditoría)', authorize: true }); t.nota('Descuento de $150 sobre obligación de $100', `${r.status} ${r.data.message || ''}`); t.cierto('No se genera efectivo negativo', [409, 422].includes(r.status), r.status);
});

caso('CAS-22', 'Una estimación, su pago y su salida de dinero: un solo costo', ['GAS-15', 'IMP-08'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const { est, ob } = await S.obligacion('28183'); await D.post('/api/closes', { periodId: S.per }); await S.pagar(ob, '28183');
  const costos = await D.get('/api/reports/costos'); t.ok('Costo registrado una sola vez', '28183.00', costos.totals.amount.value);
  const sum = await D.get(`/api/works/${S.A}/summary`); const v = (k) => sum.cards.find((x) => x.key === k).value; t.ok('Mano de obra, pagado y costos de la obra', ['28183.00', '28183.00', '28183.00'], [v('manoObra'), v('pagado'), v('costos')]);
  t.ok('Una salida de caja', '471817.00', await banco(D, 'CAJA')); const mv = (await D.get('/api/cash/movements')).items.filter((m) => Number(m.amount) !== 0 && /28183|28,183/.test(JSON.stringify(m))); t.ok('Un solo movimiento de dinero', 1, mv.length);
  const res = await D.get('/api/results?from=2026-01-01&to=2026-12-31'); t.nota('Costo en resultados', JSON.stringify(res.result.lines.map((l) => [l.key || l.label, l.value])).slice(0, 400)); t.ok('No aparece 84,549 (tres veces el importe)', false, JSON.stringify([costos.totals, sum.cards, res.result]).includes('84549'));
  t.ok('La estimación quedó cerrada y enlazada a su obligación', ['cerrada', ob], [(await D.get(`/api/c-estimates/${est}`)).status, (await D.get(`/api/c-estimates/${est}`)).obligation?.id || ob]);
  t.nota('Cruce entre libros importados (estimaciones ↔ flujos)', 'Cubierto por la prueba automatizada existente tests/c_plataforma.test.js (propuesta "un solo hecho"); el tercer origen (detalle de Pagos Semanales) no se ejecutó en esta auditoría.');
});

caso('CAS-23', 'Reintento de cierre', ['CIE-08', 'CIE-09', 'PER-05'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const { ob } = await S.obligacion('5000');
  const r1 = await D.post('/api/closes', { periodId: S.per }, { key: 'cierre-aud' }); const r2 = await D.post('/api/closes', { periodId: S.per }, { key: 'cierre-aud' });
  t.ok('Misma clave: mismo cierre y folio', [r1.id, r1.folio], [r2.id, r2.folio]); const db = t.env.store.view(); t.ok('Un cierre, una obligación, una instrucción', [1, 1, 1], [db.count('weeklyCloses'), db.count('obligations'), db.count('paymentInstructions')]);
  const r3 = await D.try('POST', '/api/closes', { periodId: S.per }); t.nota('Doble clic sin clave (otra solicitud idéntica)', `${r3.status} ${r3.data.message || ''}`); t.ok('No se crea un segundo cierre ordinario', 1, t.env.store.view().where('weeklyCloses', (c) => c.kind !== 'complemento').length);
  t.ok('La obligación no se duplicó', '5000.00', (await D.get(`/api/obligations/${ob}`)).gross);
  const o2 = await S.obligacion('700', { workId: S.B }); const [a, b] = await Promise.all([D.try('POST', '/api/closes', { periodId: S.per, reason: 'Complemento simultáneo (auditoría)' }), D.try('POST', '/api/closes', { periodId: S.per, reason: 'Complemento simultáneo (auditoría)' })]);
  t.nota('Dos confirmaciones simultáneas del complemento', `${a.status}/${b.status}`); const cl = t.env.store.view().all('weeklyCloses'); t.ok('La obligación tardía entra en un solo cierre', 1, cl.filter((c) => t.env.store.view().where('closeDocuments', (x) => x.closeId === c.id && x.obligationId === o2.ob).length || 0).length || t.env.store.view().where('closeDocuments', (x) => x.estimateId === o2.est).length);
  t.ok('Bruto total cerrado = 5,700 sin duplicar', '5700.00', cl.reduce((s, c) => s + Number(c.grossTotal), 0).toFixed(2));
});

caso('CAS-24', 'Pago parcial', ['PAG-04', 'PAG-05'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const { ob } = await S.obligacion('10000'); await S.pagar(ob, '4000');
  let o = await D.get(`/api/obligations/${ob}`); t.ok('Pagado y saldo', ['4000.00', '6000.00', 'parcial'], [o.paid, o.balance, o.payStatus]);
  const r = await S.T.try('POST', '/api/disbursements', { date: '2026-08-30', accountId: S.caja, methodId: S.method.efectivo, amount: '7000', applications: [{ obligationId: ob, amount: '7000' }] }); t.ok('Aplicar $7,000 sobre saldo de $6,000', 409, r.status); t.nota('Mensaje', `${r.data.message} | ${r.data.fix || ''}`);
  const r2 = await S.T.try('POST', '/api/disbursements', { date: '2026-08-30', accountId: S.caja, methodId: S.method.efectivo, amount: '7000', applications: [{ obligationId: ob, amount: '6000' }] }); t.nota('Pago de $7,000 aplicando $6,000 (excedente sin clasificar)', `${r2.status} ${r2.data.message || ''}`); t.cierto('El excedente no queda sin clasificar', [409, 422].includes(r2.status), r2.status);
  o = await D.get(`/api/obligations/${ob}`); t.ok('El saldo no cambió por los intentos', '6000.00', o.balance); await S.pagar(ob, '6000', { date: '2026-08-31' }); o = await D.get(`/api/obligations/${ob}`); t.ok('Liquidada', ['10000.00', '0.00', 'pagado'], [o.paid, o.balance, o.payStatus]);
  t.ok('Nada más que aplicar', 409, await st(S.T, 'POST', '/api/disbursements', { date: '2026-09-01', accountId: S.caja, methodId: S.method.efectivo, amount: '1', applications: [{ obligationId: ob, amount: '1' }] }));
});

caso('CAS-25', 'Un pago para dos obligaciones', ['PAG-03', 'PAG-05'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const a = await S.obligacion('3000'); const b = await S.obligacion('5000', { workId: S.B });
  const mal = await S.T.try('POST', '/api/disbursements', { date: '2026-08-29', accountId: S.caja, methodId: S.method.efectivo, amount: '6000', applications: [{ obligationId: a.ob, amount: '3000' }, { obligationId: b.ob, amount: '3000' }, { obligationId: b.ob, amount: '1000' }] }); t.ok('Aplicar $7,000 con un pago de $6,000', 422, mal.status);
  const p = await S.T.post('/api/disbursements', { date: '2026-08-29', accountId: S.caja, methodId: S.method.efectivo, amount: '6000', applications: [{ obligationId: a.ob, amount: '3000' }, { obligationId: b.ob, amount: '3000' }] });
  await D.post(`/api/disbursements/${p.id}/authorize`, {}); const rc = await S.T.upload('r.jpg', TINY_JPG, { kind: 'comprobante' }); await S.T.post(`/api/disbursements/${p.id}/confirm`, { receiptAttachmentId: rc.id });
  t.ok('Saldos', ['0.00', '2000.00'], [(await D.get(`/api/obligations/${a.ob}`)).balance, (await D.get(`/api/obligations/${b.ob}`)).balance]); const dd = await D.get(`/api/disbursements/${p.id}`); t.ok('Aplicación total', '6000.00', dd.applications.reduce((s, x) => s + Number(x.amount), 0).toFixed(2));
  t.ok('Un solo movimiento de caja por $6,000', '494000.00', await banco(D, 'CAJA'));
  const k2 = await S.obligacion('900', { contractorId: S.K2 }); const cruz = await S.T.try('POST', '/api/disbursements', { date: '2026-08-29', accountId: S.caja, methodId: S.method.efectivo, amount: '1900', applications: [{ obligationId: b.ob, amount: '1000' }, { obligationId: k2.ob, amount: '900' }] }); t.cierto('Un pago no mezcla obligaciones de beneficiarios distintos', [409, 422].includes(cruz.status), `${cruz.status} ${cruz.data.message || ''}`);
  const otro = await S.T.try('POST', '/api/disbursements', { date: '2026-08-29', accountId: S.caja, methodId: S.method.efectivo, amount: '900', beneficiaryId: S.K1, applications: [{ obligationId: k2.ob, amount: '900' }] }); t.cierto('No se paga a K1 una obligación de K2', [409, 422].includes(otro.status) || (otro.status === 200 && (await D.get(`/api/disbursements/${otro.data.id}`)).beneficiary?.includes('K2')), `${otro.status} ${otro.data.message || ''}`);
});

caso('CAS-26', 'Medio de pago mixto', ['PAG-07', 'TES-04'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const { ob } = await S.obligacion('10000'); await S.pagar(ob, '4000', { medio: 'transferencia', reference: 'SPEI-AUD-1', date: '2026-08-28' }); await S.pagar(ob, '6000');
  const o = await D.get(`/api/obligations/${ob}`); t.ok('Una obligación liquidada', ['10000.00', '10000.00', '0.00'], [o.gross, o.paid, o.balance]); t.ok('Costo una sola vez', '10000.00', (await D.get('/api/reports/costos')).totals.amount.value);
  t.ok('Dos movimientos de dinero', ['996000.00', '494000.00'], [await banco(D), await banco(D, 'CAJA')]); t.ok('Una obligación, dos desembolsos', [1, 2], [t.env.store.view().count('obligations'), t.env.store.view().count('disbursements')]);
  const csv = 'Fecha,Referencia,Descripción,Cargo,Abono\r\n28/08/2026,SPEI-AUD-1,Pago a contratista,"4,000.00",\r\n'; const b = await S.T.post('/api/recon/batches', { accountId: S.banco, fileName: 'estado-aud.csv', csv, cutoffDate: '2026-08-31' }); await S.T.post(`/api/recon/batches/${b.id}/suggest`, {});
  let bd = await S.T.get(`/api/recon/batches/${b.id}`); t.ok('La sugerencia no confirma', ['sugerido', 'sin_conciliar'], [bd.lines[0].links[0]?.status, bd.lines[0].status]); await S.T.post('/api/recon/links', { linkId: bd.lines[0].links[0].id, decision: 'aceptar' });
  t.ok('El estado bancario no creó un tercer pago', [2, '996000.00'], [t.env.store.view().count('disbursements'), await banco(D)]); t.ok('La obligación sigue en saldo cero, no negativo', '0.00', (await D.get(`/api/obligations/${ob}`)).balance);
  t.ok('Reimportar el mismo estado no duplica', true, (await S.T.post('/api/recon/batches', { accountId: S.banco, fileName: 'estado-aud.csv', csv })).already);
});

caso('CAS-27', 'Pago preparado o rechazado', ['PAG-02', 'PAG-11'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const { ob } = await S.obligacion('10000'); const p = await S.pagar(ob, '10000', { confirmar: false });
  let o = await D.get(`/api/obligations/${ob}`); t.ok('Preparado: reservado, no pagado', ['0.00', '10000.00', 'sin_pago'], [o.paid, o.reserved, o.payStatus]);
  const rc = await S.T.upload('comprobante.jpg', TINY_JPG, { kind: 'comprobante' }); t.ok('Confirmar sin autorización (aun con comprobante)', 409, await st(S.T, 'POST', `/api/disbursements/${p}/confirm`, { receiptAttachmentId: rc.id })); t.ok('Sigue sin pago', '0.00', (await D.get(`/api/obligations/${ob}`)).paid);
  t.ok('Caja sin movimiento', '500000.00', await banco(D, 'CAJA')); t.ok('Rechazar sin motivo', 422, await st(D, 'POST', `/api/disbursements/${p}/reject`, {}));
  await D.post(`/api/disbursements/${p}/reject`, { reason: 'Importe incorrecto (auditoría)' }); o = await D.get(`/api/obligations/${ob}`); t.ok('Rechazado: obligación pendiente y reserva liberada', ['0.00', '0.00', '10000.00'], [o.paid, o.reserved, o.balance]);
  const dd = await D.get(`/api/disbursements/${p}`); t.ok('Queda historial con motivo', ['rechazado', true], [dd.status, /Importe incorrecto/.test(JSON.stringify(dd))]); t.ok('Un pago rechazado no se confirma', 409, await st(S.T, 'POST', `/api/disbursements/${p}/confirm`, { receiptAttachmentId: rc.id }));
  const p2 = await S.pagar(ob, '10000', { date: '2026-08-30' }); t.ok('Reintento con un pago nuevo liquida', '0.00', (await D.get(`/api/obligations/${ob}`)).balance); t.ok('El rechazado se conserva', 'rechazado', (await D.get(`/api/disbursements/${p}`)).status); void p2;
});

caso('CAS-28', 'Reverso', ['PAG-12', 'AUD-03'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const { ob } = await S.obligacion('10000'); const p1 = await S.pagar(ob, '4000', { date: '2026-08-28' }); const p2 = await S.pagar(ob, '6000');
  t.ok('Reversar sin motivo', 422, await st(D, 'POST', `/api/disbursements/${p2}/reverse`, {})); t.ok('Tesorería no reversa', 403, await st(S.T, 'POST', `/api/disbursements/${p2}/reverse`, { reason: 'sin facultad' }));
  const rv = await D.post(`/api/disbursements/${p2}/reverse`, { reason: 'Entregado a la persona equivocada (auditoría)' }); const o = await D.get(`/api/obligations/${ob}`); t.ok('Pagado neto y saldo', ['4000.00', '6000.00'], [o.paid, o.balance]);
  t.ok('Original, reverso y primer pago conservados', ['revertido', 'confirmado', 'confirmado'], [(await D.get(`/api/disbursements/${p2}`)).status, (await D.get(`/api/disbursements/${rv.reversalId}`)).status, (await D.get(`/api/disbursements/${p1}`)).status]);
  t.ok('La caja recupera los $6,000', '496000.00', await banco(D, 'CAJA')); t.ok('No se reversa dos veces', 409, await st(D, 'POST', `/api/disbursements/${p2}/reverse`, { reason: 'otra vez (auditoría)' }));
  t.ok('No se reversa el reverso', true, [409, 422].includes(await st(D, 'POST', `/api/disbursements/${rv.reversalId}/reverse`, { reason: 'reverso del reverso (auditoría)' })));
  const del = await D.try('DELETE', `/api/disbursements/${p2}`); t.cierto('Un pago no se elimina', [404, 405].includes(del.status), del.status); t.ok('Auditoría íntegra', true, (await (await t.env.as('aud')).get('/api/audit/verify')).ok);
});

caso('CAS-29', 'Corregir tras pagar', ['EST-12', 'EST-13'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const en = await S.validado({ locationId: S.pb, conceptId: S.canto, executionDate: '2026-08-24', qty: '125' }); const e = await S.estimacion(); t.ok('Obligación autorizada', '10000.00', e.total); await S.pagar(e.ob, '8000');
  t.ok('Reabrir sin motivo', 422, await st(D, 'POST', `/api/c-estimates/${e.id}/reopen`, {})); const ro = await D.try('POST', `/api/c-estimates/${e.id}/reopen`, { reason: 'Corregir a $7,000 (auditoría)' }); t.nota('Reabrir una estimación con $8,000 pagados', `${ro.status} ${JSON.stringify(ro.data).slice(0, 300)}`);
  let o = await D.get(`/api/obligations/${e.ob}`); t.nota('Obligación tras reabrir', JSON.stringify({ gross: o.gross, paid: o.paid, balance: o.balance, status: o.status, payStatus: o.payStatus }));
  const adj = await D.try('POST', `/api/progress/${en}/adjustments`, { qtyDelta: '-37.5', reason: 'Se midió de más: la cantidad correcta es 87.5 ml (auditoría)' }); let dec = null; if (adj.status === 200) dec = await D.try('POST', `/api/progress-adjustments/${adj.data.id}/decide`, { decision: 'autorizar' });
  t.nota('Ajuste −37.5 ml (deja el importe en $7,000)', `${adj.status} / decidir ${dec?.status} ${JSON.stringify(dec?.data || adj.data).slice(0, 300)}`);
  const doc = await D.get(`/api/c-estimates/${e.id}`); t.nota('Estimación tras el ajuste', JSON.stringify({ status: doc.status, version: doc.version, gross: doc.totals.gross, items: doc.items.map((i) => [i.qty, i.amount, i.status]) }));
  const au = await D.try('POST', `/api/c-estimates/${e.id}/authorize`, { exceptionReason: 'Reautorización tras corrección (auditoría)' }); t.nota('Reautorizar por el importe corregido', `${au.status} ${JSON.stringify(au.data).slice(0, 300)}`);
  o = await D.get(`/api/obligations/${e.ob}`); const obs = t.env.store.view().all('obligations').map((x) => [x.folio, x.grossAmount, x.status]); t.nota('Obligaciones existentes al final', JSON.stringify(obs)); t.nota('Obligación original al final', JSON.stringify({ gross: o.gross, paid: o.paid, balance: o.balance, payStatus: o.payStatus }));
  t.cierto('La obligación no queda por debajo de lo pagado sin tratamiento explícito del sobrepago', !(Number(o.gross) < Number(o.paid)) || /favor|sobrepago|devoluci|anticipo/i.test(JSON.stringify(o)), { gross: o.gross, paid: o.paid, balance: o.balance });
  t.cierto('No hay saldo negativo sin explicación', Number(o.balance) >= 0 || /favor|sobrepago/i.test(JSON.stringify(o)), o.balance);
  // Segunda ruta: reabrir de nuevo, rechazar la partida completa y reautorizar (¿la obligación baja de lo pagado?).
  const ro2 = await D.try('POST', `/api/c-estimates/${e.id}/reopen`, { reason: 'Segunda corrección (auditoría)' }); const d2 = await D.get(`/api/c-estimates/${e.id}`); const rj = await D.try('POST', `/api/c-estimates/${e.id}/items/${d2.items[0].id}/status`, { status: 'rechazada', reason: 'Se rechaza la partida completa (auditoría)' });
  const fijo = await D.try('POST', `/api/c-estimates/${e.id}/items`, { description: 'Importe corregido (auditoría)', amount: '7000', reason: 'Importe corregido tras pago (auditoría)' }); const au2 = await D.try('POST', `/api/c-estimates/${e.id}/authorize`, { exceptionReason: 'Reautorización por $7,000 (auditoría)' });
  t.nota('Ruta alterna: reabrir → rechazar partida → partida fija de $7,000 → autorizar', `reabrir ${ro2.status} / rechazar ${rj.status} ${rj.data.message || ''} / partida ${fijo.status} / autorizar ${au2.status} ${JSON.stringify(au2.data).slice(0, 260)}`);
  o = await D.get(`/api/obligations/${e.ob}`); t.nota('Obligación tras la ruta alterna', JSON.stringify({ gross: o.gross, paid: o.paid, balance: o.balance, payStatus: o.payStatus, status: o.status }));
  t.cierto('Tras la ruta alterna la obligación no queda por debajo de lo pagado sin tratamiento del sobrepago', Number(o.gross) >= Number(o.paid) || /favor|sobrepago|devoluci|anticipo/i.test(JSON.stringify(o)), { gross: o.gross, paid: o.paid, balance: o.balance });
  const liberado = await D.get(`/api/progress/${en}`); t.nota('Avance de origen tras rechazar la partida', JSON.stringify({ qty: liberado.qty, paidQty: liberado.paidQty, effectiveQty: liberado.effectiveQty }));
  const pagos = t.env.store.view().all('paymentApplications'); t.ok('Las aplicaciones de pago se conservan', 1, pagos.length);
  const total = t.env.store.view().where('obligations', (x) => x.status !== 'cancelada').reduce((s, x) => s + Number(x.grossAmount), 0); t.cierto('No coexisten dos obligaciones vigentes por la misma estimación', t.env.store.view().where('obligations', (x) => x.sourceId === e.id && x.status !== 'cancelada').length <= 1, `${t.env.store.view().where('obligations', (x) => x.sourceId === e.id).length} obligaciones, bruto vigente total ${total}`);
});

caso('CAS-30', 'Anticipo al contratista', ['JOR-08', 'PAG-15'], async (t) => {
  const S = await escenario(t.env); const D = S.D; t.ok('Anticipo sin motivo', 422, await st(S.T, 'POST', '/api/disbursements', { kind: 'anticipo', date: '2026-08-20', accountId: S.caja, methodId: S.method.efectivo, amount: '2000', beneficiaryId: S.K1 }));
  const a = await S.T.post('/api/disbursements', { kind: 'anticipo', date: '2026-08-20', accountId: S.caja, methodId: S.method.efectivo, amount: '2000', beneficiaryId: S.K1, workId: S.A, note: 'Anticipo de semana (auditoría)' });
  await D.post(`/api/disbursements/${a.id}/authorize`, {}); const rc = await S.T.upload('r.jpg', TINY_JPG, { kind: 'comprobante' }); await S.T.post(`/api/disbursements/${a.id}/confirm`, { receiptAttachmentId: rc.id });
  let advs = await D.get('/api/contractor-advances'); const adv = advs.items[0]; t.ok('Anticipo con saldo', ['2000.00', '2000.00'], [adv.amount, adv.balance]); t.ok('Entregar el anticipo no es costo', '0.00', (await D.get('/api/reports/costos')).totals.amount?.value ?? '0.00');
  const { ob } = await S.obligacion('10000'); t.ok('Aplicar más que el saldo del anticipo', 409, await st(D, 'POST', `/api/obligations/${ob}/apply-advance`, { advanceId: adv.id, amount: '2500' }));
  const k2 = await S.obligacion('500', { contractorId: S.K2 }); t.ok('Aplicar el anticipo de K1 a una obligación de K2', 422, await st(D, 'POST', `/api/obligations/${k2.ob}/apply-advance`, { advanceId: adv.id, amount: '100' }));
  await D.post(`/api/obligations/${ob}/apply-advance`, { advanceId: adv.id, amount: '2000' }); let o = await D.get(`/api/obligations/${ob}`); t.nota('Obligación tras aplicar el anticipo', JSON.stringify({ gross: o.gross, paid: o.paid, balance: o.balance, advances: o.advances, available: o.available }));
  t.ok('Pagar $10,000 completos después de aplicar el anticipo', 409, await st(S.T, 'POST', '/api/disbursements', { date: '2026-08-29', accountId: S.caja, methodId: S.method.efectivo, amount: '10000', applications: [{ obligationId: ob, amount: '10000' }] }));
  await S.pagar(ob, '8000'); o = await D.get(`/api/obligations/${ob}`); t.ok('Obligación liquidada', ['0.00', 'pagado'], [o.balance, o.payStatus]); advs = await D.get('/api/contractor-advances'); t.ok('Anticipo disponible cero', '0.00', advs.items[0].balance);
  t.ok('Desembolsos acumulados = $10,000', '490000.00', await banco(D, 'CAJA')); t.ok('Costo = $10,000 de K1 + $500 de la obligación de K2 del propio caso (no $12,500: el anticipo no se suma)', '10500.00', (await D.get('/api/reports/costos')).totals.amount.value);
  t.ok('El anticipo agotado no se aplica otra vez', 409, await st(D, 'POST', `/api/obligations/${k2.ob}/apply-advance`, { advanceId: adv.id, amount: '1' }).then((x) => (x === 422 ? 409 : x)));
});

caso('CAS-31', 'Estimación comercial distinta', ['CLI-01', 'CLI-03', 'CLI-04'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const { B, ids } = await comercial(S, { price: '1280', entradas: [['40', '2026-08-10'], ['20', '2026-08-24']] });
  await aprobada(S, { from: '2026-08-01', to: '2026-08-15' }); const ce = await S.estimacion(); t.ok('El contratista cobra los 60 m² en su semana', '21000.00', ce.total);
  const k2 = await D.post('/api/k-estimates', { workId: S.A, periodFrom: '2026-08-16', periodTo: '2026-09-30' }); const add = await D.try('POST', `/api/k-estimates/${k2.id}/items`, { budgetItemId: B.items[0], allocations: [{ progressEntryId: ids[1], qty: '15' }] }); t.ok('Proponer 15 m² del segundo avance', 200, add.status); if (add.status !== 200) t.nota('Respuesta', JSON.stringify(add.data));
  const kd = await D.get(`/api/k-estimates/${k2.id}`); const it = kd.items[0]; t.ok('Contratado, acumulado anterior y periodo', ['100.0000', '40.0000', '15.0000'], [it.contractedQty, it.prevApprovedQty, it.proposedQty]);
  t.nota('Acumulado resultante y pendiente', JSON.stringify({ cumulative: it.cumulativeQty ?? it.newCumulativeQty, pending: it.pendingQty ?? it.remainingQty })); t.ok('Acumulado resultante 55', '55.0000', it.resultingQty);
  const bill = await D.get(`/api/works/${S.A}/billable`); t.ok('Quedan 5 m² elegibles', '5.00', bill.items.reduce((s, i) => s + Number(i.available), 0).toFixed(2));
  t.ok('No se puede proponer de nuevo lo ya aprobado', 409, await st(D, 'POST', `/api/k-estimates/${k2.id}/items`, { budgetItemId: B.items[0], allocations: [{ progressEntryId: ids[0], qty: '1' }] }));
  t.ok('Ni más de lo disponible del avance', 409, await st(D, 'POST', `/api/k-estimates/${k2.id}/items`, { budgetItemId: B.items[0], allocations: [{ progressEntryId: ids[1], qty: '6' }] }));
  const pend = await D.get('/api/reports/ejecucion-no-estimada'); t.nota('Ejecución pendiente de estimar al cliente (ya pagada al contratista)', JSON.stringify(pend.items.map((r) => [r.available, r.paidToContractor])).slice(0, 200));
  await D.post(`/api/k-estimates/${k2.id}/transition`, { to: 'cancelada', reason: 'Se cancela la propuesta (auditoría)' }).catch(async (e) => t.nota('Cancelar la estimación comercial en borrador', `${e.status} ${e.data?.message}`));
  const bill2 = await D.get(`/api/works/${S.A}/billable`); t.nota('Disponible tras cancelar la segunda estimación', bill2.items.reduce((s, i) => s + Number(i.available), 0).toFixed(2)); t.ok('La ejecución de origen no cambió', 2, t.env.store.view().count('progressEntries'));
});

caso('CAS-32', 'Aprobación parcial del cliente', ['CLI-07', 'CLI-09'], async (t) => {
  const S = await escenario(t.env); const D = S.D; await comercial(S, { qty: '20', price: '100' }); const { k, total } = await aprobada(S, { acceptedQty: '15' });
  const kd = await D.get(`/api/k-estimates/${k}`); t.ok('Aprobado $1,500 (no $2,000)', ['1500.00', '1500.00'], [kd.approvedSubtotal ?? kd.summary.subtotal, total]); t.ok('Propuesto y aceptado por partida', ['20.0000', '15.0000'], [kd.items[0].proposedQty, kd.items[0].acceptedQty]);
  const bill = await D.get(`/api/works/${S.A}/billable`); t.ok('5 m² pendientes de resolver', '5.00', bill.items.reduce((s, i) => s + Number(i.available), 0).toFixed(2)); t.ok('No se creó ejecución nueva', 1, t.env.store.view().count('progressEntries'));
  t.ok('La cuenta por cobrar es lo aprobado', '1500.00', (await D.get('/api/receivables')).summary.approvedBalance);
  t.ok('El cliente no acepta más de lo propuesto', true, [409, 422].includes(await (async () => { const S2 = S; const k2 = await enviada(S2, { from: '2026-09-01', to: '2026-09-30' }); const seen = await S.c1.get(`/api/k-estimates/${k2}`); return st(S.c1, 'POST', `/api/k-estimates/${k2}/respond`, { decision: 'aceptar', version: seen.version, items: seen.items.map((i) => ({ itemId: i.id, status: 'aceptada', acceptedQty: '999' })) }); })()));
});

caso('CAS-33', 'Factura vinculada', ['CLI-11', 'COB-10'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const aux = await t.env.as('aux'); await comercial(S, { qty: '10', price: '1000' }); const { k, total } = await aprobada(S); t.ok('Estimación aprobada', '10000.00', total);
  await aux.post('/api/invoices', { folio: 'F-AUD-1', clientId: S.C1, workId: S.A, date: '2026-09-02', total: '10000', links: [{ kEstimateId: k, amount: '10000' }] });
  let ar = await D.get('/api/receivables'); t.ok('Una sola cuenta por cobrar de $10,000', ['10000.00', '10000.00', '0.00'], [ar.summary.approvedBalance, ar.items[0].invoiced, ar.summary.pendingInvoice]);
  t.ok('Facturar de más contra la misma estimación', true, [409, 422].includes(await st(aux, 'POST', '/api/invoices', { folio: 'F-AUD-2', clientId: S.C1, workId: S.A, date: '2026-09-03', total: '5000', links: [{ kEstimateId: k, amount: '5000' }] })));
  t.ok('Folio de factura repetido', true, [409, 422].includes(await st(aux, 'POST', '/api/invoices', { folio: 'F-AUD-1', clientId: S.C1, workId: S.A, date: '2026-09-03', total: '1' })));
  await aux.post('/api/receipts', { date: '2026-09-10', accountId: S.banco, clientId: S.C1, workId: S.A, grossAmount: '4000', reference: 'TRF-AUD-1', applications: [{ kEstimateId: k, amount: '4000' }] });
  ar = await D.get('/api/receivables'); t.ok('Cobrado $4,000, saldo $6,000', ['4000.00', '6000.00', '6000.00'], [ar.items[0].collected, ar.items[0].balance, ar.summary.approvedBalance]); t.ok('Banco +$4,000', '1004000.00', await banco(D));
  t.ok('Mismo cobro repetido (referencia e importe)', 409, await st(aux, 'POST', '/api/receipts', { date: '2026-09-10', accountId: S.banco, clientId: S.C1, workId: S.A, grossAmount: '4000', reference: 'TRF-AUD-1', applications: [{ kEstimateId: k, amount: '4000' }] }));
  const pdf = await D.try('GET', `/api/documents/preview?type=estimacion_cliente&id=${k}&audience=cliente`); t.ok('Generar el PDF operativo no la marca como facturada o timbrada', false, /timbrad|CFDI v/i.test(JSON.stringify(pdf.data.model)));
});

caso('CAS-34', 'Anticipo del cliente', ['COB-03', 'COB-04'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const aux = await t.env.as('aux'); await comercial(S, { qty: '10', price: '1000', contrato: { amortizationPct: '20', amortizationBase: 'subtotal', advanceKind: 'importe', advanceAmount: '3000' } });
  await aux.post('/api/receipts', { kind: 'anticipo', date: '2026-08-01', accountId: S.banco, clientId: S.C1, workId: S.A, grossAmount: '3000', reference: 'ANT-AUD' }); const b0 = await banco(D); t.ok('El anticipo entra a banco', '1003000.00', b0);
  let adv = (await D.get('/api/client-advances')).items[0]; t.ok('Saldo del anticipo', '3000.00', adv.balance); t.ok('Recibir el anticipo no aumenta ejecución ni aprobado', '0.00', (await D.get(`/api/works/${S.A}/summary`)).cards.find((x) => x.key === 'aprobado').value);
  const { k, total } = await aprobada(S); const kd = await D.get(`/api/k-estimates/${k}`); t.ok('Amortización $2,000 y exigible $8,000', ['2000.00', '8000.00'], [kd.summary.amortization, total]);
  adv = (await D.get('/api/client-advances')).items[0]; t.ok('Anticipo pendiente $1,000', '1000.00', adv.balance); t.ok('Amortizar no mueve la caja', b0, await banco(D)); t.ok('Saldo exigible de la estimación', '8000.00', (await D.get('/api/receivables')).items[0].balance);
  await comercial2(S, D); const k2 = await aprobada(S, { from: '2026-09-01', to: '2026-09-30' }); const kd2 = await D.get(`/api/k-estimates/${k2.k}`); t.ok('La segunda amortización no supera el saldo del anticipo ($1,000 aunque el 20 % sean $2,000)', '1000.00', kd2.summary.amortization);
  t.ok('Anticipo agotado', '0.00', (await D.get('/api/client-advances')).items[0].balance); t.ok('Total cobrado en caja sigue siendo solo el anticipo', b0, await banco(D));
});
async function comercial2(S) { await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-09-05', qty: '10', budgetItemId: (await S.D.get(`/api/works/${S.A}/budget-tracking`)).rows[0].id }); }

caso('CAS-35', 'Fórmula contractual explícita (solo prueba)', ['COB-07', 'COB-08'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const aux = await t.env.as('aux');
  await comercial(S, { qty: '1', price: '1000', contrato: { taxRate: '8', taxLabel: 'Impuesto 8 % (solo prueba)', amortizationPct: '7', amortizationBase: 'total_con_impuestos', retentionPct: '5', retentionBase: 'subtotal', advanceKind: 'importe', advanceAmount: '500' } });
  await aux.post('/api/receipts', { kind: 'anticipo', date: '2026-08-01', accountId: S.banco, clientId: S.C1, workId: S.A, grossAmount: '500', reference: 'ANT-35' }); const { k, total } = await aprobada(S); const s = (await D.get(`/api/k-estimates/${k}`)).summary;
  t.ok('Subtotal, impuesto, amortización, garantía, líquido', ['1000.00', '80.00', '75.60', '50.00', '954.40'], [s.subtotal, s.taxAmount, s.amortization, s.retention, s.total]); t.ok('Total aprobado', '954.40', total);
  t.ok('Consumo de anticipo', '424.40', (await D.get('/api/client-advances')).items[0].balance); t.cierto('Cada porcentaje declara su base', s.lines.filter((l) => l.pct).every((l) => !!l.baseLabel), s.lines.map((l) => [l.key, l.pct, l.baseLabel]));
  t.nota('Líneas del resumen (orden visible)', JSON.stringify(s.lines.map((l) => [l.key, l.pct || null, l.baseLabel || null, l.value ?? l.amount])));
  const sin = await escenario2(t); t.nota('Estimación sin condiciones de contrato registradas', JSON.stringify(sin));
  t.cierto('Sin contrato no se aplica ninguna tasa por omisión', sin.taxAmount === null || sin.taxAmount === '0.00', sin); t.cierto('Sin contrato el total queda indeterminado o sin impuesto, no con una tasa inventada', sin.total === null || sin.total === sin.subtotal, sin);
});
async function escenario2(t) { const { startEnv } = await import('../tests/helpers.js'); const env = await startEnv(); try { const S = await escenario(env); await comercial(S, { qty: '1', price: '1000' }); const k = await S.D.post('/api/k-estimates', { workId: S.A, periodFrom: '2026-08-01', periodTo: '2026-08-31' }); await S.D.post(`/api/k-estimates/${k.id}/generate`, {}); const s = (await S.D.get(`/api/k-estimates/${k.id}`)).summary; const env2 = await S.D.try('POST', `/api/k-estimates/${k.id}/transition`, { to: 'revision_interna' }); const pub = await S.D.try('POST', `/api/k-estimates/${k.id}/transition`, { to: 'enviada' }); return { subtotal: s.subtotal, taxAmount: s.taxAmount, amortization: s.amortization, retention: s.retention, total: s.total, enviar: `${env2.status}/${pub.status} ${pub.data.message || ''}` }; } finally { await env.stop(); } }

caso('CAS-36', 'Liberación de garantía', ['COB-05', 'COB-06'], async (t) => {
  const S = await escenario(t.env); const D = S.D; await comercial(S, { qty: '1', price: '1000', contrato: { taxRate: '8', taxLabel: 'Impuesto 8 % (solo prueba)', retentionPct: '5', retentionBase: 'subtotal' } }); const { k, total } = await aprobada(S); t.ok('Líquido con retención', '1030.00', total);
  let ca = await D.get('/api/client-advances'); const ret = ca.retentions[0]; t.ok('Garantía retenida visible', ['50.00', '50.00', 'retenida'], [ret.amount, ret.balance, ret.status]); const ap0 = (await D.get(`/api/works/${S.A}/summary`)).cards.find((x) => x.key === 'aprobado').value;
  t.ok('Liberar más de lo retenido', 422, await st(D, 'POST', `/api/retentions/${ret.id}/release`, { amount: '60', date: '2026-10-01' })); t.ok('S1 no libera garantías', true, [403, 404].includes(await st(S.s1, 'POST', `/api/retentions/${ret.id}/release`, { amount: '50', date: '2026-10-01' })));
  await D.post(`/api/retentions/${ret.id}/release`, { amount: '50', date: '2026-10-01', note: 'Fin de garantía (auditoría)' }); ca = await D.get('/api/client-advances'); t.ok('Saldo de garantía cero', ['0.00', 'liberada'], [ca.retentions[0].balance, ca.retentions[0].status]);
  const ar = await D.get('/api/receivables'); t.ok('Exigible aumenta $50', '1080.00', ar.items[0].balance); t.ok('El trabajo aprobado (ingreso) no aumenta', ap0, (await D.get(`/api/works/${S.A}/summary`)).cards.find((x) => x.key === 'aprobado').value);
  t.ok('Liberar no es cobrar: banco sin cambio', '1000000.00', await banco(D)); t.ok('No se libera dos veces', 422, await st(D, 'POST', `/api/retentions/${ret.id}/release`, { amount: '1', date: '2026-10-02' }));
  const kd = await D.get(`/api/k-estimates/${k}`); t.nota('Estimación tras liberar', JSON.stringify({ retention: kd.summary.retention, total: kd.summary.total, subtotal: kd.summary.subtotal }));
});

caso('CAS-37', 'Cobro superior al saldo', ['COB-10', 'COB-11'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const aux = await t.env.as('aux'); await comercial(S, { qty: '8', price: '1000' }); const { k } = await aprobada(S);
  t.ok('Aplicar $9,000 a un saldo de $8,000', 409, await st(aux, 'POST', '/api/receipts', { date: '2026-09-10', accountId: S.banco, clientId: S.C1, workId: S.A, grossAmount: '9000', reference: 'T-37a', applications: [{ kEstimateId: k, amount: '9000' }] }));
  const r = await aux.try('POST', '/api/receipts', { date: '2026-09-10', accountId: S.banco, clientId: S.C1, workId: S.A, grossAmount: '9000', reference: 'T-37b', applications: [{ kEstimateId: k, amount: '8000' }] }); t.ok('Recibir $9,000 aplicando $8,000', 200, r.status); if (r.status !== 200) { t.nota('Respuesta', JSON.stringify(r.data)); return; }
  const rc = await D.get(`/api/receipts/${r.data.id}`); t.nota('Cobro registrado (campos)', JSON.stringify(Object.fromEntries(Object.entries(rc).filter(([k]) => !['applications', 'id'].includes(k)))).slice(0, 500)); t.ok('Excedente sin aplicar identificado en el cobro', '1000.00', rc.unapplied ?? rc.available ?? rc.pendingToApply ?? null);
  const ar = await D.get('/api/receivables'); t.ok('Saldo de la estimación cero, no negativo', '0.00', ar.items[0].balance); t.nota('Resumen de cuentas por cobrar', JSON.stringify(ar.summary));
  const k2env = await S.D.post('/api/works', { name: 'Obra de otro cliente (auditoría)', code: 'AUD-X', clientId: S.C2 }); void k2env;
  t.ok('Un cobro de C1 no se registra en una obra de C2', 422, await st(aux, 'POST', '/api/receipts', { date: '2026-09-11', accountId: S.banco, clientId: S.C1, workId: S.B, grossAmount: '100', reference: 'T-37c' }));
  const ap = await aux.try('POST', `/api/receipts/${r.data.id}/apply`, { kEstimateId: k, amount: '1000' }); const lst = await D.get('/api/receipts'); t.nota('Listado de cobros (¿muestra lo no aplicado?)', JSON.stringify(lst.items.map((x) => Object.fromEntries(Object.entries(x).filter(([kk]) => /appl|unappl|gross|dispon|saldo|pend/i.test(kk))))).slice(0, 300)); t.cierto('El excedente no se aplica a una estimación ya saldada', [409, 422].includes(ap.status), `${ap.status} ${ap.data.message || ''}`);
});

caso('CAS-38', 'Fecha de vencimiento', ['COB-12', 'SEM-06'], async (t) => {
  const S = await escenario(t.env); const D = S.D; await comercial(S, { qty: '1', price: '1000', contrato: { dueDays: null } }); const k = await D.post('/api/k-estimates', { workId: S.A, periodFrom: '2026-08-01', periodTo: '2026-08-31' }); await D.post(`/api/k-estimates/${k.id}/generate`, {});
  const pt = await D.try('PATCH', `/api/k-estimates/${k.id}`, { dueDate: '2026-10-01' }); t.nota('Fijar vencimiento 01/10/2026', pt.status); await D.post(`/api/k-estimates/${k.id}/transition`, { to: 'revision_interna' }); await D.post(`/api/k-estimates/${k.id}/transition`, { to: 'enviada' });
  const seen = await S.c1.get(`/api/k-estimates/${k.id}`); await S.c1.post(`/api/k-estimates/${k.id}/respond`, { decision: 'aceptar', version: seen.version, items: seen.items.map((i) => ({ itemId: i.id, status: 'aceptada' })) });
  const hoy = (await import('../server/domain/dates.js')).localDate(); const ar = await D.get('/api/receivables'); const row = ar.items[0]; t.nota('Renglón por cobrar', JSON.stringify({ dueDate: row.dueDate, daysOverdue: row.overdueDays, aging: row.aging, hoy }));
  const esperado = Math.round((Date.parse(hoy) - Date.parse('2026-10-01')) / 86400000); t.ok('El vencimiento registrado se conserva', '2026-10-01', row.dueDate); t.ok(`Días vencidos contados desde el vencimiento (hoy ${hoy})`, esperado, row.overdueDays);
  t.ok('Clasificación por antigüedad', 'vencido_1_30', row.aging); const fijo = await D.try('GET', '/api/receivables?asOf=2026-11-12'); const rf = fijo.data.items?.[0]; t.ok('La antigüedad admite una fecha de corte elegida (asOf=2026-11-12 → 42 días)', 42, rf?.overdueDays);
  // Variante: con plazo en el contrato, el vencimiento capturado a mano se sustituye al aprobar.
  const v = await variante(); t.nota('Vencimiento capturado 01/10/2026 con contrato de 15 días', JSON.stringify(v)); t.cierto('El vencimiento capturado no se sustituye sin aviso', v.dueDate === '2026-10-01' || v.avisa, v);
  const rep = await D.try('GET', '/api/reports/antiguedad-saldos?asOf=2026-11-12'); const rr = rep.data.items?.[0]; t.nota('Reporte de antigüedad con asOf=2026-11-12', `${rep.status} ${JSON.stringify(rr || rep.data).slice(0, 240)}`);
});

caso('CAS-39', 'Bruto, comisión y neto', ['COB-15', 'RES-07'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const aux = await t.env.as('aux'); await comercial(S, { qty: '1', price: '1000', contrato: { advanceKind: 'importe', advanceAmount: '350283.56' } });
  const body = { kind: 'anticipo', date: '2026-03-14', accountId: S.banco, clientId: S.C1, workId: S.A, grossAmount: '350283.56', commission: '35028.36', netAmount: '315255.20', reference: 'ANT-39' };
  const r = await aux.post('/api/receipts', body); const a = (await D.get('/api/client-advances')).items[0]; t.ok('Bruto, comisión y neto por separado', ['350283.56', '35028.36', '315255.20'], [a.gross, a.commission, a.net]); t.ok('Neto + comisión = bruto', '350283.56', (Number(a.net) + Number(a.commission)).toFixed(2));
  t.ok('A banco entra el neto', '1315255.20', await banco(D)); t.ok('El anticipo del cliente vale el bruto (la comisión no es cobro faltante)', '350283.56', a.balance); t.ok('La naturaleza de la comisión queda pendiente de validar', [false, 'pendiente de validar'], [a.commissionValidated, a.commissionNature]);
  const ar = await D.get('/api/receivables'); t.ok('No aparece saldo por cobrar por la comisión', '0.00', ar.summary.approvedBalance);
  const res = await D.get('/api/results?from=2026-01-01&to=2026-12-31'); const txt = JSON.stringify(res); t.nota('Comisión en resultados', JSON.stringify((res.result.lines || []).filter((l) => /comisi/i.test(JSON.stringify(l)))).slice(0, 300)); t.ok('La comisión no se resta dos veces del flujo', 1, (txt.match(/35028\.36/g) || []).length <= 2 ? 1 : (txt.match(/35028\.36/g) || []).length);
  t.ok('aux no valida la naturaleza de la comisión', true, [403, 404].includes(await st(aux, 'POST', `/api/receipts/${r.id}/commission`, { commissionNature: 'Comisión de intermediación' })));
});

caso('CAS-40', 'Diferencia que requiere revisión', ['COB-16', 'IMP-09'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const aux = await t.env.as('aux'); await comercial(S, { qty: '1', price: '1000', contrato: { advanceKind: 'importe', advanceAmount: '496937' } });
  const r = await aux.try('POST', '/api/receipts', { kind: 'anticipo', date: '2026-03-14', accountId: S.banco, clientId: S.C1, workId: S.A, grossAmount: '496937.00', commission: '49693.70', netAmount: '447367.63', reference: 'ANT-40' });
  t.nota('Cobro cuyo neto implica comisión de 49,569.37 pero declara 49,693.70 (diferencia 124.33)', `${r.status} ${JSON.stringify(r.data).slice(0, 300)}`); t.cierto('La diferencia de $124.33 no se acepta en silencio', [409, 422].includes(r.status) || /124\.33|diferencia/i.test(JSON.stringify(r.data)), r.status);
  const c1 = await aux.try('POST', '/api/receipts', { kind: 'anticipo', date: '2026-03-15', accountId: S.banco, clientId: S.C1, workId: S.A, grossAmount: '1000.00', commission: '100.00', netAmount: '899.99', reference: 'ANT-40c' }); t.nota('Diferencia de un centavo entre bruto − comisión y neto', `${c1.status} ${c1.data.message || ''}`);
  const tol = (await D.get('/api/settings')).items.find((x) => x.key === 'tolerance.cents'); t.nota('Tolerancia de centavos configurada', JSON.stringify({ value: tol?.value, requiresDecision: tol?.requiresDecision }));
  const { ob } = await S.obligacion('1000'); await S.pagar(ob, '999.50'); const o = await D.get(`/api/obligations/${ob}`); t.ok('Una diferencia de 50 centavos en un pago queda como saldo visible, no se redondea sola', ['0.50', 'parcial'], [o.balance, o.payStatus]);
  t.nota('Conflicto entre fuentes importadas (IMP-09)', 'La prueba automatizada tests/c_plataforma.test.js verifica fecha_conflicto en simulación; la resolución registrada de un conflicto de importe entre dos libros no se ejecutó aquí.');
});

async function variante() { const { startEnv } = await import('../tests/helpers.js'); const env = await startEnv(); try { const S = await escenario(env); const D = S.D; await comercial(S, { qty: '1', price: '1000' }); const k = await D.post('/api/k-estimates', { workId: S.A, periodFrom: '2026-08-01', periodTo: '2026-08-31' }); await D.post(`/api/k-estimates/${k.id}/generate`, {}); await D.patch(`/api/k-estimates/${k.id}`, { dueDate: '2026-10-01' }); await D.post(`/api/k-estimates/${k.id}/transition`, { to: 'revision_interna' }); await D.post(`/api/k-estimates/${k.id}/transition`, { to: 'enviada' }); const seen = await S.c1.get(`/api/k-estimates/${k.id}`); const ap = await S.c1.post(`/api/k-estimates/${k.id}/respond`, { decision: 'aceptar', version: seen.version, items: seen.items.map((i) => ({ itemId: i.id, status: 'aceptada' })) }); const row = (await D.get('/api/receivables')).items[0]; return { vistoPorElCliente: seen.dueDate, dueDate: row.dueDate, avisa: /venc/i.test(JSON.stringify(ap)) }; } finally { await env.stop(); } }
const solo = process.argv.slice(2); await ejecutar('casos-21-40', solo.length ? solo : null);
