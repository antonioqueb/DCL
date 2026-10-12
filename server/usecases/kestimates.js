// Estimaciones al cliente: periodo libre, asignaciones de ejecución validada (circuito "cliente",
// independiente del pago al contratista), publicación de una versión exacta y aprobación parcial.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { sha256 } from '../core/store.js';
import { invalid, notFound, blocked, forbidden } from '../core/errors.js';
import { addDays } from '../domain/dates.js';
import { label, pick, locationPath, nextFolio, notify, resolveNotifications, req, requireReason, availableQty, effectiveQty, resolveRate, inWorkScope } from './common.js';
import { receivableState, clientAdvanceBalance } from './ledger.js';
import { currentContract, currentBudgetVersion, tracking } from './budgets.js';
import { evidenceFor } from './attachments.js';

export const STATUS = { borrador: 'Borrador', revision_interna: 'Revisión interna', enviada: 'Enviada al cliente', observada: 'Observada por el cliente', corregida: 'Corregida', aprobada: 'Aprobada por el cliente', cancelada: 'Cancelada', sustituida: 'Sustituida' };
export const I_STATUS = { propuesta: 'Propuesta', aceptada: 'Aceptada', observada: 'Observada', rechazada: 'Rechazada', diferida: 'Diferida' };
const EDITABLE = ['borrador', 'revision_interna', 'observada', 'corregida'];
const itemsOf = (db, id) => db.by('kEstimateItems', 'estimateId', id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
const allocsOf = (db, itemId) => db.by('executionAllocations', 'itemId', itemId).filter((a) => a.state !== 'liberada');

// Resumen económico. Cada base es visible; si el contrato no define una regla, ese importe queda
// "por definir" (null) hasta capturarlo manualmente con motivo. Nunca se supone un porcentaje.
export function compute(db, k, { accepted = false, manual = null } = {}) {
  const items = itemsOf(db, k.id); const contract = db.get('contracts', k.contractId);
  const subtotal = d.sum(items.filter((i) => (accepted ? i.acceptedAmount !== null : !['rechazada', 'diferida'].includes(i.status))).map((i) => (accepted ? i.acceptedAmount : i.amount)));
  const m = manual || k.calc?.manual || {}; const adjustments = k.adjustments || '0.00';
  const base0 = d.add(subtotal, adjustments);
  const lines = []; let taxAmount = null, amortization = null, retention = null;
  if (m.taxAmount !== undefined && m.taxAmount !== null) { taxAmount = d.norm(m.taxAmount); lines.push({ key: 'tax', source: 'captura manual', note: m.reason }); }
  else if (contract && contract.taxRate !== null) { taxAmount = d.pctOf(base0, contract.taxRate); lines.push({ key: 'tax', source: `contrato v${contract.version}`, pct: contract.taxRate, base: base0, baseLabel: 'subtotal más ajustes', label: contract.taxLabel, validated: contract.termsValidated }); }
  const withTax = taxAmount === null ? null : d.add(base0, taxAmount);
  const pctLine = (key, pct, baseKind) => {
    if (m[key] !== undefined && m[key] !== null) { lines.push({ key, source: 'captura manual', note: m.reason }); return d.norm(m[key]); }
    if (!contract || pct === null) { lines.push({ key, source: 'no aplica según contrato' }); return '0.00'; }
    if (baseKind === 'no_definida') { lines.push({ key, source: 'por definir', pct, missing: 'El contrato no indica si la base es antes o después de impuestos.' }); return null; }
    const base = baseKind === 'subtotal' ? base0 : withTax;
    if (base === null) { lines.push({ key, source: 'por definir', pct, missing: 'Depende del impuesto, que aún no está definido.' }); return null; }
    lines.push({ key, source: `contrato v${contract.version}`, pct, base, baseLabel: baseKind === 'subtotal' ? 'subtotal más ajustes (antes de impuestos)' : 'total con impuestos', validated: contract.termsValidated });
    return d.pctOf(base, pct);
  };
  amortization = pctLine('amortization', contract?.amortizationPct ?? null, contract?.amortizationBase);
  if (amortization !== null && m.amortization === undefined) {
    // La amortización nunca excede el anticipo pendiente de aplicar.
    const avail = d.sum(db.by('clientAdvances', 'workId', k.workId).map((a) => clientAdvanceBalance(db, a)));
    const own = d.sum(db.by('clientAdvanceApplications', 'kEstimateId', k.id).filter((a) => a.status === 'aplicada').map((a) => a.amount));
    const cap = d.add(avail, own);
    if (d.gt(amortization, cap)) { lines.push({ key: 'amortization', source: 'tope', note: `Limitada al anticipo pendiente de amortizar (${d.fmtMoney(cap)}).` }); amortization = cap; }
  }
  retention = pctLine('retention', contract?.retentionPct ?? null, contract?.retentionBase);
  if (taxAmount === null) lines.push({ key: 'tax', source: 'por definir', missing: 'El contrato no tiene impuesto configurado y validado.' });
  const total = [taxAmount, amortization, retention].includes(null) ? null : d.sub(d.sub(d.add(base0, taxAmount), amortization), retention);
  return { subtotal, adjustments, taxAmount, amortization, retention, total, lines, rounding: 'Cada partida se redondea a centavos; impuestos, amortización y retención se calculan sobre su base y se redondean a centavos una sola vez.' };
}
function recalc(tx, kId, extra = {}) {
  const k = tx.get('kEstimates', kId); const c = compute(tx, { ...k, ...extra });
  return tx.update('kEstimates', kId, { ...extra, subtotal: c.subtotal, taxAmount: c.taxAmount, amortization: c.amortization, retention: c.retention, total: c.total, calc: { ...(extra.calc || k.calc || {}), lines: c.lines } });
}

// Ejecución validada todavía no incorporada a una estimación comercial (puede ya estar pagada al contratista).
export function billable(db, workId, upTo = null) {
  return db.by('progressEntries', 'workId', workId).filter((e) => e.status === 'validado' && (!upTo || e.executionDate <= upTo)).map((e) => ({ e, avail: availableQty(db, e, 'cliente') })).filter((x) => d.isPos(x.avail))
    .map(({ e, avail }) => ({ entryId: e.id, executionDate: e.executionDate, period: label(db, 'weekPeriods', e.periodId, 'code'), location: locationPath(db, e.locationId), locationId: e.locationId, concept: label(db, 'concepts', e.conceptId), unit: label(db, 'units', e.unitId, 'code'), unitId: e.unitId, available: avail, total: effectiveQty(db, e), budgetItemId: e.budgetItemId, budgetItem: label(db, 'budgetItems', e.budgetItemId, 'description'), workType: e.workType, additionalId: e.additionalId }));
}

function addItem(tx, k, raw, order) {
  const allocs = raw.allocations || []; let unitId = raw.unitId, price = raw.price, description = raw.description, contractedQty = null, prev = '0.0000';
  let bi = null;
  if (raw.budgetItemId) {
    bi = tx.must('budgetItems', raw.budgetItemId, 'La partida de presupuesto'); if (bi.workId !== k.workId) throw invalid('La partida de presupuesto pertenece a otra obra.', 'budgetItemId');
    unitId = bi.unitId; description = description || bi.description; if (price === undefined || price === null || price === '') price = bi.price;
    const row = tracking(tx, k.workId).rows.find((r) => r.id === bi.id); contractedQty = row ? row.currentQty : bi.qty;
    prev = d.sum(tx.by('kEstimateItems', 'budgetItemId', bi.id).filter((i) => i.estimateId !== k.id && tx.get('kEstimates', i.estimateId)?.status === 'aprobada' && i.acceptedQty !== null).map((i) => i.acceptedQty), 4);
  }
  if (raw.additionalId) {
    const a = tx.must('additionals', raw.additionalId); if (a.workId !== k.workId) throw invalid('El adicional pertenece a otra obra.', 'additionalId');
    // Un adicional solo se cobra si el cliente lo aprobó; pagarlo al contratista no lo convierte en venta.
    if (a.saleStatus !== 'aprobado_cliente') throw blocked(`El adicional ${a.folio} no tiene aprobación del cliente para cobrarse.`, [], 'Registre primero la decisión comercial del adicional.');
    description = description || `Adicional ${a.folio}: ${a.description}`; unitId = unitId || a.unitId;
    if (price === undefined || price === null || price === '') { if (!raw.proposedQty) raw.proposedQty = '1'; price = d.div(a.saleAmount, raw.proposedQty, 4); }
  }
  if (!description || !unitId) throw invalid('La partida requiere descripción y unidad.', 'description');
  if ((price === undefined || price === null || price === '') && raw.conceptId) { const r = resolveRate(tx, { circuit: 'comercial', conceptId: raw.conceptId, unitId, workId: k.workId, date: k.periodTo }); price = r?.price; }
  // El precio comercial nunca se copia de la tarifa del contratista.
  if (price === undefined || price === null || price === '') throw invalid(`"${description}" no tiene precio comercial definido.`, 'price', 'Use el precio del presupuesto, una tarifa comercial vigente o captúrelo expresamente.');
  let sumAl = '0.0000';
  for (const a of allocs) {
    const e = tx.must('progressEntries', a.progressEntryId, 'El avance'); if (e.workId !== k.workId || e.status !== 'validado') throw invalid('Solo se estima ejecución validada de esta obra.', 'allocations');
    const q = d.norm(a.qty, 4); if (!d.isPos(q)) throw invalid('La cantidad asignada debe ser mayor que cero.', 'allocations');
    const avail = availableQty(tx, e, 'cliente');
    if (d.gt(q, avail)) throw blocked(`La cantidad asignada (${d.fmtQty(q)}) supera la ejecución disponible para estimar del avance del ${e.executionDate} (${d.fmtQty(avail)}).`, [], 'La ejecución física se cuenta una sola vez en el circuito de cobro.');
    sumAl = d.add(sumAl, q, 4);
  }
  const proposed = raw.proposedQty !== undefined && raw.proposedQty !== null && raw.proposedQty !== '' ? d.norm(raw.proposedQty, 4) : sumAl;
  if (!d.isPos(proposed)) throw invalid('La cantidad propuesta debe ser mayor que cero.', 'proposedQty');
  if (allocs.length && !d.eq(proposed, sumAl) && !(raw.differenceReason && raw.differenceReason.trim().length >= 5)) throw invalid(`La cantidad propuesta (${d.fmtQty(proposed)}) difiere de la ejecución asignada (${d.fmtQty(sumAl)}).`, 'differenceReason', 'Explique la diferencia de medición, alcance o unidad.');
  const item = tx.insert('kEstimateItems', { estimateId: k.id, budgetItemId: bi?.id || null, changeOrderId: raw.changeOrderId || null, additionalId: raw.additionalId || null, conceptId: raw.conceptId || bi?.conceptId || null, chapter: raw.chapter || bi?.chapter || null, locationId: raw.locationId || bi?.locationId || null, description, unitId, contractedQty, prevApprovedQty: prev, proposedQty: proposed, price, amount: d.lineAmount(proposed, price), status: 'propuesta', differenceReason: raw.differenceReason || null, rev: 1, sortOrder: order });
  for (const a of allocs) tx.insert('executionAllocations', { circuit: 'cliente', progressEntryId: a.progressEntryId, qty: a.qty, unitId: tx.get('progressEntries', a.progressEntryId).unitId, docType: 'kEstimate', docId: k.id, itemId: item.id, state: 'reservada' });
  return item;
}
function bump(tx, k) { if (k.publishedVersion !== null && k.publishedVersion === k.version) return tx.update('kEstimates', k.id, { version: k.version + 1, status: ['observada', 'enviada'].includes(k.status) ? 'corregida' : k.status }); return k; }

// ── Modelos de documento ──
export function buildDoc(db, k) {
  const items = itemsOf(db, k.id).map((i) => ({ ...pick(i, ['id', 'rev', 'budgetItemId', 'additionalId', 'chapter', 'description', 'contractedQty', 'prevApprovedQty', 'proposedQty', 'acceptedQty', 'price', 'amount', 'acceptedAmount', 'status', 'differenceReason']), location: locationPath(db, i.locationId), unit: label(db, 'units', i.unitId, 'code'), resultingQty: d.add(i.prevApprovedQty, i.acceptedQty ?? i.proposedQty, 4),
    allocations: allocsOf(db, i.id).map((a) => { const e = db.get('progressEntries', a.progressEntryId); return { id: a.id, entryId: e.id, executionDate: e.executionDate, period: label(db, 'weekPeriods', e.periodId, 'code'), location: locationPath(db, e.locationId), qty: a.qty, state: a.state }; }) }));
  const c = compute(db, k, { accepted: k.status === 'aprobada' });
  const contract = db.get('contracts', k.contractId);
  return { id: k.id, recordVersion: k.recordVersion, folio: k.folio, number: k.number, workId: k.workId, work: label(db, 'works', k.workId), clientId: k.clientId, client: label(db, 'parties', k.clientId), periodFrom: k.periodFrom, periodTo: k.periodTo, version: k.version, publishedVersion: k.publishedVersion, status: k.status, currency: k.currency, docDateDeclared: k.docDateDeclared, dueDate: k.dueDate, approvedAt: k.approvedAt, notes: k.notes,
    items, summary: c, contract: contract ? pick(contract, ['code', 'version', 'termsValidated', 'taxLabel']) : null };
}
// Vista exacta del cliente: sin costos, márgenes, notas internas, autores ni datos del contratista.
export function clientDoc(db, k) {
  const doc = buildDoc(db, k); const t = tracking(db, k.workId);
  const evidence = []; const generators = []; const seen = new Set();
  const ev = (l, location) => { const at = db.get('attachments', l.attachmentId); if (at && at.confidentiality === 'operativo') evidence.push({ id: at.id, name: at.originalName, mime: at.mime, caption: l.caption, location, isImage: at.mime.startsWith('image/'), hasThumb: !!at.hasThumb, takenAtDeclared: at.takenAtDeclared }); };
  for (const l of db.by('evidenceLinks', 'objectId', k.id)) if (l.objectType === 'kEstimate' && l.clientVisible) ev(l, null);
  for (const i of doc.items) for (const a of i.allocations) {
    if (seen.has(a.entryId)) continue; seen.add(a.entryId);
    for (const l of db.by('evidenceLinks', 'objectId', a.entryId)) if (l.objectType === 'progressEntry' && l.clientVisible) ev(l, a.location);
    const g = db.by('generatorLines', 'entryId', a.entryId).sort((x, y) => x.sortOrder - y.sortOrder);
    if (g.length) generators.push({ item: i.description, location: a.location, executionDate: a.executionDate, lines: g.map((x) => pick(x, ['label', 'length', 'width', 'height', 'pieces', 'deduction', 'result', 'formula'])) });
  }
  const plans = [];
  for (const al of db.by('annotationLinks', 'objectId', k.id).filter((x) => x.objectType === 'kEstimate')) { const an = db.get('planAnnotations', al.annotationId); const pv = an && db.get('planVersions', an.planVersionId); if (!pv) continue; const p = db.get('plans', pv.planId); plans.push({ plan: p.name, version: pv.version, attachmentId: pv.attachmentId, page: an.page, shape: an.shape, points: an.points.p, label: an.label }); }
  return {
    id: k.id, folio: doc.folio, number: doc.number, work: doc.work, client: doc.client, periodFrom: doc.periodFrom, periodTo: doc.periodTo, version: doc.version, status: doc.status, currency: doc.currency, dueDate: doc.dueDate, approvedAt: doc.approvedAt,
    items: doc.items.map((i) => ({ ...pick(i, ['id', 'chapter', 'description', 'location', 'unit', 'contractedQty', 'prevApprovedQty', 'proposedQty', 'acceptedQty', 'resultingQty', 'price', 'amount', 'acceptedAmount', 'status']), sources: i.allocations.map((a) => ({ executionDate: a.executionDate, location: a.location, qty: a.qty })) })),
    summary: { ...pick(doc.summary, ['subtotal', 'adjustments', 'taxAmount', 'amortization', 'retention', 'total', 'rounding']), lines: doc.summary.lines.map((l) => pick(l, ['key', 'pct', 'base', 'baseLabel', 'label', 'missing'])) },
    budget: { version: t.budgetVersion?.version ?? null, ...pick(t.summary, ['original', 'additivesApproved', 'deductivesApproved', 'current']) },
    evidence, generators, plans,
  };
}

function visible(db, acc, k) {
  if (!k) return false;
  if (acc.audience === 'interno') return acc.inScope('kestimates.view', k.workId);
  return acc.audience === 'cliente' && !!acc.partyId && k.clientId === acc.partyId && k.publishedVersion !== null;
}
const publishedSnapshot = (db, k) => db.by('documentVersions', 'docId', k.id).find((v) => v.docType === 'kEstimateClient' && v.version === k.publishedVersion)?.snapshot || null;
export function kRow(db, k) { const r = receivableState(db, k); return { id: k.id, folio: k.folio, number: k.number, workId: k.workId, work: label(db, 'works', k.workId), clientId: k.clientId, client: label(db, 'parties', k.clientId), periodFrom: k.periodFrom, periodTo: k.periodTo, version: k.version, publishedVersion: k.publishedVersion, status: k.status, subtotal: k.subtotal, total: k.total, dueDate: k.dueDate, invoiceStatus: r.invoiceStatus, collectStatus: r.collectStatus, collected: r.collected, balance: r.balance, invoiced: r.invoiced }; }
const COLUMNS = [{ key: 'folio', label: 'Folio' }, { key: 'work', label: 'Obra' }, { key: 'client', label: 'Cliente' }, { key: 'periodFrom', label: 'Desde', type: 'date' }, { key: 'periodTo', label: 'Hasta', type: 'date' }, { key: 'version', label: 'Versión', type: 'int' }, { key: 'status', label: 'Estado', type: 'status', values: STATUS }, { key: 'subtotal', label: 'Subtotal propuesto', type: 'money', total: true }, { key: 'total', label: 'Total', type: 'money', total: true },
  { key: 'invoiceStatus', label: 'Facturación', type: 'status', values: { no_aplica: '—', sin_factura: 'Sin factura', parcial: 'Parcial', facturada: 'Facturada' } }, { key: 'collectStatus', label: 'Cobranza', type: 'status', values: { no_aplica: '—', sin_cobro: 'Sin cobro', parcial: 'Parcial', cobrada: 'Cobrada' } }, { key: 'balance', label: 'Saldo', type: 'money', total: true }];

function freezeForClient(tx, k, userId) {
  const snap = clientDoc(tx, k); const internal = buildDoc(tx, k);
  tx.insert('documentVersions', { docType: 'kEstimateClient', docId: k.id, version: k.version, reason: null, snapshot: snap, snapshotHash: sha256(JSON.stringify(snap)), frozenAt: tx.now, frozenBy: userId });
  tx.insert('documentVersions', { docType: 'kEstimate', docId: k.id, version: k.version, reason: null, snapshot: internal, snapshotHash: sha256(JSON.stringify(internal)), frozenAt: tx.now, frozenBy: userId });
}

// Aprobación (total o parcial). Lo rechazado o diferido libera su ejecución para revisión posterior
// sin volver a contarse como ejecución nueva. No altera lo pagado al contratista.
function approve(tx, k, decisions, actor) {
  const items = itemsOf(tx, k.id);
  for (const i of items) {
    const dec = decisions?.find((x) => x.itemId === i.id) || { status: 'aceptada' };
    if (!['aceptada', 'rechazada', 'diferida'].includes(dec.status)) throw invalid('Decisión de partida no válida.', 'items');
    let accepted = dec.status === 'aceptada' ? d.norm(dec.acceptedQty ?? i.proposedQty, 4) : '0.0000';
    if (d.isNeg(accepted) || d.gt(accepted, i.proposedQty)) throw invalid(`La cantidad aceptada de "${i.description}" debe estar entre 0 y la propuesta.`, 'items');
    let surplus = d.sub(d.sum(allocsOf(tx, i.id).map((a) => a.qty), 4), accepted, 4);
    for (const a of allocsOf(tx, i.id).reverse()) {
      if (d.isPos(surplus)) { const cut = d.min(surplus, a.qty, 4); surplus = d.sub(surplus, cut, 4); if (d.eq(cut, a.qty)) { tx.update('executionAllocations', a.id, { state: 'liberada' }); continue; } tx.update('executionAllocations', a.id, { qty: d.sub(a.qty, cut, 4), state: 'confirmada' }); }
      else tx.update('executionAllocations', a.id, { state: 'confirmada' });
    }
    tx.update('kEstimateItems', i.id, { acceptedQty: accepted, acceptedAmount: d.lineAmount(accepted, i.price), status: dec.status === 'aceptada' && d.lt(accepted, i.proposedQty) ? 'observada' : dec.status });
  }
  const c = compute(tx, k, { accepted: true });
  if (c.total === null) throw blocked('El total de la estimación no puede determinarse.', c.lines.filter((l) => l.missing).map((l) => l.missing), 'Defina las condiciones del contrato o capture los importes pendientes con su motivo antes de registrar la aprobación.');
  const contract = tx.get('contracts', k.contractId);
  tx.update('kEstimates', k.id, { status: 'aprobada', approvedAt: tx.now, approvedSubtotal: c.subtotal, subtotal: c.subtotal, taxAmount: c.taxAmount, amortization: c.amortization, retention: c.retention, total: c.total, calc: { ...(k.calc || {}), lines: c.lines }, dueDate: contract && contract.dueDays !== null ? addDays(tx.now.slice(0, 10), contract.dueDays) : k.dueDate });
  // La amortización reduce el anticipo pendiente; no es un cobro nuevo ni un ingreso bancario.
  let rest = c.amortization;
  for (const adv of tx.by('clientAdvances', 'workId', k.workId).filter((a) => a.status === 'vigente')) { if (!d.isPos(rest)) break; const use = d.min(rest, clientAdvanceBalance(tx, adv)); if (d.isPos(use)) { tx.insert('clientAdvanceApplications', { advanceId: adv.id, kEstimateId: k.id, amount: use, date: tx.now.slice(0, 10), status: 'aplicada' }); rest = d.sub(rest, use); } }
  if (d.isPos(rest)) throw blocked(`La amortización (${d.fmtMoney(c.amortization)}) supera el anticipo disponible.`, [], 'Corrija la amortización de esta estimación.');
  if (d.isPos(c.retention)) tx.insert('retentions', { kEstimateId: k.id, workId: k.workId, amount: c.retention, status: 'retenida' });
  tx.insert('approvals', { objectType: 'kEstimate', objectId: k.id, objectVersion: k.version, decision: 'aceptado', actorId: actor.userId, actorName: actor.name, at: tx.now, scope: items.length === (decisions || items).filter((x) => !x.status || x.status === 'aceptada').length ? 'aprobación del cliente' : 'aprobación parcial del cliente', valid: true, channel: actor.channel, note: actor.note || null, evidenceAttachmentId: actor.evidenceAttachmentId || null });
  const fin = tx.get('kEstimates', k.id); const snap = buildDoc(tx, fin);
  tx.insert('documentVersions', { docType: 'kEstimateApproved', docId: k.id, version: k.version, reason: null, snapshot: snap, snapshotHash: sha256(JSON.stringify(snap)), frozenAt: tx.now, frozenBy: actor.userId });
  resolveNotifications(tx, 'kEstimate', k.id);
  notify(tx, { permission: 'receipts.register', workId: k.workId, event: `estimacion_cliente_aprobada_v${k.version}`, objectType: 'kEstimate', objectId: k.id, title: `${k.folio} aprobada por el cliente: ${d.fmtMoney(c.total)} por cobrar` });
  return { id: k.id, status: 'aprobada', total: c.total };
}

export function register(app) {
  const getK = (c) => { const k = c.db.get('kEstimates', c.params.id); if (!visible(c.db, c.acc, k)) throw notFound('La estimación'); return k; };
  const edit = (tx, c) => { const k = tx.must('kEstimates', c.params.id); c.acc.require('kestimates.prepare', k.workId, 'preparar estimaciones al cliente'); if (!EDITABLE.includes(k.status)) throw blocked(`Una estimación "${STATUS[k.status]}" no se edita.`, [], k.status === 'enviada' ? 'Espere la respuesta del cliente o retírela para corregir.' : 'Cree una estimación nueva.'); return k; };
  app.get('/api/k-estimates', (c) => {
    const rows = c.db.where('kEstimates', (k) => visible(c.db, c.acc, k)).map((k) => kRow(c.db, k));
    if (c.acc.audience === 'cliente') return listResult(c, rows.map((r) => ({ ...pick(r, ['id', 'folio', 'work', 'periodFrom', 'periodTo', 'status', 'total', 'dueDate', 'collected', 'balance']), version: r.publishedVersion })), COLUMNS.filter((x) => ['folio', 'work', 'periodFrom', 'periodTo', 'version', 'status', 'total', 'balance'].includes(x.key)), { defaultSort: '-folio', name: 'estimaciones' });
    return listResult(c, rows, COLUMNS, { defaultSort: '-folio', name: 'estimaciones-cliente', dateField: 'periodTo' });
  });
  app.get('/api/works/:id/billable', (c) => { if (c.acc.audience !== 'interno' || !c.acc.inScope('kestimates.view', c.params.id)) throw notFound(); return { items: billable(c.db, c.params.id, c.query.upTo || null), budgetItems: (() => { const bv = currentBudgetVersion(c.db, c.params.id); return bv ? c.db.by('budgetItems', 'budgetVersionId', bv.id).filter((i) => i.status === 'vigente').map((i) => ({ id: i.id, label: `${i.chapter ? i.chapter + ' · ' : ''}${i.description}`, unitId: i.unitId, unit: label(c.db, 'units', i.unitId, 'code'), price: i.price })) : []; })() }; });
  app.post('/api/k-estimates', (c) => c.tx('alta_estimacion_cliente', (tx) => {
    const b = req(c.body, ['workId', 'periodFrom', 'periodTo']); c.acc.require('kestimates.prepare', b.workId); const w = tx.must('works', b.workId);
    if (!w.clientId) throw blocked('La obra no tiene cliente asignado.'); if (b.periodTo < b.periodFrom) throw invalid('El periodo termina antes de empezar.', 'periodTo');
    const n = Math.max(0, ...tx.by('kEstimates', 'workId', w.id).filter((k) => k.status !== 'cancelada').map((k) => k.number)) + 1;
    const k = tx.insert('kEstimates', { folio: `EK-${w.code}-${String(n).padStart(2, '0')}`, workId: w.id, clientId: w.clientId, contractId: currentContract(tx, w.id)?.id || null, number: n, periodFrom: b.periodFrom, periodTo: b.periodTo, version: 1, status: 'borrador', currency: w.currency, subtotal: '0', adjustments: '0', docDateDeclared: b.docDateDeclared || null, notes: b.notes || null });
    recalc(tx, k.id); return { id: k.id, folio: k.folio };
  }));
  app.get('/api/k-estimates/:id', (c) => {
    const k = getK(c);
    if (c.acc.audience === 'cliente') { const snap = publishedSnapshot(c.db, k); if (!snap) throw notFound('La estimación'); const r = receivableState(c.db, k);
      // El cliente ve la versión que se le publicó, no una que cambió después.
      return { ...snap, status: k.status === 'corregida' || k.status === 'observada' ? 'observada' : k.status, currentVersionPublished: k.publishedVersion === k.version, receivable: pick(r, ['total', 'collected', 'balance']), observations: c.db.by('clientObservations', 'estimateId', k.id).map((o) => pick(o, ['id', 'text', 'authorName', 'at', 'status', 'response', 'estimateVersion'])), audience: 'cliente', can: { respond: k.status === 'enviada' && k.publishedVersion === k.version } }; }
    const doc = buildDoc(c.db, k);
    return { ...doc, audience: 'interno', receivable: receivableState(c.db, k), evidence: evidenceFor(c.db, c.acc, 'kEstimate', k.id), observations: c.db.by('clientObservations', 'estimateId', k.id), approvals: c.db.by('approvals', 'objectId', k.id).filter((a) => a.objectType === 'kEstimate').map((a) => pick(a, ['actorName', 'at', 'objectVersion', 'scope', 'channel', 'valid', 'note'])),
      versions: c.db.by('documentVersions', 'docId', k.id).filter((v) => v.docType === 'kEstimateClient').map((v) => ({ version: v.version, frozenAt: v.frozenAt })), calcManual: k.calc?.manual || null,
      can: { prepare: c.acc.can('kestimates.prepare', k.workId), publish: c.acc.can('kestimates.publish', k.workId), editable: EDITABLE.includes(k.status) } };
  });
  app.get('/api/k-estimates/:id/client-preview', (c) => { const k = getK(c); if (c.acc.audience !== 'interno') throw notFound(); return clientDoc(c.db, k); });
  app.get('/api/k-estimates/:id/versions/:version', (c) => { const k = getK(c); const type = c.acc.audience === 'cliente' ? 'kEstimateClient' : c.query.view === 'cliente' ? 'kEstimateClient' : 'kEstimate'; const v = c.db.by('documentVersions', 'docId', k.id).find((x) => x.docType === type && x.version === Number(c.params.version)); if (!v || (c.acc.audience === 'cliente' && v.version > k.publishedVersion)) throw notFound('La versión'); return { ...v.snapshot, frozenAt: v.frozenAt, snapshotHash: v.snapshotHash }; });
  app.post('/api/k-estimates/:id/items', (c) => c.tx('partida_estimacion_cliente', (tx) => { const k = edit(tx, c); const i = addItem(tx, k, c.body, itemsOf(tx, k.id).length); bump(tx, tx.get('kEstimates', k.id)); recalc(tx, k.id); return { id: i.id }; }));
  // Propuesta automática: agrupa la ejecución disponible por partida de presupuesto, conservando sus asignaciones.
  app.post('/api/k-estimates/:id/generate', (c) => c.tx('incorporar_ejecucion_cliente', (tx) => {
    const k = edit(tx, c); const avail = billable(tx, k.workId, k.periodTo).filter((x) => x.budgetItemId && x.workType !== 'adicional'); const groups = new Map();
    for (const a of avail) { if (!groups.has(a.budgetItemId)) groups.set(a.budgetItemId, []); groups.get(a.budgetItemId).push(a); }
    let n = itemsOf(tx, k.id).length, added = 0;
    for (const [budgetItemId, list] of groups) { if (itemsOf(tx, k.id).some((i) => i.budgetItemId === budgetItemId)) continue; addItem(tx, k, { budgetItemId, allocations: list.map((a) => ({ progressEntryId: a.entryId, qty: a.available })) }, n++); added++; }
    recalc(tx, k.id); return { added, withoutBudgetItem: billable(tx, k.workId, k.periodTo).filter((x) => !x.budgetItemId).length };
  }));
  app.del('/api/k-estimates/:id/items/:itemId', (c) => c.tx('retiro_partida_cliente', (tx) => { const k = edit(tx, c); const i = tx.must('kEstimateItems', c.params.itemId); if (i.estimateId !== k.id) throw notFound(); for (const a of allocsOf(tx, i.id)) tx.update('executionAllocations', a.id, { state: 'liberada' }); tx.remove('kEstimateItems', i.id); bump(tx, tx.get('kEstimates', k.id)); recalc(tx, k.id); return { ok: true }; }));
  app.patch('/api/k-estimates/:id', (c) => c.tx('edicion_estimacion_cliente', (tx) => {
    const k = edit(tx, c); const patch = pick(c.body, ['periodFrom', 'periodTo', 'notes', 'docDateDeclared', 'dueDate']);
    if (c.body.adjustments !== undefined) { if (!d.isZero(c.body.adjustments)) requireReason(c.body, 'el ajuste comercial'); patch.adjustments = c.body.adjustments; }
    if (c.body.manual !== undefined) { if (c.body.manual) requireReason({ reason: c.body.manual.reason }, 'la captura manual de impuestos, amortización o retención'); patch.calc = { ...(k.calc || {}), manual: c.body.manual }; }
    tx.update('kEstimates', k.id, patch, { expectedVersion: c.body.recordVersion }); bump(tx, tx.get('kEstimates', k.id)); recalc(tx, k.id); return { id: k.id };
  }));
  app.post('/api/k-estimates/:id/transition', (c) => c.tx('transicion_estimacion_cliente', (tx) => {
    const k = tx.must('kEstimates', c.params.id); const to = c.body.to;
    if (to === 'revision_interna' && k.status === 'borrador') { c.acc.require('kestimates.prepare', k.workId); if (!itemsOf(tx, k.id).length) throw blocked('La estimación no tiene partidas.'); tx.update('kEstimates', k.id, { status: to }); }
    else if (to === 'borrador' && k.status === 'revision_interna') { c.acc.require('kestimates.prepare', k.workId); tx.update('kEstimates', k.id, { status: to }); }
    else if (to === 'enviada' && ['revision_interna', 'corregida'].includes(k.status)) {
      // Publicar congela exactamente lo que verá el cliente.
      c.acc.require('kestimates.publish', k.workId, 'publicar al cliente'); if (!itemsOf(tx, k.id).length) throw blocked('La estimación no tiene partidas.');
      const upd = tx.update('kEstimates', k.id, { status: 'enviada', publishedVersion: k.version }); freezeForClient(tx, upd, c.user.id);
      tx.event('publicacion_estimacion_cliente', { collection: 'kEstimates', objectId: k.id, objectVersion: k.version });
      notify(tx, { users: tx.where('users', (u) => u.status === 'activo' && u.partyId === k.clientId), workId: k.workId, event: `estimacion_publicada_v${k.version}`, objectType: 'kEstimate', objectId: k.id, title: `Estimación ${k.folio} (versión ${k.version}) disponible para su revisión` });
    } else if (to === 'observada' && k.status === 'enviada') { c.acc.require('kestimates.publish', k.workId); requireReason(c.body, 'retirar la estimación para corregirla'); tx.update('kEstimates', k.id, { status: 'observada' }); }
    else if (to === 'cancelada' && !['aprobada', 'cancelada'].includes(k.status)) { c.acc.require('kestimates.publish', k.workId); requireReason(c.body, 'la cancelación'); for (const i of itemsOf(tx, k.id)) for (const a of allocsOf(tx, i.id)) tx.update('executionAllocations', a.id, { state: 'liberada' }); tx.update('kEstimates', k.id, { status: 'cancelada' }); }
    else throw blocked(`No es posible pasar de "${STATUS[k.status]}" a "${STATUS[to] || to}".`);
    return { id: k.id, status: to };
  }));
  // Portal del cliente: acepta una versión identificada o formula observaciones.
  app.post('/api/k-estimates/:id/respond', (c) => c.tx('respuesta_cliente', (tx) => {
    const k = tx.must('kEstimates', c.params.id); if (!c.acc.can('kestimates.respond') || c.acc.partyId !== k.clientId || k.publishedVersion === null) throw notFound('La estimación');
    if (k.status !== 'enviada') throw blocked('Esta estimación no está pendiente de su respuesta.');
    if (Number(c.body.version) !== k.publishedVersion || k.publishedVersion !== k.version) throw blocked(`La versión que revisó (${c.body.version}) no es la vigente.`, [], 'Abra de nuevo el documento y revise la versión publicada más reciente.');
    if (c.body.decision === 'observar') { req(c.body, ['text']); tx.insert('clientObservations', { estimateId: k.id, itemId: c.body.itemId || null, estimateVersion: k.version, text: c.body.text, authorName: c.user.name, authorUserId: c.user.id, at: tx.now, status: 'abierta' }); tx.update('kEstimates', k.id, { status: 'observada' }); notify(tx, { permission: 'kestimates.prepare', workId: k.workId, event: `observacion_cliente_v${k.version}`, objectType: 'kEstimate', objectId: k.id, title: `El cliente observó ${k.folio}`, priority: 'alta' }); return { id: k.id, status: 'observada' }; }
    // Constancia operativa con identidad y fecha; no es una firma electrónica certificada.
    return approve(tx, k, c.body.items, { userId: c.user.id, name: c.user.name, channel: 'portal' });
  }));
  app.post('/api/k-estimates/:id/register-approval', (c) => c.tx('aprobacion_cliente_externa', (tx) => {
    const k = tx.must('kEstimates', c.params.id); c.acc.require('kestimates.publish', k.workId, 'registrar la aprobación del cliente'); if (k.status !== 'enviada') throw blocked('Solo se registra la aprobación de una estimación enviada.');
    if (!c.body.approvedByName) throw invalid('Indique quién aprobó por parte del cliente.', 'approvedByName'); const reason = requireReason(c.body, 'el medio por el que se obtuvo la aprobación');
    return approve(tx, k, c.body.items, { userId: c.user.id, name: `${c.body.approvedByName} (registrado por ${c.user.name})`, channel: 'externo', note: reason, evidenceAttachmentId: c.body.evidenceAttachmentId || null });
  }));
  app.post('/api/client-observations/:id/answer', (c) => c.tx('respuesta_observacion_cliente', (tx) => { const o = tx.must('clientObservations', c.params.id); const k = tx.get('kEstimates', o.estimateId); c.acc.require('kestimates.prepare', k.workId); req(c.body, ['response']); tx.update('clientObservations', o.id, { status: 'atendida', response: c.body.response }); return { ok: true }; }));
}
export { itemsOf, forbidden, inWorkScope };
