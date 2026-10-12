// Estimaciones semanales a contratistas: generación desde avances validados, revisión,
// conformidad por versión, conciliación de observaciones, autorización que congela valores.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { sha256 } from '../core/store.js';
import { invalid, forbidden, notFound, blocked } from '../core/errors.js';
import { setting, label, locationPath, resolveRate, effectiveQty, availableQty, nextFolio, notify, resolveNotifications, req, requireReason, inWorkScope, usersWith } from './common.js';
import { obligationState, PAY_STATUS } from './ledger.js';
import { checkAdjustable, evidenceCount } from './progress.js';

export const STATUS = { borrador: 'Borrador', revision_interna: 'Revisión interna', revision_contratista: 'Revisión del contratista', conciliacion: 'Conciliación de observaciones', lista_autorizar: 'Lista para autorizar', autorizada: 'Autorizada', cerrada: 'Cerrada', cancelada: 'Cancelada' };
export const ITEM_STATUS = { pendiente: 'Pendiente', observada: 'Observada', acordada: 'Acordada', autorizada: 'Autorizada', rechazada: 'Rechazada', diferida: 'Diferida' };
const EDITABLE = ['borrador', 'revision_interna', 'revision_contratista', 'conciliacion', 'lista_autorizar'];
const live = (i) => i.status !== 'rechazada' && i.status !== 'diferida';

