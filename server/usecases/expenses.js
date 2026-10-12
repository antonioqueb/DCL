// Gastos y documentos de proveedor: se capturan una vez y alimentan clasificación, costo de obra,
// obligación con el proveedor y pago. Incluye distribución de costos y prorrateos con regla aprobada.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { invalid, notFound, blocked } from '../core/errors.js';
import { label, pick, nextFolio, notify, resolveNotifications, req, requireReason } from './common.js';
import { obligationState, PAY_STATUS } from './ledger.js';

export const STATUS = { borrador: 'Borrador', pendiente_informacion: 'Pendiente de información', revisado: 'Revisado', autorizado: 'Autorizado', cancelado: 'Cancelado', con_ajuste: 'Con ajuste' };
const FIELDS = ['supplierId', 'docDate', 'receivedDate', 'economicPeriod', 'description', 'categoryId', 'voucherTypeId', 'currency', 'subtotal', 'tax', 'total', 'reference', 'attachmentId', 'negativeNature', 'treatment', 'pettyFundId', 'additionalId'];
const allocsOf = (db, id) => db.by('expenseAllocations', 'expenseId', id);

export function expenseRow(db, e) {
  const ob = e.obligationId ? db.get('obligations', e.obligationId) : null; const st = ob ? obligationState(db, ob) : null; const cat = db.get('costCategories', e.categoryId); const als = allocsOf(db, e.id);
  return { ...pick(e, ['id', 'recordVersion', 'folio', 'docDate', 'receivedDate', 'economicPeriod', 'description', 'subtotal', 'tax', 'total', 'reference', 'status', 'quality', 'treatment', 'duplicateFlag', 'negativeNature', 'attachmentId', 'supplierId', 'categoryId', 'obligationId', 'additionalId', 'pettyFundId']), supplier: label(db, 'parties', e.supplierId), category: cat?.name || null, categoryClass: cat?.class || null,
    distribution: als.map((a) => (a.target === 'obra' ? label(db, 'works', a.workId) : a.target === 'administracion' ? 'Administración' : 'Stock')).join(' · ') || null, allocated: d.sum(als.map((a) => a.amount)), workIds: als.map((a) => a.workId).filter(Boolean),
    payStatus: e.pettyFundId ? 'pagado' : st ? st.payStatus : 'sin_pago', paid: st ? st.paid : e.pettyFundId ? e.total : '0.00', balance: st ? st.balance : null, hasVoucher: !!e.attachmentId };
}
const COLUMNS = [{ key: 'folio', label: 'Folio' }, { key: 'docDate', label: 'Fecha del documento', type: 'date' }, { key: 'supplier', label: 'Proveedor' }, { key: 'description', label: 'Descripción' }, { key: 'category', label: 'Categoría' }, { key: 'distribution', label: 'Distribución' }, { key: 'subtotal', label: 'Antes de impuestos', type: 'money', total: true }, { key: 'tax', label: 'Impuestos', type: 'money', total: true }, { key: 'total', label: 'Total', type: 'money', total: true },
  { key: 'status', label: 'Estado', type: 'status', values: STATUS }, { key: 'payStatus', label: 'Pago', type: 'status', values: PAY_STATUS }, { key: 'quality', label: 'Calidad del dato', type: 'status', values: { completo: 'Completo', sin_desglose: 'Sin desglose fiscal', pendiente: 'Pendiente' } }];

