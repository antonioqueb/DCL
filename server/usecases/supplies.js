// Seguimiento ligero de insumos: comprar no equivale a consumir, y el stock no se carga a una obra
// hasta registrar su destino.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { invalid, notFound, blocked } from '../core/errors.js';
import { label, pick, req, requireReason, notify, resolveNotifications, effectiveQty } from './common.js';

export const KIND = { inventario_inicial: 'Inventario inicial', recepcion: 'Compra o recepción', entrega_obra: 'Entrega a obra', consumo: 'Consumo en obra', devolucion: 'Devolución a almacén', ajuste: 'Ajuste' };
// Efecto de cada movimiento en almacén y en la existencia en obra.
const EFFECT = { inventario_inicial: [1, 0], recepcion: [1, 0], entrega_obra: [-1, 1], consumo: [0, -1], devolucion: [1, -1], ajuste: [1, 0] };

export function stock(db, supplyId) {
  let store = '0.0000'; const works = new Map(); const consumed = new Map();
  for (const m of db.by('supplyMovements', 'supplyId', supplyId)) {
    const [s, w] = EFFECT[m.kind];
    // Una recepción con obra destino entra directo a esa obra, no al almacén general.
    if (m.kind === 'recepcion' && m.workId) { works.set(m.workId, d.add(works.get(m.workId) || '0', m.qty, 4)); continue; }
    if (s) store = d.add(store, s > 0 ? m.qty : d.neg(m.qty, 4), 4);
    if (w && m.workId) works.set(m.workId, d.add(works.get(m.workId) || '0', w > 0 ? m.qty : d.neg(m.qty, 4), 4));
    if (m.kind === 'consumo' && m.workId) consumed.set(m.workId, d.add(consumed.get(m.workId) || '0', m.qty, 4));
  }
  return { store, works, consumed };
}