const itemsOf = (db, id) => db.by('cEstimateItems', 'estimateId', id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
const allocsOf = (db, itemId) => db.by('executionAllocations', 'itemId', itemId).filter((a) => a.state !== 'liberada');
const obligationOf = (db, est) => db.by('obligations', 'sourceId', est.id).find((o) => o.sourceType === 'cEstimate' && o.status === 'autorizada') || null;

function recalc(tx, estId) {
  const items = itemsOf(tx, estId).filter(live);
  return tx.update('cEstimates', estId, { grossTotal: d.sum(items.filter((i) => i.amount !== null).map((i) => i.amount)) });
}
function validApproval(db, est, item) {
  return db.by('approvals', 'objectId', est.id).find((a) => a.objectType === 'cEstimate' && a.valid && a.itemId === item.id && a.itemRev === item.rev && a.decision === 'aceptado') || null;
}
function invalidateApprovals(tx, est, itemId, reason) {
  for (const a of tx.by('approvals', 'objectId', est.id)) if (a.objectType === 'cEstimate' && a.valid && (a.itemId === itemId || a.itemId === null)) tx.update('approvals', a.id, { valid: false, invalidatedAt: tx.now, invalidatedReason: reason });
}
// Cambio relevante de una partida: nueva revisión, nueva versión del documento si ya se compartió
// y pérdida de vigencia de las aprobaciones afectadas.
function touchItem(tx, est, item, patch, reason) {
  const next = tx.update('cEstimateItems', item.id, { ...patch, rev: item.rev + 1 });
  invalidateApprovals(tx, est, item.id, reason);
  if (est.sentToContractorAt) tx.update('cEstimates', est.id, { version: tx.get('cEstimates', est.id).version + 1 });
  recalc(tx, est.id);
  return next;
}

export function createEstimate(tx, acc, body) {
  req(body, ['workId', 'contractorId', 'periodId']);
  acc.require('cestimates.prepare', body.workId, 'preparar estimaciones');
  const work = tx.must('works', body.workId); const p = tx.must('parties', body.contractorId); const period = tx.must('weekPeriods', body.periodId);
  if (!p.isContractor) throw invalid('La persona seleccionada no es contratista.', 'contractorId');
  const kind = body.kind || 'ordinaria';
  const same = tx.by('cEstimates', 'periodId', period.id).filter((e) => e.workId === work.id && e.contractorId === p.id && e.status !== 'cancelada');
  if (kind === 'ordinaria' && same.some((e) => e.kind === 'ordinaria')) throw blocked(`Ya existe la estimación ordinaria ${same.find((e) => e.kind === 'ordinaria').folio} para esta obra, contratista y semana.`, [], 'Ábrala, o cree un documento complementario indicando el motivo.');
  if (kind === 'complementaria') requireReason({ reason: body.complementReason }, 'el documento complementario');
  const e = tx.insert('cEstimates', { folio: nextFolio(tx, 'cEstimates', `EC-${period.code}`, 'folio', 3), workId: work.id, contractorId: p.id, periodId: period.id, kind, complementReason: body.complementReason || null, version: 1, status: 'borrador', currency: work.currency, grossTotal: '0.00', notes: body.notes || null });
  return { id: e.id, folio: e.folio };
}

// Incorpora ejecución validada todavía no incluida en el circuito de pago. La ejecución física se
// cuenta una sola vez por circuito mediante asignaciones parciales.
export function generate(tx, acc, estId, { groupBy = 'ubicacion' } = {}) {
  const est = tx.must('cEstimates', estId);
  acc.require('cestimates.prepare', est.workId);
  if (!['borrador', 'revision_interna'].includes(est.status)) throw blocked('Solo se incorporan avances mientras la estimación está en borrador o revisión interna.');
  const period = tx.get('weekPeriods', est.periodId);
  const existing = itemsOf(tx, estId);
  let order = existing.length; let added = 0; const late = [];
  const keyOf = (o) => [o.conceptId, o.unitId, o.workType, groupBy === 'ubicacion' ? o.locationId : ''].join('|');
  const byKey = new Map(existing.filter((i) => i.sourceType === 'avance' && i.status === 'pendiente').map((i) => [[i.conceptId, i.unitId, i.workType, i.locationId || ''].join('|'), i]));
  const entries = tx.by('progressEntries', 'workId', est.workId).filter((e) => e.status === 'validado' && e.contractorId === est.contractorId && e.executionDate <= period.endDate && !e.additionalId)
    .sort((a, b) => (a.executionDate < b.executionDate ? -1 : 1));
  for (const e of entries) {
    const avail = availableQty(tx, e, 'contratista');
    if (!d.isPos(avail)) continue;
    if (e.executionDate < period.startDate) late.push(e.id);
    let item = byKey.get(keyOf(e));
    if (!item) {
      const rate = resolveRate(tx, { circuit: 'contratacion', conceptId: e.conceptId, unitId: e.unitId, workId: est.workId, contractorId: est.contractorId, date: period.endDate });
      const unit = tx.get('units', e.unitId);
      item = tx.insert('cEstimateItems', { estimateId: estId, sourceType: 'avance', locationId: groupBy === 'ubicacion' ? e.locationId : null, conceptId: e.conceptId, description: label(tx, 'concepts', e.conceptId), unitId: e.unitId, qty: '0', unitPrice: rate ? rate.price : null, amount: rate ? '0.00' : null, rateSnapshot: rate, method: unit.kind === 'lote' ? 'lote' : unit.kind === 'tiempo' ? 'jornada' : 'cantidad', workType: e.workType, status: 'pendiente', rev: 1, sortOrder: order++ });
      byKey.set(keyOf(e), item);
    }
    tx.insert('executionAllocations', { circuit: 'contratista', progressEntryId: e.id, qty: avail, unitId: e.unitId, docType: 'cEstimate', docId: estId, itemId: item.id, state: 'reservada' });
    const qty = d.add(tx.get('cEstimateItems', item.id).qty, avail, 4);
    item = tx.update('cEstimateItems', item.id, { qty, amount: item.unitPrice !== null ? d.lineAmount(qty, item.unitPrice) : null });
    byKey.set(keyOf(e), item); added++;
  }
  // Jornadas aprobadas del contratista distribuidas a esta obra en el periodo.
  for (const wd of tx.by('workdays', 'periodId', period.id).filter((w) => w.status === 'aprobada' && w.contractorId === est.contractorId)) {
    for (const al of tx.by('workdayAllocations', 'workdayId', wd.id).filter((a) => a.workId === est.workId)) {
      if (tx.by('cEstimateItems', 'workdayId', wd.id).some((i) => live(i) && tx.get('cEstimates', i.estimateId)?.workId === est.workId && tx.get('cEstimates', i.estimateId)?.status !== 'cancelada')) continue;
      const who = label(tx, 'workers', wd.workerId) || label(tx, 'crews', wd.crewId) || 'Cuadrilla';
      tx.insert('cEstimateItems', { estimateId: estId, sourceType: 'jornada', description: `${wd.timeUnit === 'hora' ? 'Horas' : 'Jornadas'} · ${who} · ${wd.date}`, unitId: tx.first('units', (u) => u.code === (wd.timeUnit === 'hora' ? 'hora' : 'jornada'))?.id || null, qty: al.qty, unitPrice: wd.rate, amount: wd.rate !== null ? d.lineAmount(al.qty, wd.rate) : null, rateSnapshot: wd.rate !== null ? { price: wd.rate, origin: 'tarifa de jornada aprobada', currency: est.currency } : null, method: wd.timeUnit === 'hora' ? 'hora' : 'jornada', workType: 'ordinario', status: 'pendiente', rev: 1, workdayId: wd.id, sortOrder: order++ });
      added++;
    }
  }
  // Adicionales validados con costo autorizado y ejecutados por este contratista.
  for (const a of tx.by('additionals', 'workId', est.workId).filter((x) => x.executorId === est.contractorId && x.executed && x.opStatus !== 'rechazado' && x.costStatus === 'autorizado')) {
    if (tx.by('cEstimateItems', 'additionalId', a.id).some((i) => live(i) && tx.get('cEstimates', i.estimateId)?.status !== 'cancelada')) continue;
    tx.insert('cEstimateItems', { estimateId: estId, sourceType: 'adicional', locationId: a.locationId, conceptId: a.conceptId, description: `Adicional ${a.folio}: ${a.description}`, unitId: a.unitId, qty: a.qty || '1', unitPrice: null, amount: a.costAmount, rateSnapshot: { origin: `costo autorizado del adicional ${a.folio}`, authorizedBy: a.costBy, currency: est.currency }, method: 'fijo', workType: 'adicional', status: 'pendiente', rev: 1, additionalId: a.id, sortOrder: order++ });
    added++;
  }
  recalc(tx, estId);
  return { added, lateEntries: late.length, pendingValuation: itemsOf(tx, estId).filter((i) => live(i) && i.amount === null).length };
}

export function addFixedItem(tx, acc, estId, body) {
  const est = tx.must('cEstimates', estId); acc.require('cestimates.authorize', est.workId, 'registrar un importe fijo autorizado');
  if (!EDITABLE.includes(est.status)) throw blocked('La estimación ya no admite cambios.');
  req(body, ['description', 'amount']); const reason = requireReason(body, 'el importe fijo');
  if (!d.isPos(body.amount)) throw invalid('El importe fijo debe ser mayor que cero.', 'amount', 'Los descuentos se registran como componentes de la liquidación, no como partidas negativas.');
  const it = tx.insert('cEstimateItems', { estimateId: estId, sourceType: 'fijo', locationId: body.locationId || null, description: body.description, qty: '1', unitPrice: null, amount: body.amount, rateSnapshot: { origin: 'importe fijo autorizado', reason, authorizedBy: acc.user.id, currency: est.currency }, method: 'fijo', workType: body.workType || 'ordinario', status: 'pendiente', rev: 1, sortOrder: itemsOf(tx, estId).length });
  if (est.sentToContractorAt) { invalidateApprovals(tx, est, null, 'Se agregó una partida'); tx.update('cEstimates', estId, { version: est.version + 1 }); }
  recalc(tx, estId);
  return { id: it.id };
}

function release(tx, item) { for (const a of allocsOf(tx, item.id)) tx.update('executionAllocations', a.id, { state: 'liberada' }); }

export function setItemStatus(tx, acc, estId, itemId, body) {
  const est = tx.must('cEstimates', estId); acc.require('cestimates.prepare', est.workId);
  if (!EDITABLE.includes(est.status)) throw blocked('La estimación ya no admite cambios.', [], 'Use la reapertura con motivo si corresponde.');
  const item = tx.must('cEstimateItems', itemId); if (item.estimateId !== estId) throw notFound('La partida');
  if (!['diferida', 'rechazada'].includes(body.status)) throw invalid('Estado no permitido para esta acción.', 'status');
  const reason = requireReason(body, body.status === 'diferida' ? 'diferir la partida' : 'rechazar la partida');
  release(tx, item);
  touchItem(tx, est, item, { status: body.status }, reason);
  for (const o of tx.by('observations', 'itemId', itemId)) if (o.status === 'abierta') tx.update('observations', o.id, { status: 'resuelta', resolution: 'rechazada', resolvedBy: acc.user.id, resolvedAt: tx.now, resolutionNote: `Partida ${body.status}: ${reason}` });
  return { id: itemId };
}

export function setExceptionalPrice(tx, acc, estId, itemId, body) {
  const est = tx.must('cEstimates', estId); acc.require('rates.exception.approve', est.workId, 'aprobar precios excepcionales');
  if (!EDITABLE.includes(est.status)) throw blocked('La estimación ya no admite cambios.');
  const item = tx.must('cEstimateItems', itemId); if (item.estimateId !== estId || item.method === 'fijo') throw invalid('Esta partida no admite precio unitario.');
  const reason = requireReason(body, 'el precio excepcional'); const price = d.norm(req(body, ['unitPrice']).unitPrice, 4);
  if (!d.isPos(price)) throw invalid('El precio debe ser mayor que cero.', 'unitPrice');
  acc.checkLimit('precio_excepcional', d.lineAmount(item.qty, price));
  touchItem(tx, est, item, { unitPrice: price, amount: d.lineAmount(item.qty, price), rateSnapshot: { price, currency: est.currency, unitId: item.unitId, origin: 'precio excepcional', exceptional: true, reason, approvedBy: acc.user.id, approvedByName: acc.user.name, previous: item.rateSnapshot } }, `Precio excepcional: ${reason}`);
  return { id: itemId };
}

const FLOW = { revision_interna: ['borrador'], revision_contratista: ['revision_interna', 'conciliacion'], borrador: ['revision_interna'], cancelada: ['borrador', 'revision_interna'] };
export function transition(tx, acc, estId, body) {
  const est = tx.must('cEstimates', estId); acc.require('cestimates.prepare', est.workId);
  const to = body.to;
  if (!FLOW[to]?.includes(est.status)) throw blocked(`No es posible pasar de "${STATUS[est.status]}" a "${STATUS[to] || to}".`);
  const items = itemsOf(tx, estId).filter(live);
  if (to !== 'cancelada' && to !== 'borrador' && !items.length) throw blocked('La estimación no tiene partidas.', [], 'Incorpore avances validados antes de enviarla a revisión.');
  const patch = { status: to };
  if (to === 'revision_contratista') {
    if (tx.by('observations', 'estimateId', estId).some((o) => o.status === 'abierta')) throw blocked('Hay observaciones sin resolver.', [], 'Resuelva cada observación antes de reenviar al contratista.');
    patch.sentToContractorAt = tx.now;
    const people = tx.where('users', (u) => u.status === 'activo' && u.partyId === est.contractorId);
    notify(tx, { users: people, workId: est.workId, event: `estimacion_por_revisar_v${est.version}`, objectType: 'cEstimate', objectId: estId, title: `Estimación ${est.folio} (versión ${est.version}) lista para su revisión` });
  }
  if (to === 'cancelada') { requireReason(body, 'la cancelación'); for (const i of itemsOf(tx, estId)) release(tx, i); }
  if (to === 'revision_interna') notify(tx, { permission: 'cestimates.authorize', workId: est.workId, event: 'estimacion_en_revision', objectType: 'cEstimate', objectId: estId, title: `Estimación ${est.folio} en revisión interna` });
  tx.update('cEstimates', estId, patch, { expectedVersion: body.recordVersion });
  return { id: estId, status: to };
}

function afterContractorAction(tx, estId) {
  const est = tx.get('cEstimates', estId); const items = itemsOf(tx, estId).filter(live);
  const open = tx.by('observations', 'estimateId', estId).some((o) => o.status === 'abierta');
  if (open) { if (est.status !== 'conciliacion') tx.update('cEstimates', estId, { status: 'conciliacion' }); return; }
  if (items.length && items.every((i) => i.status === 'acordada')) {
    tx.update('cEstimates', estId, { status: 'lista_autorizar' });
    notify(tx, { permission: 'cestimates.authorize', workId: est.workId, event: `estimacion_lista_v${est.version}`, objectType: 'cEstimate', objectId: estId, title: `Estimación ${est.folio} lista para autorizar` });
  }
}

// Conformidad: identifica persona, fecha y versión exacta; por partida y, si están todas, del documento.
export function accept(tx, acc, estId, body, { external = false } = {}) {
  const est = tx.must('cEstimates', estId);
  if (external) { acc.require('cestimates.prepare', est.workId, 'registrar una conformidad obtenida por otro medio'); requireReason(body, 'el registro de conformidad externa'); if (!body.signerName) throw invalid('Indique quién dio la conformidad.', 'signerName'); }
  else if (!acc.can('cestimates.respond') || acc.partyId !== est.contractorId) throw notFound('La estimación');
  if (!['revision_contratista', 'conciliacion'].includes(est.status)) throw blocked('La estimación no está en revisión del contratista.');
  if (body.version !== undefined && Number(body.version) !== est.version) throw blocked(`Usted revisó la versión ${body.version}, pero la vigente es la ${est.version}.`, [], 'Vuelva a abrir la estimación y revise la versión vigente antes de aceptar.');
  const items = itemsOf(tx, estId).filter((i) => i.status === 'pendiente' && (!body.itemIds || body.itemIds.includes(i.id)));
  if (!items.length) throw blocked('No hay partidas pendientes de aceptar.');
  const unpriced = items.filter((i) => i.amount === null);
  if (unpriced.length) throw blocked('Hay partidas sin tarifa definida; no pueden aceptarse con importe indeterminado.', unpriced.map((i) => i.description));
  for (const i of items) {
    tx.update('cEstimateItems', i.id, { status: 'acordada' });
    tx.insert('approvals', { objectType: 'cEstimate', objectId: estId, objectVersion: est.version, itemId: i.id, itemRev: i.rev, decision: 'aceptado', actorId: acc.user.id, actorName: external ? `${body.signerName} (registrado por ${acc.user.name})` : acc.user.name, at: tx.now, scope: 'partida', valid: true, channel: external ? 'externo' : 'portal', note: external ? body.reason : null, evidenceAttachmentId: body.evidenceAttachmentId || null });
  }
  afterContractorAction(tx, estId);
  const after = tx.get('cEstimates', estId);
  if (after.status === 'lista_autorizar') tx.insert('approvals', { objectType: 'cEstimate', objectId: estId, objectVersion: after.version, itemId: null, itemRev: null, decision: 'aceptado', actorId: acc.user.id, actorName: external ? `${body.signerName} (registrado por ${acc.user.name})` : acc.user.name, at: tx.now, scope: 'documento', valid: true, channel: external ? 'externo' : 'portal', evidenceAttachmentId: body.evidenceAttachmentId || null });
  resolveNotifications(tx, 'cEstimate', estId, `estimacion_por_revisar_v${est.version}`);
  return { id: estId, status: after.status, accepted: items.length };
}

export function observe(tx, acc, estId, body) {
  const est = tx.must('cEstimates', estId);
  if (!acc.can('cestimates.respond') || acc.partyId !== est.contractorId) throw notFound('La estimación');
  if (!['revision_contratista', 'conciliacion'].includes(est.status)) throw blocked('La estimación no está en revisión del contratista.');
  req(body, ['itemId', 'text']);
  const item = tx.must('cEstimateItems', body.itemId); if (item.estimateId !== estId || !live(item)) throw notFound('La partida');
  if (item.status === 'autorizada') throw blocked('La partida ya fue autorizada.');
  if (body.proposedQty !== undefined && body.proposedQty !== null && body.proposedQty !== '' && d.isNeg(body.proposedQty)) throw invalid('La cantidad propuesta no puede ser negativa.', 'proposedQty');
  // El contratista propone; no sobrescribe lo que capturó el supervisor.
  const o = tx.insert('observations', { estimateId: estId, itemId: item.id, allocationId: body.allocationId || null, estimateVersion: est.version, authorId: acc.user.id, proposedQty: body.proposedQty === '' ? null : body.proposedQty ?? null, proposedAmount: body.proposedAmount === '' ? null : body.proposedAmount ?? null, text: body.text, evidenceAttachmentId: body.evidenceAttachmentId || null, status: 'abierta' });
  if (item.status !== 'observada') { tx.update('cEstimateItems', item.id, { status: 'observada' }); invalidateApprovals(tx, est, item.id, 'El contratista registró una observación'); }
  afterContractorAction(tx, estId);
  notify(tx, { permission: 'cestimates.resolve', workId: est.workId, event: 'observacion_contratista', objectType: 'observation', objectId: o.id, title: `Observación del contratista en ${est.folio}`, priority: 'alta' });
  return { id: o.id };
}

// Resolución: compara ambas propuestas y conserva el antes y el después. Un cambio de cantidad se
// registra como ajuste autorizado sobre el avance original (la medición inicial no se borra).
export function resolveObservation(tx, acc, obsId, body) {
  const o = tx.must('observations', obsId); const est = tx.must('cEstimates', o.estimateId);
  acc.require('cestimates.resolve', est.workId, 'resolver observaciones');
  if (o.status !== 'abierta') throw blocked('La observación ya fue resuelta.');
  const item = tx.must('cEstimateItems', o.itemId);
  const resolution = body.resolution; if (!['aceptada', 'parcial', 'rechazada'].includes(resolution)) throw invalid('Indique la resolución: aceptada, parcial o rechazada.', 'resolution');
  const note = requireReason({ reason: body.note }, 'la resolución');
  const before = { qty: item.qty, unitPrice: item.unitPrice, amount: item.amount, rev: item.rev, version: est.version };
  let after = before; let cur = item;
  if (resolution !== 'rechazada') {
    const newQty = d.norm(body.resolvedQty ?? (resolution === 'aceptada' ? o.proposedQty : null) ?? item.qty, 4);
    const delta = d.sub(newQty, item.qty, 4);
    if (!d.isZero(delta)) {
      if (item.sourceType !== 'avance') throw blocked('Esta partida no proviene de una medición; ajuste su importe con un precio o importe autorizado.');
      const allocs = allocsOf(tx, item.id);
      const al = allocs.length === 1 ? allocs[0] : allocs.find((a) => a.id === (body.allocationId || o.allocationId));
      if (!al) throw invalid('La partida agrupa varias ubicaciones: indique a cuál corresponde la corrección.', 'allocationId', 'Seleccione la ubicación cuya medición cambia.');
      const entry = tx.must('progressEntries', al.progressEntryId);
      const entryDelta = d.sub(d.add(al.qty, delta, 4), al.qty, 4);
      if (d.isNeg(d.add(al.qty, delta, 4))) throw invalid('La corrección supera la cantidad de esa ubicación.', 'resolvedQty');
      checkAdjustable(tx, entry, entryDelta, { skipCircuit: 'contratista' });
      tx.insert('progressAdjustments', { entryId: entry.id, qtyDelta: entryDelta, reason: `Conciliación de observación en ${est.folio}: ${note}`, status: 'autorizado', proposedBy: o.authorId, authorizedBy: acc.user.id, authorizedAt: tx.now, observationId: o.id });
      tx.update('executionAllocations', al.id, { qty: d.add(al.qty, delta, 4) });
      cur = touchItem(tx, est, item, { qty: newQty, amount: item.unitPrice !== null ? d.lineAmount(newQty, item.unitPrice) : item.amount, status: 'pendiente' }, 'Cambio de cantidad por conciliación');
    }
    if (body.resolvedUnitPrice !== undefined && body.resolvedUnitPrice !== null && body.resolvedUnitPrice !== '') {
      setExceptionalPrice(tx, acc, est.id, item.id, { unitPrice: body.resolvedUnitPrice, reason: note });
      cur = tx.update('cEstimateItems', item.id, { status: 'pendiente' });
    }
  }
  if (cur.status === 'observada') cur = tx.update('cEstimateItems', item.id, { status: 'pendiente' });
  const e2 = tx.get('cEstimates', est.id);
  after = { qty: cur.qty, unitPrice: cur.unitPrice, amount: cur.amount, rev: cur.rev, version: e2.version };
  tx.update('observations', obsId, { status: 'resuelta', resolution, resolvedQty: cur.qty, resolvedBy: acc.user.id, resolvedAt: tx.now, resolutionNote: note, before, after });
  resolveNotifications(tx, 'observation', obsId);
  if (!tx.by('observations', 'estimateId', est.id).some((x) => x.status === 'abierta')) {
    tx.update('cEstimates', est.id, { status: 'revision_contratista', sentToContractorAt: tx.now });
    notify(tx, { users: tx.where('users', (u) => u.status === 'activo' && u.partyId === est.contractorId), workId: est.workId, event: `estimacion_por_revisar_v${e2.version}`, objectType: 'cEstimate', objectId: est.id, title: `Estimación ${est.folio}: nueva versión ${e2.version} para su aceptación` });
  }
  return { id: obsId, before, after };
}

// Modelo de documento (pantalla, PDF, CSV y fotografía congelada comparten esta única construcción).
export function buildDoc(db, est, { audience = 'interno' } = {}) {
  const items = itemsOf(db, est.id).map((i) => {
    const allocs = allocsOf(db, i.id).map((a) => { const e = db.get('progressEntries', a.progressEntryId); return { id: a.id, entryId: a.progressEntryId, location: locationPath(db, e.locationId), executionDate: e.executionDate, qty: a.qty, state: a.state, evidence: evidenceCount(db, e.id), measuredQty: e.qty, author: audience === 'interno' ? label(db, 'users', e.authorId) : undefined }; });
    const ap = validApproval(db, est, i);
    const locs = [...new Set(allocs.map((a) => a.location))];
    return {
      id: i.id, rev: i.rev, sourceType: i.sourceType, location: i.locationId ? locationPath(db, i.locationId) : locs.length === 1 ? locs[0] : locs.length ? `${locs.length} ubicaciones` : null,
      concept: label(db, 'concepts', i.conceptId), description: i.description, unit: label(db, 'units', i.unitId, 'code'), qty: i.qty, unitPrice: i.unitPrice, amount: i.amount, pendingValuation: i.amount === null,
      method: i.method, workType: i.workType, status: i.status, rate: i.rateSnapshot ? { ...i.rateSnapshot, approvedBy: undefined, authorizedBy: undefined } : null, allocations: allocs,
      approval: ap ? { actorName: ap.actorName, at: ap.at, version: ap.objectVersion, channel: ap.channel } : null,
      observations: db.by('observations', 'itemId', i.id).map((o) => ({ id: o.id, text: o.text, proposedQty: o.proposedQty, proposedAmount: o.proposedAmount, status: o.status, resolution: o.resolution, resolutionNote: o.resolutionNote, before: o.before, after: o.after, author: label(db, 'users', o.authorId), createdAt: o.createdAt, resolvedAt: o.resolvedAt, resolvedBy: label(db, 'users', o.resolvedBy), estimateVersion: o.estimateVersion, allocationId: o.allocationId, evidenceAttachmentId: o.evidenceAttachmentId })),
    };
  });
  const included = items.filter((i) => i.status !== 'rechazada' && i.status !== 'diferida');
  const sumOf = (list) => d.sum(list.filter((i) => i.amount !== null).map((i) => i.amount));
  const conformity = db.by('approvals', 'objectId', est.id).filter((a) => a.objectType === 'cEstimate' && a.itemId === null && a.decision === 'aceptado').sort((a, b) => (a.at < b.at ? 1 : -1))[0] || null;
  const period = db.get('weekPeriods', est.periodId);
  return {
    id: est.id, folio: est.folio, recordVersion: est.recordVersion, workId: est.workId, work: label(db, 'works', est.workId), workCode: label(db, 'works', est.workId, 'code'), contractorId: est.contractorId, contractor: label(db, 'parties', est.contractorId),
    periodId: est.periodId, period: period.code, periodStart: period.startDate, periodEnd: period.endDate, kind: est.kind, complementReason: est.complementReason, version: est.version, status: est.status, currency: est.currency,
    items,
    totals: { gross: sumOf(included), agreed: sumOf(items.filter((i) => i.status === 'acordada')), authorized: est.authorizedTotal, observed: sumOf(items.filter((i) => i.status === 'observada')), excluded: sumOf(items.filter((i) => i.status === 'rechazada' || i.status === 'diferida')), pendingValuation: included.filter((i) => i.pendingValuation).length },
    conformity: conformity ? { actorName: conformity.actorName, at: conformity.at, version: conformity.objectVersion, valid: conformity.valid && conformity.objectVersion === est.version, channel: conformity.channel, invalidatedReason: conformity.invalidatedReason } : null,
    authorizedAt: est.authorizedAt, authorizedBy: label(db, 'users', est.authorizedBy), closeId: est.closeId, closeFolio: label(db, 'weeklyCloses', est.closeId, 'folio'),
  };
}

export function authorize(tx, acc, estId, body) {
  const est = tx.must('cEstimates', estId);
  acc.require('cestimates.authorize', est.workId, 'autorizar estimaciones');
  if (!['lista_autorizar', 'conciliacion', 'revision_contratista', 'revision_interna'].includes(est.status)) throw blocked(`Una estimación en estado "${STATUS[est.status]}" no puede autorizarse.`);
  const items = itemsOf(tx, estId).filter(live);
  const partial = !!setting(tx, 'policy.partialAuthorization', false);
  const needConformity = !!setting(tx, 'policy.conformityRequired', true);
  const include = [], exclude = [], reasons = [];
  for (const i of items) {
    const agreed = i.status === 'acordada' && validApproval(tx, est, i);
    if (i.amount === null) { if (partial) exclude.push([i, 'sin tarifa definida']); else reasons.push(`"${i.description}" no tiene tarifa: no se autoriza con importe cero por omisión.`); continue; }
    if (agreed) { include.push(i); continue; }
    if (i.status === 'observada') { if (partial) exclude.push([i, 'observada por el contratista']); else reasons.push(`"${i.description}" tiene una observación sin resolver.`); continue; }
    if (!needConformity || (body.exceptionReason && String(body.exceptionReason).trim().length >= 5)) { include.push(i); continue; }
    if (partial && body.partial) exclude.push([i, 'sin conformidad vigente']);
    else reasons.push(`"${i.description}" no tiene conformidad vigente del contratista para la revisión actual.`);
  }
  if (reasons.length) throw blocked('La estimación no puede autorizarse todavía.', reasons, partial ? 'Resuelva los pendientes, autorice parcialmente (las partidas sin conformidad quedan diferidas) o registre una excepción con motivo.' : 'Resuelva los pendientes o registre una excepción con motivo.');
  if (!include.length) throw blocked('No hay partidas que puedan autorizarse.', exclude.map(([i, why]) => `${i.description}: ${why}`));
  const total = d.sum(include.map((i) => i.amount));
  acc.checkLimit('estimacion_contratista', total);
  const prevOb = obligationOf(tx, est);
  if (prevOb) {
    const st = obligationState(tx, prevOb);
    const floor = d.add(d.add(st.paid, st.discounts), st.advances);
    if (d.lt(total, floor)) throw blocked(`El nuevo total autorizado (${d.fmtMoney(total)}) queda por debajo de lo ya pagado o aplicado (${d.fmtMoney(floor)}).`, [], 'Registre primero un ajuste compensatorio explícito: revierta el pago excedente o conviértalo en anticipo a favor de DCL.');
  }
  for (const [i, why] of exclude) { release(tx, i); tx.update('cEstimateItems', i.id, { status: 'diferida' }); tx.event('partida_excluida_de_autorizacion', { collection: 'cEstimateItems', objectId: i.id, reason: why }); }
  for (const i of include) {
    if (!validApproval(tx, est, i)) tx.insert('approvals', { objectType: 'cEstimate', objectId: estId, objectVersion: est.version, itemId: i.id, itemRev: i.rev, decision: 'excepcion', actorId: acc.user.id, actorName: acc.user.name, at: tx.now, scope: 'partida autorizada sin conformidad del contratista', valid: true, channel: 'sistema', note: body.exceptionReason || 'La política vigente no exige conformidad' });
    tx.update('cEstimateItems', i.id, { status: 'autorizada' });
    for (const a of allocsOf(tx, i.id)) tx.update('executionAllocations', a.id, { state: 'confirmada' });
    if (i.additionalId) tx.event('adicional_incluido_en_pago', { collection: 'additionals', objectId: i.additionalId });
  }
  tx.insert('approvals', { objectType: 'cEstimate', objectId: estId, objectVersion: est.version, itemId: null, itemRev: null, decision: 'aprobado', actorId: acc.user.id, actorName: acc.user.name, onBehalfOfUserId: acc.delegatedBy('cestimates.authorize'), at: tx.now, scope: exclude.length ? 'autorización parcial' : 'autorización final', valid: true, channel: 'sistema', note: body.exceptionReason || null });
  const upd = tx.update('cEstimates', estId, { status: 'autorizada', authorizedTotal: total, grossTotal: total, authorizedAt: tx.now, authorizedBy: acc.user.id }, { expectedVersion: body.recordVersion });
  // Obligación: nace con la autorización. Pagarla exige un desembolso confirmado.
  let ob = prevOb;
  if (ob) ob = tx.update('obligations', ob.id, { grossAmount: total });
  else ob = tx.insert('obligations', { folio: nextFolio(tx, 'obligations', 'OB'), kind: 'contratista', beneficiaryId: est.contractorId, sourceType: 'cEstimate', sourceId: estId, workId: est.workId, periodId: est.periodId, grossAmount: total, currency: est.currency, dueDate: tx.get('weekPeriods', est.periodId).endDate, status: 'autorizada' });
  // Fotografía congelada y reproducible de lo aprobado en este momento.
  const snapshot = { ...buildDoc(tx, upd), obligationFolio: ob.folio, excluded: exclude.map(([i, why]) => ({ description: i.description, qty: i.qty, amount: i.amount, why })) };
  tx.insert('documentVersions', { docType: 'cEstimate', docId: estId, version: upd.version, reason: body.exceptionReason || null, snapshot, snapshotHash: sha256(JSON.stringify(snapshot)), frozenAt: tx.now, frozenBy: acc.user.id });
  resolveNotifications(tx, 'cEstimate', estId);
  notify(tx, { permission: 'payments.prepare', workId: est.workId, event: `obligacion_autorizada_v${upd.version}`, objectType: 'obligation', objectId: ob.id, title: `Obligación ${ob.folio} autorizada por ${d.fmtMoney(total)}` });
  return { id: estId, status: 'autorizada', authorizedTotal: total, obligationId: ob.id, excluded: exclude.length, version: upd.version };
}

export function reopen(tx, acc, estId, body) {
  const est = tx.must('cEstimates', estId);
  acc.require('cestimates.reopen', est.workId, 'reabrir estimaciones');
  if (!['autorizada', 'cerrada'].includes(est.status)) throw blocked('Solo se reabre una estimación autorizada o cerrada.');
  const reason = requireReason(body, 'la reapertura');
  for (const i of itemsOf(tx, estId)) if (i.status === 'autorizada') { tx.update('cEstimateItems', i.id, { status: 'pendiente', rev: i.rev + 1 }); for (const a of allocsOf(tx, i.id)) tx.update('executionAllocations', a.id, { state: 'reservada' }); }
  for (const a of tx.by('approvals', 'objectId', estId)) if (a.objectType === 'cEstimate' && a.valid) tx.update('approvals', a.id, { valid: false, invalidatedAt: tx.now, invalidatedReason: `Reapertura: ${reason}` });
  tx.update('cEstimates', estId, { status: 'revision_interna', version: est.version + 1, authorizedAt: null, authorizedBy: null, closeId: null });
  tx.event('reapertura_estimacion', { collection: 'cEstimates', objectId: estId, objectVersion: est.version + 1, reason, detail: { fromVersion: est.version, wasClosed: est.status === 'cerrada', closeId: est.closeId } });
  return { id: estId, version: est.version + 1 };
}

// ── Vistas y rutas ──
export function estimateRow(db, e) {
  const ob = obligationOf(db, e); const st = ob ? obligationState(db, ob) : null; const items = itemsOf(db, e.id);
  return {
    id: e.id, folio: e.folio, workId: e.workId, work: label(db, 'works', e.workId), contractorId: e.contractorId, contractor: label(db, 'parties', e.contractorId), periodId: e.periodId, period: label(db, 'weekPeriods', e.periodId, 'code'),
    kind: e.kind, version: e.version, status: e.status, grossTotal: e.grossTotal, authorizedTotal: e.authorizedTotal, items: items.length, observed: items.filter((i) => i.status === 'observada').length,
    pendingValuation: items.filter((i) => live(i) && i.amount === null).length, payStatus: st ? st.payStatus : 'sin_pago', paid: st ? st.paid : '0.00', balance: st ? st.balance : null, updatedAt: e.updatedAt,
  };
}
const COLUMNS = [
  { key: 'folio', label: 'Folio' }, { key: 'period', label: 'Semana' }, { key: 'work', label: 'Obra' }, { key: 'contractor', label: 'Contratista' }, { key: 'version', label: 'Versión', type: 'int' },
  { key: 'status', label: 'Estado', type: 'status', values: STATUS }, { key: 'grossTotal', label: 'Importe', type: 'money', total: true }, { key: 'authorizedTotal', label: 'Autorizado', type: 'money', total: true },
  { key: 'observed', label: 'Observadas', type: 'int' }, { key: 'payStatus', label: 'Pago', type: 'status', values: PAY_STATUS }, { key: 'paid', label: 'Pagado', type: 'money', total: true },
];
const SHARED = ['revision_contratista', 'conciliacion', 'lista_autorizar', 'autorizada', 'cerrada'];
export function visibleEstimate(db, acc, e) {
  if (!e) return false;
  if (acc.audience === 'interno') return acc.inScope('cestimates.view', e.workId);
  // El contratista solo ve sus propios documentos y solo cuando se le compartieron.
  if (acc.audience === 'contratista') return !!acc.partyId && e.contractorId === acc.partyId && SHARED.includes(e.status);
  return false;
}

export function register(app) {
  const get = (c) => { const e = c.db.get('cEstimates', c.params.id); if (!visibleEstimate(c.db, c.acc, e)) throw notFound('La estimación'); return e; };
  app.get('/api/c-estimates', (c) => listResult(c, c.db.where('cEstimates', (e) => visibleEstimate(c.db, c.acc, e)).map((e) => estimateRow(c.db, e)), COLUMNS, { defaultSort: '-folio', name: 'estimaciones-contratistas' }));
  app.post('/api/c-estimates', (c) => c.tx('alta_estimacion_contratista', (tx) => createEstimate(tx, c.acc, c.body)));
  app.get('/api/c-estimates/:id', (c) => {
    const e = get(c); const audience = c.acc.audience; const doc = buildDoc(c.db, e, { audience });
    const ob = obligationOf(c.db, e);
    const internal = audience === 'interno';
    return {
      ...doc, audience,
      obligation: ob ? { id: ob.id, folio: ob.folio, ...obligationState(c.db, ob) } : null,
      versions: c.db.by('documentVersions', 'docId', e.id).filter((v) => v.docType === 'cEstimate').map((v) => ({ version: v.version, frozenAt: v.frozenAt, reason: v.reason })).sort((a, b) => b.version - a.version),
      policy: internal ? { partial: !!setting(c.db, 'policy.partialAuthorization', false), conformityRequired: !!setting(c.db, 'policy.conformityRequired', true) } : undefined,
      can: internal ? { prepare: c.acc.can('cestimates.prepare', e.workId), resolve: c.acc.can('cestimates.resolve', e.workId), authorize: c.acc.can('cestimates.authorize', e.workId), reopen: c.acc.can('cestimates.reopen', e.workId), priceException: c.acc.can('rates.exception.approve', e.workId) }
        : { respond: ['revision_contratista', 'conciliacion'].includes(e.status) },
    };
  });
  app.get('/api/c-estimates/:id/versions/:version', (c) => { const e = get(c); const v = c.db.by('documentVersions', 'docId', e.id).find((x) => x.docType === 'cEstimate' && x.version === Number(c.params.version)); if (!v) throw notFound('La versión'); return { ...v.snapshot, frozenAt: v.frozenAt, snapshotHash: v.snapshotHash }; });
  app.post('/api/c-estimates/:id/generate', (c) => c.tx('incorporar_avances', (tx) => generate(tx, c.acc, c.params.id, c.body)));
  app.post('/api/c-estimates/:id/items', (c) => c.tx('partida_importe_fijo', (tx) => addFixedItem(tx, c.acc, c.params.id, c.body)));
  app.post('/api/c-estimates/:id/items/:itemId/status', (c) => c.tx('estado_partida', (tx) => setItemStatus(tx, c.acc, c.params.id, c.params.itemId, c.body)));
  app.post('/api/c-estimates/:id/items/:itemId/price', (c) => c.tx('precio_excepcional', (tx) => setExceptionalPrice(tx, c.acc, c.params.id, c.params.itemId, c.body)));
  app.post('/api/c-estimates/:id/transition', (c) => c.tx('transicion_estimacion', (tx) => transition(tx, c.acc, c.params.id, c.body)));
  app.post('/api/c-estimates/:id/accept', (c) => c.tx('conformidad_contratista', (tx) => accept(tx, c.acc, c.params.id, c.body)));
  app.post('/api/c-estimates/:id/external-conformity', (c) => c.tx('conformidad_externa', (tx) => accept(tx, c.acc, c.params.id, c.body, { external: true })));
  app.post('/api/c-estimates/:id/observe', (c) => c.tx('observacion_contratista', (tx) => observe(tx, c.acc, c.params.id, c.body)));
  app.post('/api/observations/:id/resolve', (c) => c.tx('resolucion_observacion', (tx) => resolveObservation(tx, c.acc, c.params.id, c.body), { reason: c.body.note }));
  app.post('/api/c-estimates/:id/authorize', (c) => c.tx('autorizacion_estimacion', (tx) => authorize(tx, c.acc, c.params.id, c.body), { reason: c.body.exceptionReason }));
  app.post('/api/c-estimates/:id/reopen', (c) => c.tx('reapertura_estimacion', (tx) => reopen(tx, c.acc, c.params.id, c.body)));
}
export { itemsOf, obligationOf, usersWith, inWorkScope, forbidden };