function normalize(tx, b, cur) {
  const data = pick(b, FIELDS); for (const k of Object.keys(data)) if (data[k] === '') data[k] = null;
  const m = { ...(cur || {}), ...data };
  if (m.total === null || m.total === undefined) throw invalid('Falta el total del comprobante.', 'total');
  // No se inventa un IVA desglosado cuando el origen no lo indica.
  if ((m.subtotal === null || m.subtotal === undefined) !== (m.tax === null || m.tax === undefined)) throw invalid('Capture importe antes de impuestos e impuestos juntos, o deje ambos vacíos si el comprobante no los desglosa.', 'tax');
  if (m.subtotal !== null && m.subtotal !== undefined && !d.eq(d.add(m.subtotal, m.tax), m.total)) throw invalid(`Importe antes de impuestos más impuestos (${d.fmtMoney(d.add(m.subtotal, m.tax))}) no coincide con el total (${d.fmtMoney(m.total)}).`, 'total');
  if (d.isNeg(m.total) && !m.negativeNature) throw invalid('Un importe negativo requiere identificar su naturaleza: devolución, reclasificación, reverso o traslado.', 'negativeNature');
  data.quality = m.subtotal !== null && m.subtotal !== undefined ? 'completo' : 'sin_desglose';
  if (!data.economicPeriod && !cur?.economicPeriod && m.docDate) data.economicPeriod = m.docDate.slice(0, 7);
  if (m.categoryId) { const cat = tx.must('costCategories', m.categoryId); if (!b.treatment && !cur) data.treatment = cat.class === 'activo_inversion' ? 'activo_pendiente' : ['prestamo', 'movimiento_socios', 'transferencia_interna'].includes(cat.class) ? 'no_resultado' : 'gasto'; }
  return data;
}
// Posibles facturas repetidas: alerta revisable, nunca eliminación automática.
function duplicates(tx, e, exceptId) {
  return tx.all('expenses').filter((o) => o.id !== exceptId && o.status !== 'cancelado' && o.supplierId && o.supplierId === e.supplierId && d.eq(o.total, e.total) && ((e.reference && o.reference === e.reference) || o.docDate === e.docDate));
}

// Distribución: la suma de asignaciones debe conciliar exactamente con el importe distribuible.
export function setAllocations(tx, expense, list, { allocationRunId = null } = {}) {
  for (const a of allocsOf(tx, expense.id)) tx.remove('expenseAllocations', a.id);
  if (!list.length) return;
  const total = expense.total; let sum = '0.00'; const rows = [];
  const pctRows = list.filter((a) => a.method === 'porcentaje');
  if (pctRows.length && pctRows.length !== list.length) throw invalid('No mezcle reparto por porcentaje con importes fijos en el mismo gasto.', 'allocations');
  if (pctRows.length) {
    if (!d.eq(d.sum(list.map((a) => a.pct), 4), '100')) throw invalid(`Los porcentajes suman ${d.sum(list.map((a) => a.pct), 2)}%; deben sumar 100%.`, 'allocations');
    const { parts, roundingDiff, roundingIndex } = d.allocate(total, list.map((a) => a.pct));
    list.forEach((a, i) => rows.push({ ...a, amount: parts[i], roundingAdjust: i === roundingIndex ? roundingDiff : null }));
  } else list.forEach((a) => rows.push({ ...a, amount: d.norm(a.amount) }));
  for (const a of rows) {
    if (!['obra', 'administracion', 'stock'].includes(a.target)) throw invalid('Destino de costo no válido.', 'allocations');
    if (a.target === 'obra') { if (!a.workId) throw invalid('Indique la obra de cada asignación.', 'allocations'); tx.must('works', a.workId, 'La obra'); }
    sum = d.add(sum, a.amount);
    tx.insert('expenseAllocations', { expenseId: expense.id, target: a.target, workId: a.target === 'obra' ? a.workId : null, method: a.method || 'importe', pct: a.method === 'porcentaje' ? a.pct : null, amount: a.amount, basisNote: a.basisNote || null, allocationRunId, roundingAdjust: a.roundingAdjust || null });
  }
  if (!d.eq(sum, total)) throw invalid(`Las asignaciones suman ${d.fmtMoney(sum)} y el importe distribuible es ${d.fmtMoney(total)}.`, 'allocations', 'Ajuste los importes hasta conciliar exactamente.');
}