export function register(app) {
  const guard = (c, perms = ['supplies.manage', 'supplies.request']) => { if (c.acc.audience !== 'interno' || !perms.some((p) => c.acc.can(p))) throw notFound(); };
  app.get('/api/supplies/stock', (c) => { guard(c); const items = c.db.all('supplies').filter((s) => !s.archivedAt).map((s) => { const st = stock(c.db, s.id); return { id: s.id, code: s.code, name: s.name, unit: label(c.db, 'units', s.unitId, 'code'), inStore: st.store, atWorks: d.sum([...st.works.values()], 4), consumed: d.sum([...st.consumed.values()], 4), byWork: [...st.works].map(([w, q]) => ({ workId: w, work: label(c.db, 'works', w), onSite: q, consumed: st.consumed.get(w) || '0.0000' })), negative: d.isNeg(st.store) || [...st.works.values()].some((q) => d.isNeg(q)) }; });
    return { items, basis: 'Existencia = inventario inicial + recepciones − entregas + devoluciones ± ajustes. La compra no se considera consumo.' }; });
  app.get('/api/supplies/movements', (c) => { guard(c); return listResult(c, c.db.all('supplyMovements').map((m) => ({ ...pick(m, ['id', 'kind', 'date', 'qty', 'note', 'workId', 'supplyId', 'expenseId']), supply: label(c.db, 'supplies', m.supplyId), unit: label(c.db, 'units', m.unitId, 'code'), work: label(c.db, 'works', m.workId) || (m.kind === 'recepcion' || m.kind === 'inventario_inicial' ? 'Almacén (stock)' : null), expense: label(c.db, 'expenses', m.expenseId, 'folio') })),
    [{ key: 'date', label: 'Fecha', type: 'date' }, { key: 'supply', label: 'Insumo' }, { key: 'kind', label: 'Movimiento', type: 'status', values: KIND }, { key: 'qty', label: 'Cantidad', type: 'qty' }, { key: 'unit', label: 'Unidad' }, { key: 'work', label: 'Destino' }, { key: 'expense', label: 'Comprobante' }, { key: 'note', label: 'Nota' }], { defaultSort: '-date', name: 'insumos', dateField: 'date' }); });
  app.post('/api/supplies/movements', (c) => c.tx('movimiento_insumo', (tx) => {
    guard(c, ['supplies.manage']); const b = req(c.body, ['supplyId', 'kind', 'date', 'qty']); const s = tx.must('supplies', b.supplyId, 'El insumo'); if (!EFFECT[b.kind]) throw invalid('Movimiento no válido.', 'kind');
    let qty = d.norm(b.qty, 4); let unitId = b.unitId || s.unitId;
    if (unitId !== s.unitId) {
      // Solo se convierte con una regla explícita y aprobada.
      const conv = tx.by('unitConversions', 'supplyId', s.id).find((x) => x.fromUnitId === unitId && x.toUnitId === s.unitId); if (!conv) throw blocked(`No hay una conversión aprobada de ${label(tx, 'units', unitId, 'code')} a ${label(tx, 'units', s.unitId, 'code')} para este insumo.`, [], 'Registre la conversión explícita o capture en la unidad del insumo.');
      qty = d.mul(qty, conv.factor, 4); unitId = s.unitId;
    }
    if (b.kind !== 'ajuste' && !d.isPos(qty)) throw invalid('La cantidad debe ser mayor que cero.', 'qty'); if (b.kind === 'ajuste') requireReason({ reason: b.note }, 'el ajuste de existencia');
    if (['entrega_obra', 'consumo', 'devolucion'].includes(b.kind) && !b.workId) throw invalid('Indique la obra.', 'workId');
    const st = stock(tx, s.id); const warnings = [];
    if (b.kind === 'entrega_obra' && d.gt(qty, st.store)) warnings.push({ type: 'existencia_insuficiente', message: `El almacén registra ${d.fmtQty(st.store)}; la entrega deja la existencia en negativo. Revise si falta capturar una recepción o el inventario inicial.` });
    if (['consumo', 'devolucion'].includes(b.kind) && d.gt(qty, st.works.get(b.workId) || '0')) warnings.push({ type: 'existencia_insuficiente', message: 'La obra no registra esa existencia; revise entregas pendientes de captura.' });
    const m = tx.insert('supplyMovements', { supplyId: s.id, kind: b.kind, date: b.date, qty, unitId, workId: b.workId || null, expenseId: b.expenseId || null, requestId: b.requestId || null, note: b.note || null });
    if (b.requestId && b.kind === 'entrega_obra') tx.update('supplyRequests', b.requestId, { status: 'surtida' });
    return { id: m.id, warnings };
  }));
  app.post('/api/supplies/conversions', (c) => c.tx('conversion_unidad', (tx) => { guard(c, ['supplies.manage']); const b = req(c.body, ['supplyId', 'fromUnitId', 'factor', 'note']); const s = tx.must('supplies', b.supplyId); if (!d.isPos(b.factor)) throw invalid('El factor debe ser mayor que cero.', 'factor'); return { id: tx.insert('unitConversions', { supplyId: s.id, fromUnitId: b.fromUnitId, toUnitId: s.unitId, factor: b.factor, note: b.note, approvedBy: c.user.id }).id }; }));
  app.get('/api/supplies/conversions', (c) => { guard(c); return { items: c.db.all('unitConversions').map((x) => ({ id: x.id, supply: label(c.db, 'supplies', x.supplyId), from: label(c.db, 'units', x.fromUnitId, 'code'), to: label(c.db, 'units', x.toUnitId, 'code'), factor: x.factor, note: x.note })) }; });

  // Solicitudes de insumos (sin exigir un módulo de compras para cada gasto menor).
  const RQ = { solicitada: 'Solicitada', aprobada: 'Aprobada', rechazada: 'Rechazada', surtida: 'Surtida' };
  app.get('/api/supplies/requests', (c) => { guard(c); const mineOnly = !c.acc.can('supplies.manage'); return listResult(c, c.db.all('supplyRequests').filter((r) => (mineOnly ? r.requesterId === c.user.id : true) && c.acc.inScope('works.view', r.workId)).map((r) => ({ ...pick(r, ['id', 'qty', 'reason', 'neededDate', 'status', 'workId', 'supplyId']), work: label(c.db, 'works', r.workId), supply: label(c.db, 'supplies', r.supplyId), requester: label(c.db, 'users', r.requesterId), createdAt: r.createdAt })),
    [{ key: 'neededDate', label: 'Se necesita', type: 'date' }, { key: 'work', label: 'Obra' }, { key: 'supply', label: 'Insumo' }, { key: 'qty', label: 'Cantidad', type: 'qty' }, { key: 'reason', label: 'Motivo' }, { key: 'requester', label: 'Solicita' }, { key: 'status', label: 'Estado', type: 'status', values: RQ }], { defaultSort: 'neededDate', name: 'solicitudes-insumos' }); });
  app.post('/api/supplies/requests', (c) => c.tx('solicitud_insumo', (tx) => { const b = req(c.body, ['workId', 'supplyId', 'qty']); c.acc.require('supplies.request', b.workId, 'solicitar insumos'); if (!d.isPos(b.qty)) throw invalid('La cantidad debe ser mayor que cero.', 'qty');
    const r = tx.insert('supplyRequests', { workId: b.workId, requesterId: c.user.id, supplyId: b.supplyId, qty: b.qty, reason: b.reason || null, neededDate: b.neededDate || null, status: 'solicitada' }); notify(tx, { permission: 'supplies.manage', event: 'solicitud_insumo', objectType: 'supplyRequest', objectId: r.id, workId: b.workId, title: `Solicitud de ${label(tx, 'supplies', b.supplyId)} para ${label(tx, 'works', b.workId)}`, dueDate: b.neededDate || null }); return { id: r.id }; }));
  app.post('/api/supplies/requests/:id/decide', (c) => c.tx('decision_solicitud_insumo', (tx) => { guard(c, ['supplies.manage']); const r = tx.must('supplyRequests', c.params.id); if (r.status !== 'solicitada') throw blocked('La solicitud ya fue resuelta.'); tx.update('supplyRequests', r.id, { status: c.body.decision === 'aprobar' ? 'aprobada' : 'rechazada', approvedBy: c.user.id }); resolveNotifications(tx, 'supplyRequest', r.id); return { ok: true }; }));

  // Consumo por m²: solo con áreas compatibles, material y periodo definidos. Si faltan datos, no se calcula.
  app.get('/api/supplies/ratio', (c) => { guard(c, ['supplies.manage']); const q = c.query; if (!q.supplyId || !q.workId || !q.conceptIds || !q.from || !q.to) throw invalid('Indique insumo, obra, conceptos de área compatibles y periodo.', 'supplyId');
    const s = c.db.get('supplies', q.supplyId); const ids = new Set(q.conceptIds.split(',')); const issues = [];
    const moves = c.db.by('supplyMovements', 'supplyId', q.supplyId).filter((m) => m.workId === q.workId && m.date >= q.from && m.date <= q.to);
    const consumed = d.sum(moves.filter((m) => m.kind === 'consumo').map((m) => m.qty), 4);
    if (d.isZero(consumed)) issues.push('No hay consumo registrado en el periodo (las compras y entregas no son consumo).');
    const st = stock(c.db, q.supplyId); if (d.isNeg(st.works.get(q.workId) || '0')) issues.push('La existencia en obra es negativa: faltan entregas o saldos por capturar.');
    const entries = c.db.by('progressEntries', 'workId', q.workId).filter((e) => e.status === 'validado' && ids.has(e.conceptId) && e.executionDate >= q.from && e.executionDate <= q.to);
    if (entries.some((e) => c.db.get('units', e.unitId)?.kind !== 'area')) issues.push('Hay conceptos que no se miden en m²; no son comparables.');
    const area = d.sum(entries.map((e) => effectiveQty(c.db, e)), 4); if (d.isZero(area)) issues.push('No hay área validada de esos conceptos en el periodo.');
    return { supply: s?.name, unit: label(c.db, 'units', s?.unitId, 'code'), consumed, area, ratio: issues.length ? null : d.div(consumed, area, 4), reliable: !issues.length, issues, basis: `Consumo registrado ÷ m² validados de los conceptos seleccionados, del ${q.from} al ${q.to}.` }; });
}
