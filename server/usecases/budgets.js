// Contratos, presupuestos con versiones, aditivas y deductivas, y seguimiento presupuesto–ejecución.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { sha256 } from '../core/store.js';
import { invalid, notFound, blocked } from '../core/errors.js';
import { label, pick, locationPath, nextFolio, req, requireReason, effectiveQty, inWorkScope } from './common.js';

export const BV = { borrador: 'Borrador', en_revision: 'En revisión', enviado: 'Enviado', aceptado: 'Aceptado', rechazado: 'Rechazado', sustituido: 'Sustituido', cancelado: 'Cancelado' };
export const CO = { propuesta: 'Propuesta', en_revision: 'En revisión', aprobada: 'Aprobada', rechazada: 'Rechazada', cancelada: 'Cancelada' };
export const CO_TYPE = { cambio_cantidad: 'Cambio de cantidad', concepto_nuevo: 'Concepto nuevo', cambio_precio: 'Cambio de precio', sustitucion: 'Sustitución', eliminacion_alcance: 'Eliminación de alcance' };

export const currentContract = (db, workId) => db.by('contracts', 'workId', workId).find((c) => c.status === 'vigente') || null;
export const currentBudgetVersion = (db, workId) => db.by('budgetVersions', 'workId', workId).find((v) => v.isCurrent && v.status === 'aceptado') || null;
const itemAmount = (i) => { const gross = d.lineAmount(i.qty, i.price); return i.discountPct ? d.sub(gross, d.pctOf(gross, i.discountPct)) : gross; };