export function register(app) {
  const guard = (c, perm = 'expenses.view') => { if (c.acc.audience !== 'interno' || !c.acc.can(perm)) throw notFound(); };
  // Quien tiene alcance por obra solo ve los gastos asignados a sus obras.
  const visible = (c, e) => { const s = c.acc.scope('expenses.view'); if (s === 'all') return true; return allocsOf(c.db, e.id).some((a) => a.workId && s.has(a.workId)); };
  app.get('/api/expenses', (c) => { guard(c); let rows = c.db.where('expenses', (e) => visible(c, e)).map((e) => expenseRow(c.db, e)); if (c.query.workId) rows = rows.filter((r) => r.workIds.includes(c.query.workId)); return listResult(c, rows, COLUMNS, { defaultSort: '-docDate', name: 'gastos', dateField: 'docDate' }); });
  app.get('/api/expenses/:id', (c) => { guard(c); const e = c.db.get('expenses', c.params.id); if (!e || !visible(c, e)) throw notFound('El gasto');
    return { ...expenseRow(c.db, e), voucherTypeId: e.voucherTypeId, pettyFundId: e.pettyFundId, authorizedBy: label(c.db, 'users', e.authorizedBy), additional: label(c.db, 'additionals', e.additionalId, 'folio'),
      allocations: allocsOf(c.db, e.id).map((a) => ({ ...pick(a, ['id', 'target', 'workId', 'method', 'pct', 'amount', 'basisNote', 'roundingAdjust']), work: label(c.db, 'works', a.workId) })),
      payments: e.obligationId ? c.db.by('paymentApplications', 'obligationId', e.obligationId).map((a) => { const x = c.db.get('disbursements', a.disbursementId); return { folio: x.folio, date: x.date, method: label(c.db, 'paymentMethods', x.methodId), amount: a.amount, status: a.status, disbursementStatus: x.status }; }) : [],
      duplicates: e.duplicateFlag === 'posible' ? duplicates(c.db, e, e.id).map((o) => pick(o, ['id', 'folio', 'docDate', 'total', 'reference'])) : [],
      can: { capture: c.acc.can('expenses.capture'), authorize: c.acc.can('expenses.authorize') } }; });
  app.post('/api/expenses', (c) => c.tx('captura_gasto', (tx) => {
    guard(c, 'expenses.capture'); const b = req(c.body, ['docDate', 'description', 'total']);
    const data = normalize(tx, b, null); const dups = duplicates(tx, { ...data, ...pick(b, ['supplierId', 'total', 'reference', 'docDate']) }, null);
    const e = tx.insert('expenses', { currency: 'MXN', treatment: 'gasto', ...data, folio: nextFolio(tx, 'expenses', 'GA'), status: 'borrador', duplicateFlag: dups.length ? 'posible' : 'ninguno' });
    if (b.allocations) setAllocations(tx, e, b.allocations);
    return { id: e.id, folio: e.folio, warnings: dups.length ? [{ type: 'posible_duplicado', message: `Hay un comprobante parecido del mismo proveedor (${dups.map((x) => x.folio).join(', ')}). Revíselo; no se eliminó nada.` }] : [] };
  }));
  app.patch('/api/expenses/:id', (c) => c.tx('edicion_gasto', (tx) => {
    guard(c, 'expenses.capture'); const cur = tx.must('expenses', c.params.id);
    if (cur.status === 'autorizado' || cur.status === 'con_ajuste') {
      // Tras autorizar solo cambia la clasificación, con historial; importes y comprobante original no.
      const allowed = pick(c.body, ['categoryId', 'treatment', 'economicPeriod']); if (Object.keys(c.body).some((k) => !['categoryId', 'treatment', 'economicPeriod', 'recordVersion', 'reason'].includes(k))) throw blocked('Un gasto autorizado no cambia de importe ni de comprobante.', [], 'Cancele y vuelva a capturar, o registre un documento de ajuste.');
      c.acc.require('expenses.authorize'); requireReason(c.body, 'la reclasificación'); const r = tx.update('expenses', cur.id, { ...allowed, status: 'con_ajuste' }, { expectedVersion: c.body.recordVersion }); return { id: r.id, recordVersion: r.recordVersion };
    }
    if (cur.status === 'cancelado') throw blocked('El gasto está cancelado.');
    const data = normalize(tx, c.body, cur); const e = tx.update('expenses', cur.id, data, { expectedVersion: c.body.recordVersion });
    if (c.body.allocations) setAllocations(tx, e, c.body.allocations);
    else if (data.total !== undefined && allocsOf(tx, e.id).length && !d.eq(d.sum(allocsOf(tx, e.id).map((a) => a.amount)), e.total)) throw invalid('Cambió el total: vuelva a distribuir el gasto.', 'allocations');
    return { id: e.id, recordVersion: e.recordVersion };
  }));
  app.put('/api/expenses/:id/allocations', (c) => c.tx('distribucion_gasto', (tx) => { guard(c, 'expenses.capture'); const e = tx.must('expenses', c.params.id); if (['autorizado', 'con_ajuste'].includes(e.status)) { c.acc.require('expenses.authorize'); requireReason(c.body, 'la redistribución de un gasto autorizado'); } setAllocations(tx, e, c.body.allocations || []); return { id: e.id }; }));
  app.post('/api/expenses/:id/status', (c) => c.tx('estado_gasto', (tx) => {
    const e = tx.must('expenses', c.params.id); const to = c.body.status;
    if (to === 'revisado' || to === 'pendiente_informacion') { guard(c, 'expenses.capture'); if (!['borrador', 'pendiente_informacion', 'revisado'].includes(e.status)) throw blocked('El gasto ya fue autorizado o cancelado.'); if (to === 'pendiente_informacion') requireReason(c.body, 'la solicitud de información'); tx.update('expenses', e.id, { status: to }); if (to === 'revisado') notify(tx, { permission: 'expenses.authorize', event: 'gasto_por_autorizar', objectType: 'expense', objectId: e.id, title: `Gasto ${e.folio} por autorizar: ${d.fmtMoney(e.total)}` }); return { id: e.id }; }
    if (to === 'autorizado') {
      guard(c, 'expenses.authorize'); if (!['borrador', 'revisado'].includes(e.status)) throw blocked('Solo un gasto en borrador o revisado puede autorizarse.');
      const reasons = []; const als = allocsOf(tx, e.id);
      if (!e.categoryId) reasons.push('Falta la categoría.'); if (!als.length) reasons.push('Falta la distribución por obra, administración o stock.');
      else if (!d.eq(d.sum(als.map((a) => a.amount)), e.total)) reasons.push('La distribución no concilia con el total.');
      if (e.duplicateFlag === 'posible') reasons.push('Hay una alerta de posible comprobante repetido sin revisar.');
      if (!e.supplierId && !e.pettyFundId) reasons.push('Falta el proveedor.');
      if (reasons.length) throw blocked('El gasto no puede autorizarse todavía.', reasons);
      c.acc.checkLimit('gasto', d.abs(e.total));
      // La obligación con el proveedor nace aquí; el pago es otro hecho, con su propia fecha.
      let obligationId = e.obligationId;
      if (!obligationId && !e.pettyFundId && d.isPos(e.total)) obligationId = tx.insert('obligations', { folio: nextFolio(tx, 'obligations', 'OB'), kind: 'proveedor', beneficiaryId: e.supplierId, sourceType: 'expense', sourceId: e.id, workId: als.length === 1 ? als[0].workId : null, grossAmount: e.total, currency: e.currency, dueDate: c.body.dueDate || e.docDate, status: 'autorizada' }).id;
      tx.update('expenses', e.id, { status: 'autorizado', authorizedBy: c.user.id, obligationId }, { expectedVersion: c.body.recordVersion }); resolveNotifications(tx, 'expense', e.id); return { id: e.id, obligationId };
    }
    if (to === 'cancelado') {
      guard(c, e.status === 'autorizado' ? 'expenses.authorize' : 'expenses.capture'); requireReason(c.body, 'la cancelación');
      if (e.obligationId) { const st = obligationState(tx, tx.get('obligations', e.obligationId)); if (!d.isZero(st.paid) || !d.isZero(st.reserved)) throw blocked('El gasto tiene pagos registrados.', [], 'Revierta primero los pagos; después cancele.'); tx.update('obligations', e.obligationId, { status: 'cancelada' }); }
      tx.update('expenses', e.id, { status: 'cancelado' }); return { id: e.id };
    }
    throw invalid('Estado no válido.', 'status');
  }));
  app.post('/api/expenses/:id/dismiss-duplicate', (c) => c.tx('descarte_duplicado_gasto', (tx) => { guard(c, 'expenses.authorize'); requireReason(c.body, 'descartar la alerta'); tx.update('expenses', c.params.id, { duplicateFlag: 'descartado' }); return { ok: true }; }));

  // ── Prorrateos con regla aprobada (p. ej. costo social): la aplicación no inventa el criterio ──
  const RULE = { borrador: 'Borrador', aprobada: 'Aprobada', inactiva: 'Inactiva' };
  app.get('/api/allocation-rules', (c) => { guard(c); return { items: c.db.all('allocationRules').map((r) => ({ ...pick(r, ['id', 'recordVersion', 'code', 'name', 'kind', 'basis', 'params', 'version', 'status']), approvedBy: label(c.db, 'users', r.approvedBy), statusLabel: RULE[r.status] })), runs: c.db.all('allocationRuns').map((r) => ({ ...pick(r, ['id', 'period', 'amount', 'adminPortion', 'roundingDiff', 'basis', 'result', 'ruleVersion']), rule: label(c.db, 'allocationRules', r.ruleId), expense: label(c.db, 'expenses', r.expenseId, 'folio'), expenseId: r.expenseId })) }; });
  app.post('/api/allocation-rules', (c) => c.tx('regla_prorrateo', (tx) => { guard(c, 'expenses.authorize'); const b = req(c.body, ['name', 'kind', 'basis']); return { id: tx.insert('allocationRules', { code: nextFolio(tx, 'allocationRules', 'RG', 'code', 2), name: b.name, kind: b.kind, basis: b.basis, params: b.params || {}, version: 1, status: 'borrador' }).id }; }));
  app.post('/api/allocation-rules/:id/approve', (c) => c.tx('aprobacion_regla', (tx) => { guard(c, 'results.view'); c.acc.require('expenses.authorize'); requireReason(c.body, 'la aprobación de la regla'); tx.update('allocationRules', c.params.id, { status: 'aprobada', approvedBy: c.user.id }); return { ok: true }; }));
  // Cambiar la regla crea otra versión: los periodos ya repartidos no se recalculan.
  app.post('/api/allocation-rules/:id/new-version', (c) => c.tx('nueva_version_regla', (tx) => { guard(c, 'expenses.authorize'); const r = tx.must('allocationRules', c.params.id); requireReason(c.body, 'el cambio de regla'); tx.update('allocationRules', r.id, { basis: c.body.basis || r.basis, params: c.body.params || r.params, version: r.version + 1, status: 'borrador', approvedBy: null }); return { ok: true }; }));
  app.post('/api/allocation-rules/:id/run', (c) => c.tx('ejecucion_prorrateo', (tx) => {
    guard(c, 'expenses.authorize'); const rule = tx.must('allocationRules', c.params.id); if (rule.status !== 'aprobada') throw blocked('La regla no está aprobada.', [], 'Dirección debe aprobar el criterio antes de aplicarlo.');
    const b = req(c.body, ['expenseId', 'period']); const e = tx.must('expenses', b.expenseId); if (['autorizado', 'con_ajuste', 'cancelado'].includes(e.status)) throw blocked('El gasto ya está autorizado o cancelado; el prorrateo se aplica antes de autorizar.');
    if (tx.by('allocationRuns', 'expenseId', e.id).length) requireReason(b, 'repetir el prorrateo de este gasto');
    const admin = b.adminPortion ? d.norm(b.adminPortion) : '0.00'; const distributable = d.sub(e.total, admin); let weights = [];
    if (rule.basis === 'mano_obra_autorizada') {
      // Base documentada: mano de obra autorizada a contratistas en el periodo, por obra.
      const by = new Map(); for (const est of tx.all('cEstimates')) { if (!['autorizada', 'cerrada'].includes(est.status) || !est.authorizedAt || est.authorizedAt.slice(0, 7) !== b.period) continue; by.set(est.workId, d.add(by.get(est.workId) || '0', est.authorizedTotal)); }
      weights = [...by].map(([workId, w]) => ({ workId, weight: w }));
    } else if (rule.basis === 'porcentaje_fijo') weights = (rule.params.shares || []).map((s) => ({ workId: s.workId, weight: s.pct }));
    else weights = (b.shares || []).map((s) => ({ workId: s.workId, weight: s.weight }));
    weights = weights.filter((w) => d.isPos(w.weight)); if (!weights.length) throw blocked('No hay base para repartir en ese periodo.', [], 'Sin base documentada el costo queda sin distribuir; no se inventa un criterio.');
    const { parts, roundingDiff } = d.allocate(distributable, weights.map((w) => w.weight));
    const run = tx.insert('allocationRuns', { ruleId: rule.id, ruleVersion: rule.version, period: b.period, expenseId: e.id, amount: e.total, adminPortion: admin, basis: { kind: rule.basis, rows: weights.map((w) => ({ work: label(tx, 'works', w.workId), workId: w.workId, weight: w.weight })) }, result: { rows: weights.map((w, i) => ({ work: label(tx, 'works', w.workId), workId: w.workId, amount: parts[i] })) }, roundingDiff, runBy: c.user.id });
    const list = weights.map((w, i) => ({ target: 'obra', workId: w.workId, method: 'base', amount: parts[i], basisNote: `${rule.name} v${rule.version} · ${b.period}` })); if (d.isPos(admin)) list.push({ target: 'administracion', method: 'base', amount: admin, basisNote: 'Porción administrativa informada' });
    setAllocations(tx, e, list, { allocationRunId: run.id }); return { id: run.id, roundingDiff, rows: run.result.rows };
  }));
}