// Seguimiento: ninguna partida presupuestada desaparece por carecer de mediciones.
export function tracking(db, workId) {
  const bv = currentBudgetVersion(db, workId);
  const cos = db.by('changeOrders', 'workId', workId);
  const approved = cos.filter((c) => c.status === 'aprobada');
  const coItems = approved.flatMap((c) => db.by('changeOrderItems', 'changeOrderId', c.id).map((i) => ({ ...i, co: c })));
  const rows = [];
  const entries = db.by('progressEntries', 'workId', workId).filter((e) => e.status === 'validado');
  const execOf = (itemId) => d.sum(entries.filter((e) => e.budgetItemId === itemId).map((e) => effectiveQty(db, e)), 4);
  const approvedClient = (itemId) => d.sum(db.by('kEstimateItems', 'budgetItemId', itemId).filter((i) => db.get('kEstimates', i.estimateId)?.status === 'aprobada' && i.acceptedQty !== null).map((i) => i.acceptedQty), 4);
  for (const it of bv ? db.by('budgetItems', 'budgetVersionId', bv.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : []) {
    const changes = coItems.filter((c) => c.budgetItemId === it.id);
    const qtyDelta = d.sum(changes.map((c) => c.qtyDelta), 4); const priceChanged = changes.some((c) => c.co.changeType === 'cambio_precio');
    const currentQty = d.add(it.qty, qtyDelta, 4); const executed = execOf(it.id); const pendingQty = d.sub(currentQty, executed, 4);
    const state = it.status !== 'vigente' ? it.status : d.isZero(executed) ? 'pendiente' : d.gt(executed, currentQty) ? 'excedida' : d.eq(executed, currentQty) ? 'completa' : 'en_proceso';
    rows.push({ id: it.id, chapter: it.chapter, location: locationPath(db, it.locationId), description: it.description, unit: label(db, 'units', it.unitId, 'code'), budgetQty: it.qty, price: it.price, budgetAmount: it.amount, changeQty: qtyDelta, currentQty, currentAmount: d.add(it.amount, d.sum(changes.map((c) => c.amount))), executedQty: executed,
      // No se fuerza una resta de importes incompatibles: si cambió el precio, la valorización se marca para revisión.
      executedAmount: priceChanged ? null : d.lineAmount(executed, it.price), comparable: !priceChanged, pendingQty: it.status === 'vigente' ? pendingQty : null, pendingAmount: it.status === 'vigente' && !priceChanged ? d.lineAmount(d.max(pendingQty, '0', 4), it.price) : null, clientApprovedQty: approvedClient(it.id), state, origin: 'presupuesto' });
  }
  for (const c of coItems.filter((x) => !x.budgetItemId)) rows.push({ id: c.id, chapter: `${c.co.kind === 'aditiva' ? 'Aditiva' : 'Deductiva'} ${c.co.folio}`, location: locationPath(db, c.locationId), description: c.description, unit: label(db, 'units', c.unitId, 'code'), budgetQty: '0.0000', price: c.price, budgetAmount: '0.00', changeQty: c.qtyDelta, currentQty: c.qtyDelta, currentAmount: c.amount, executedQty: null, executedAmount: null, comparable: true, pendingQty: null, pendingAmount: null, clientApprovedQty: d.sum(db.by('kEstimateItems', 'changeOrderId', c.co.id).filter((i) => db.get('kEstimates', i.estimateId)?.status === 'aprobada' && i.acceptedQty !== null && i.description === c.description).map((i) => i.acceptedQty), 4), state: 'modificacion', origin: c.co.folio });
  const original = bv ? d.sum(db.by('budgetItems', 'budgetVersionId', bv.id).filter((i) => i.status !== 'cancelada').map((i) => i.amount)) : null;
  const add = d.sum(approved.filter((c) => c.kind === 'aditiva').map((c) => c.amount)), ded = d.sum(approved.filter((c) => c.kind === 'deductiva').map((c) => c.amount));
  const main = rows.filter((r) => r.origin === 'presupuesto');
  return {
    budgetVersion: bv ? { id: bv.id, version: bv.version, acceptedAt: bv.acceptedAt, acceptedByName: bv.acceptedByName } : null,
    summary: { original, additivesApproved: add, deductivesApproved: ded, current: original === null ? null : d.sub(d.add(original, add), ded), executedValued: d.sum(main.filter((r) => r.executedAmount !== null).map((r) => r.executedAmount)), pending: d.sum(main.filter((r) => r.pendingAmount !== null).map((r) => r.pendingAmount)), notComparable: main.filter((r) => !r.comparable).length,
      // Una propuesta aún no aceptada no incrementa el contrato aprobado: se muestra aparte.
      proposedNotApproved: d.sum(cos.filter((c) => ['propuesta', 'en_revision'].includes(c.status)).map((c) => (c.kind === 'aditiva' ? c.amount : d.neg(c.amount)))), withoutExecution: main.filter((r) => r.state === 'pendiente').length },
    rows,
  };
}
export const TRACK_COLS = [{ key: 'chapter', label: 'Capítulo' }, { key: 'location', label: 'Ubicación' }, { key: 'description', label: 'Partida' }, { key: 'unit', label: 'Unidad' }, { key: 'budgetQty', label: 'Presupuestado', type: 'qty' }, { key: 'changeQty', label: 'Modificaciones', type: 'qty' }, { key: 'currentQty', label: 'Vigente', type: 'qty' }, { key: 'executedQty', label: 'Ejecutado validado', type: 'qty' }, { key: 'pendingQty', label: 'Pendiente', type: 'qty' }, { key: 'currentAmount', label: 'Importe vigente', type: 'money', total: true }, { key: 'executedAmount', label: 'Ejecución valorizada', type: 'money', total: true }, { key: 'pendingAmount', label: 'Importe pendiente', type: 'money', total: true },
  { key: 'state', label: 'Seguimiento', type: 'status', values: { pendiente: 'Pendiente (sin ejecución)', en_proceso: 'En proceso', completa: 'Completa', excedida: 'Sobre presupuesto', cancelada: 'Cancelada', sustituida: 'Sustituida', modificacion: 'Modificación aprobada' } }];

function versionDoc(db, v) {
  const items = db.by('budgetItems', 'budgetVersionId', v.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((i) => ({ ...pick(i, ['id', 'recordVersion', 'chapter', 'locationId', 'conceptId', 'description', 'unitId', 'qty', 'price', 'discountPct', 'amount', 'includes', 'status', 'sortOrder']), location: locationPath(db, i.locationId), unit: label(db, 'units', i.unitId, 'code'), concept: label(db, 'concepts', i.conceptId) }));
  const b = db.get('budgets', v.budgetId);
  return { id: v.id, recordVersion: v.recordVersion, budgetId: b.id, code: b.code, name: b.name, workId: v.workId, work: label(db, 'works', v.workId), version: v.version, status: v.status, isCurrent: v.isCurrent, sentAt: v.sentAt, acceptedAt: v.acceptedAt, acceptedByName: v.acceptedByName, acceptanceEvidenceId: v.acceptanceEvidenceId, conditions: v.conditions, taxTreatment: v.taxTreatment, items, subtotal: d.sum(items.filter((i) => i.status !== 'cancelada').map((i) => i.amount)) };
}

export function register(app) {
  const guard = (c, workId, perm = 'budgets.view') => { if (c.acc.audience !== 'interno' || !c.acc.inScope(perm, workId)) throw notFound(); };
  // ── Contrato y condiciones (cada cambio es una versión; se conserva el acuerdo que lo respalda) ──
  const CF = ['code', 'currency', 'advanceKind', 'advancePct', 'advanceAmount', 'advanceBase', 'amortizationPct', 'amortizationBase', 'retentionPct', 'retentionBase', 'retentionRelease', 'taxRate', 'taxLabel', 'dueDays', 'agreementAttachmentId', 'termsValidated', 'notes'];
  app.get('/api/works/:id/contracts', (c) => { guard(c, c.params.id); return { items: c.db.by('contracts', 'workId', c.params.id).sort((a, b) => b.version - a.version) }; });
  app.post('/api/works/:id/contracts', (c) => c.tx('condiciones_contrato', (tx) => {
    const w = tx.must('works', c.params.id); c.acc.require('budgets.manage', w.id); if (!w.clientId) throw blocked('La obra no tiene cliente asignado.');
    const prev = tx.by('contracts', 'workId', w.id); if (prev.length) requireReason(c.body, 'el cambio de condiciones');
    for (const p of prev) if (p.status === 'vigente') tx.update('contracts', p.id, { status: 'sustituido' });
    const b = pick(c.body, CF); if (typeof b.dueDays === 'string') b.dueDays = b.dueDays === '' ? null : parseInt(b.dueDays, 10);
    const k = tx.insert('contracts', { code: b.code || `CT-${w.code}`, currency: w.currency, advanceKind: 'ninguno', amortizationBase: 'no_definida', retentionBase: 'no_definida', ...b, termsValidated: !!b.termsValidated, workId: w.id, clientId: w.clientId, version: Math.max(0, ...prev.map((p) => p.version)) + 1, status: 'vigente' });
    return { id: k.id, version: k.version };
  }));

  // ── Presupuestos ──
  app.get('/api/works/:id/budgets', (c) => { guard(c, c.params.id); return { versions: c.db.by('budgetVersions', 'workId', c.params.id).sort((a, b) => b.version - a.version).map((v) => { const x = versionDoc(c.db, v); return { ...x, items: undefined, itemCount: x.items.length }; }) }; });
  app.get('/api/budget-versions/:id', (c) => { const v = c.db.get('budgetVersions', c.params.id); if (!v) throw notFound(); guard(c, v.workId); return { ...versionDoc(c.db, v), can: { manage: c.acc.can('budgets.manage', v.workId) } }; });
  app.post('/api/works/:id/budgets', (c) => c.tx('alta_presupuesto', (tx) => {
    const w = tx.must('works', c.params.id); c.acc.require('budgets.manage', w.id);
    const b = tx.insert('budgets', { workId: w.id, code: nextFolio(tx, 'budgets', 'PR', 'code'), name: c.body.name || `Presupuesto ${w.name}` });
    return { id: tx.insert('budgetVersions', { budgetId: b.id, workId: w.id, version: 1, status: 'borrador', isCurrent: false, conditions: c.body.conditions || null, taxTreatment: c.body.taxTreatment || null }).id };
  }));
  app.post('/api/budget-versions/:id/new-version', (c) => c.tx('nueva_version_presupuesto', (tx) => {
    const v = tx.must('budgetVersions', c.params.id); c.acc.require('budgets.manage', v.workId); requireReason(c.body, 'la nueva versión');
    const n = tx.insert('budgetVersions', { budgetId: v.budgetId, workId: v.workId, version: Math.max(...tx.by('budgetVersions', 'budgetId', v.budgetId).map((x) => x.version)) + 1, status: 'borrador', isCurrent: false, conditions: v.conditions, taxTreatment: v.taxTreatment });
    for (const i of tx.by('budgetItems', 'budgetVersionId', v.id)) tx.insert('budgetItems', { ...pick(i, ['workId', 'chapter', 'locationId', 'conceptId', 'description', 'unitId', 'qty', 'price', 'discountPct', 'amount', 'includes', 'status', 'sortOrder']), budgetVersionId: n.id });
    return { id: n.id };
  }));
  // Partidas: se sustituye el contenido completo de un borrador (captura por tabla).
  app.put('/api/budget-versions/:id/items', (c) => c.tx('partidas_presupuesto', (tx) => {
    const v = tx.must('budgetVersions', c.params.id); c.acc.require('budgets.manage', v.workId);
    if (!['borrador', 'en_revision'].includes(v.status)) throw blocked('Un presupuesto enviado o aceptado no se edita.', [], 'Cree una nueva versión o registre una aditiva o deductiva.');
    const list = c.body.items || []; const keep = new Set(list.filter((i) => i.id).map((i) => i.id));
    for (const old of tx.by('budgetItems', 'budgetVersionId', v.id)) if (!keep.has(old.id)) tx.remove('budgetItems', old.id);
    list.forEach((raw, idx) => {
      req(raw, ['description', 'unitId', 'qty']); if (raw.price === undefined || raw.price === '' || raw.price === null) throw invalid(`La partida "${raw.description}" no tiene precio.`, 'price');
      if (d.isNeg(raw.qty) || d.isNeg(raw.price)) throw invalid(`La partida "${raw.description}" tiene cantidad o precio negativo.`, 'qty', 'Las reducciones de alcance se registran como deductiva.');
      const data = { ...pick(raw, ['chapter', 'locationId', 'conceptId', 'description', 'unitId', 'qty', 'price', 'discountPct', 'includes']), sortOrder: idx, status: raw.status || 'vigente', workId: v.workId, budgetVersionId: v.id };
      for (const k of ['locationId', 'conceptId', 'discountPct', 'chapter', 'includes']) if (data[k] === '') data[k] = null;
      data.amount = itemAmount(data);
      if (raw.id) tx.update('budgetItems', raw.id, data); else tx.insert('budgetItems', data);
    });
    tx.update('budgetVersions', v.id, pick(c.body, ['conditions', 'taxTreatment']), { expectedVersion: c.body.recordVersion });
    return { id: v.id };
  }));
  const FLOW = { en_revision: ['borrador'], enviado: ['en_revision', 'borrador'], aceptado: ['enviado'], rechazado: ['enviado'], cancelado: ['borrador', 'en_revision', 'enviado'], borrador: ['en_revision'] };
  app.post('/api/budget-versions/:id/transition', (c) => c.tx('transicion_presupuesto', (tx) => {
    const v = tx.must('budgetVersions', c.params.id); c.acc.require('budgets.manage', v.workId); const to = c.body.to;
    if (!FLOW[to]?.includes(v.status)) throw blocked(`No es posible pasar de "${BV[v.status]}" a "${BV[to] || to}".`);
    const patch = { status: to };
    if (to === 'enviado') { if (!tx.by('budgetItems', 'budgetVersionId', v.id).length) throw blocked('El presupuesto no tiene partidas.'); patch.sentAt = tx.now; }
    if (to === 'aceptado') {
      if (!c.body.acceptedByName) throw invalid('Indique quién aceptó por parte del cliente.', 'acceptedByName');
      Object.assign(patch, { acceptedAt: c.body.acceptedAt || tx.now.slice(0, 10), acceptedByName: c.body.acceptedByName, acceptanceEvidenceId: c.body.acceptanceEvidenceId || null, isCurrent: true });
      // La versión vigente debe ser inequívoca.
      for (const o of tx.by('budgetVersions', 'workId', v.workId)) if (o.id !== v.id && o.isCurrent) tx.update('budgetVersions', o.id, { isCurrent: false, status: 'sustituido' });
      const doc = versionDoc(tx, { ...v, ...patch });
      tx.insert('documentVersions', { docType: 'budgetVersion', docId: v.id, version: v.version, reason: null, snapshot: doc, snapshotHash: sha256(JSON.stringify(doc)), frozenAt: tx.now, frozenBy: c.user.id });
    }
    if (to === 'rechazado' || to === 'cancelado') requireReason(c.body, 'esta decisión');
    tx.update('budgetVersions', v.id, patch, { expectedVersion: c.body.recordVersion }); return { id: v.id, status: to };
  }));
  app.get('/api/works/:id/budget-tracking', (c) => { guard(c, c.params.id); const t = tracking(c.db, c.params.id); const seePrice = c.acc.can('rates.client.view', c.params.id) || c.acc.can('budgets.manage', c.params.id);
    if (!seePrice) { t.rows = t.rows.map((r) => ({ ...r, price: undefined, budgetAmount: undefined, currentAmount: undefined, executedAmount: undefined, pendingAmount: undefined })); t.summary = { withoutExecution: t.summary.withoutExecution }; }
    if (c.query.format === 'csv') return listResult(c, t.rows, seePrice ? TRACK_COLS : TRACK_COLS.filter((x) => x.type !== 'money'), { name: 'presupuesto-contra-ejecucion' });
    return { ...t, columns: seePrice ? TRACK_COLS : TRACK_COLS.filter((x) => x.type !== 'money') }; });

  // ── Aditivas y deductivas ──
  const coRow = (db, x) => ({ ...pick(x, ['id', 'recordVersion', 'workId', 'folio', 'kind', 'changeType', 'origin', 'reason', 'status', 'effectiveDate', 'clientApprovedByName', 'approvalEvidenceId', 'amount']), work: label(db, 'works', x.workId), proposer: label(db, 'users', x.proposerId), internalApprovedBy: label(db, 'users', x.internalApprovedBy), signedAmount: x.kind === 'aditiva' ? x.amount : d.neg(x.amount) });
  app.get('/api/change-orders', (c) => { if (c.acc.audience !== 'interno') throw notFound(); const ok = inWorkScope(c.acc, 'budgets.view');
    return listResult(c, c.db.where('changeOrders', (x) => ok(x.workId)).map((x) => coRow(c.db, x)), [{ key: 'folio', label: 'Folio' }, { key: 'work', label: 'Obra' }, { key: 'kind', label: 'Tipo', type: 'status', values: { aditiva: 'Aditiva', deductiva: 'Deductiva' } }, { key: 'changeType', label: 'Cambio', type: 'status', values: CO_TYPE }, { key: 'reason', label: 'Motivo' }, { key: 'signedAmount', label: 'Importe', type: 'money', total: true }, { key: 'status', label: 'Estado', type: 'status', values: CO }, { key: 'effectiveDate', label: 'Vigencia', type: 'date' }], { defaultSort: '-folio', name: 'modificaciones' }); });
  app.get('/api/change-orders/:id', (c) => { const x = c.db.get('changeOrders', c.params.id); if (!x) throw notFound(); guard(c, x.workId);
    return { ...coRow(c.db, x), items: c.db.by('changeOrderItems', 'changeOrderId', x.id).map((i) => ({ ...pick(i, ['id', 'budgetItemId', 'description', 'qtyDelta', 'price', 'amount', 'locationId', 'unitId']), unit: label(c.db, 'units', i.unitId, 'code'), location: locationPath(c.db, i.locationId), budgetItem: label(c.db, 'budgetItems', i.budgetItemId, 'description') })), can: { manage: c.acc.can('budgets.manage', x.workId), approve: c.acc.can('changeorders.approve', x.workId) } }; });
  app.post('/api/works/:id/change-orders', (c) => c.tx('alta_modificacion', (tx) => {
    const w = tx.must('works', c.params.id); c.acc.require('budgets.manage', w.id); const b = req(c.body, ['kind', 'changeType', 'reason']); const items = b.items || [];
    if (!items.length) throw invalid('Agregue al menos una partida afectada.', 'items');
    const sign = b.kind === 'deductiva' ? -1 : 1; let total = '0.00'; const rows = [];
    for (const it of items) {
      req(it, ['description', 'unitId', 'qtyDelta', 'price']);
      if (it.budgetItemId) { const bi = tx.must('budgetItems', it.budgetItemId); if (bi.workId !== w.id) throw invalid('La partida afectada pertenece a otra obra.', 'budgetItemId'); }
      const q = d.norm(it.qtyDelta, 4); if (d.isZero(q)) throw invalid('La cantidad de la modificación no puede ser cero.', 'qtyDelta');
      const qSigned = sign < 0 ? d.neg(d.abs(q, 4), 4) : d.abs(q, 4); const amount = d.lineAmount(qSigned, it.price);
      rows.push({ ...pick(it, ['budgetItemId', 'conceptId', 'locationId', 'description', 'unitId', 'price']), qtyDelta: qSigned, amount }); total = d.add(total, d.abs(amount));
    }
    const co = tx.insert('changeOrders', { workId: w.id, budgetId: currentBudgetVersion(tx, w.id)?.budgetId || null, folio: nextFolio(tx, 'changeOrders', b.kind === 'aditiva' ? 'ADT' : 'DED'), kind: b.kind, changeType: b.changeType, origin: b.origin || null, reason: b.reason, proposerId: c.user.id, status: 'propuesta', amount: total });
    for (const r of rows) tx.insert('changeOrderItems', { ...r, changeOrderId: co.id });
    return { id: co.id, folio: co.folio };
  }));
  app.post('/api/change-orders/:id/decide', (c) => c.tx('decision_modificacion', (tx) => {
    const x = tx.must('changeOrders', c.params.id); const to = c.body.status;
    if (!['en_revision', 'aprobada', 'rechazada', 'cancelada'].includes(to) || ['aprobada', 'rechazada', 'cancelada'].includes(x.status)) throw blocked('La modificación no admite esa decisión.');
    if (to === 'aprobada') {
      c.acc.require('changeorders.approve', x.workId, 'aprobar aditivas y deductivas');
      if (!c.body.clientApprovedByName) throw invalid('Indique quién aprobó por parte del cliente; una propuesta no aceptada no modifica el contrato.', 'clientApprovedByName');
      tx.update('changeOrders', x.id, { status: 'aprobada', effectiveDate: c.body.effectiveDate || tx.now.slice(0, 10), clientApprovedByName: c.body.clientApprovedByName, approvalEvidenceId: c.body.approvalEvidenceId || null, internalApprovedBy: c.user.id });
      tx.insert('approvals', { objectType: 'changeOrder', objectId: x.id, objectVersion: x.recordVersion + 1, decision: 'aprobado', actorId: c.user.id, actorName: c.user.name, at: tx.now, scope: `${x.kind} aprobada por ${c.body.clientApprovedByName}`, valid: true, channel: 'externo', evidenceAttachmentId: c.body.approvalEvidenceId || null });
      // Nota: una deductiva del cliente no reduce lo que DCL debe al contratista por trabajo ya ejecutado.
    } else { c.acc.require('budgets.manage', x.workId); if (to !== 'en_revision') requireReason(c.body, 'esta decisión'); tx.update('changeOrders', x.id, { status: to }); }
    return { id: x.id, status: to };
  }));
}
