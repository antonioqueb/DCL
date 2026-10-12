// Cuentas por cobrar: facturas externas registradas, cobros con aplicaciones, anticipos de cliente,
// retenciones, ajustes y gestión de cobranza. Los saldos se calculan de los movimientos.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { invalid, notFound, blocked } from '../core/errors.js';
import { localDate, diffDays } from '../domain/dates.js';
import { setting, label, pick, nextFolio, req, requireReason, inWorkScope } from './common.js';
import { receivableState, clientAdvanceBalance } from './ledger.js';
import { postCash } from './payments.js';
import { kRow } from './kestimates.js';

// Antigüedad calculada con la fecha de vencimiento, no con la de carga.
export function aging(k, r, today) {
  if (r.balance === null || !d.isPos(r.balance)) return null;
  if (!k.dueDate) return 'sin_vencimiento';
  const days = diffDays(today, k.dueDate);
  return days <= 0 ? 'por_vencer' : days <= 30 ? 'vencido_1_30' : days <= 60 ? 'vencido_31_60' : days <= 90 ? 'vencido_61_90' : 'vencido_90_mas';
}
export const AGING = { por_vencer: 'Por vencer', vencido_1_30: 'Vencido 1–30 días', vencido_31_60: 'Vencido 31–60 días', vencido_61_90: 'Vencido 61–90 días', vencido_90_mas: 'Vencido más de 90 días', sin_vencimiento: 'Sin fecha de vencimiento' };

export function receivableRows(db, ok) {
  const today = localDate();
  return db.where('kEstimates', (k) => k.status === 'aprobada' && ok(k.workId)).map((k) => { const r = receivableState(db, k); const row = kRow(db, k); return { ...row, toInvoice: r.toInvoice, adjustments: r.adjustments, aging: aging(k, r, today), overdueDays: k.dueDate && r.balance !== null && d.isPos(r.balance) ? Math.max(0, diffDays(today, k.dueDate)) : null, uncollectible: r.uncollectible,
    dispute: db.by('collectionActions', 'kEstimateId', k.id).some((a) => a.kind === 'disputa' && a.status === 'abierta'), nextFollowUp: db.by('collectionActions', 'kEstimateId', k.id).filter((a) => a.status === 'abierta' && a.followUpDate).map((a) => a.followUpDate).sort()[0] || null }; });
}
// Saldos separados: no se suman factura y estimación como dos cuentas por cobrar.
export function arSummary(db, ok) {
  const rows = receivableRows(db, ok); const open = rows.filter((r) => r.balance !== null && d.isPos(r.balance));
  const advances = db.where('clientAdvances', (a) => ok(a.workId)).map((a) => clientAdvanceBalance(db, a));
  const ret = db.where('retentions', (r) => ok(r.workId) && r.status === 'retenida').map((r) => d.sub(r.amount, d.sum(db.by('retentionReleases', 'retentionId', r.id).map((x) => x.amount))));
  const buckets = {}; for (const k of Object.keys(AGING)) buckets[k] = d.sum(open.filter((r) => r.aging === k).map((r) => r.balance));
  return { approvedBalance: d.sum(open.map((r) => r.balance)), pendingInvoice: d.sum(rows.filter((r) => r.toInvoice !== null).map((r) => r.toInvoice)), advancesAvailable: d.sum(advances), retained: d.sum(ret), overdue: d.sum(open.filter((r) => r.aging && r.aging.startsWith('vencido')).map((r) => r.balance)), overdueCount: open.filter((r) => r.aging && r.aging.startsWith('vencido')).length, buckets, basis: 'Saldo = total aprobado − cobros aplicados − ajustes autorizados. Antigüedad según fecha de vencimiento.' };
}

export function register(app) {
  const guard = (c, perm = 'receivables.view') => { if (c.acc.audience !== 'interno' || !c.acc.can(perm)) throw notFound(); return inWorkScope(c.acc, perm); };
  app.get('/api/receivables', (c) => { const ok = guard(c); const rows = receivableRows(c.db, ok); const cols = [{ key: 'folio', label: 'Estimación' }, { key: 'work', label: 'Obra' }, { key: 'client', label: 'Cliente' }, { key: 'dueDate', label: 'Vence', type: 'date' }, { key: 'total', label: 'Total aprobado', type: 'money', total: true }, { key: 'invoiced', label: 'Facturado', type: 'money', total: true }, { key: 'collected', label: 'Cobrado', type: 'money', total: true }, { key: 'adjustments', label: 'Ajustes', type: 'money', total: true }, { key: 'balance', label: 'Saldo', type: 'money', total: true }, { key: 'aging', label: 'Antigüedad', type: 'status', values: AGING }];
    const res = listResult(c, c.query.open === '1' ? rows.filter((r) => r.balance !== null && d.isPos(r.balance)) : rows, cols, { defaultSort: 'dueDate', name: 'cuentas-por-cobrar' }); if (!res.__file) res.summary = arSummary(c.db, ok); return res; });

  // ── Facturas externas (registro; esto no emite un comprobante fiscal) ──
  app.get('/api/invoices', (c) => { const ok = guard(c); return listResult(c, c.db.where('invoices', (i) => !i.workId || ok(i.workId)).map((i) => ({ ...pick(i, ['id', 'recordVersion', 'folio', 'date', 'subtotal', 'tax', 'total', 'status', 'dueDate', 'attachmentId', 'workId', 'clientId']), client: label(c.db, 'parties', i.clientId), work: label(c.db, 'works', i.workId), linked: d.sum(c.db.by('invoiceLinks', 'invoiceId', i.id).map((l) => l.amount)), estimates: c.db.by('invoiceLinks', 'invoiceId', i.id).map((l) => label(c.db, 'kEstimates', l.kEstimateId, 'folio')).join(', ') })),
    [{ key: 'folio', label: 'Folio' }, { key: 'date', label: 'Fecha', type: 'date' }, { key: 'client', label: 'Cliente' }, { key: 'work', label: 'Obra' }, { key: 'total', label: 'Total', type: 'money', total: true }, { key: 'linked', label: 'Relacionado con estimaciones', type: 'money', total: true }, { key: 'estimates', label: 'Estimaciones' }, { key: 'status', label: 'Estado', type: 'status', values: { registrada: 'Registrada', cancelada: 'Cancelada' } }], { defaultSort: '-date', name: 'facturas', dateField: 'date' }); });
  app.post('/api/invoices', (c) => c.tx('registro_factura', (tx) => {
    guard(c, 'receipts.register'); const b = req(c.body, ['folio', 'clientId', 'date', 'total']);
    const dup = tx.by('invoices', 'folio', b.folio).find((i) => i.clientId === b.clientId && i.status === 'registrada'); if (dup) throw blocked(`Ya existe la factura ${b.folio} de este cliente.`, [], 'Revise si es la misma; no se registran dos veces.');
    // Se registran los impuestos que informa el documento; no se inventa un desglose.
    const inv = tx.insert('invoices', { ...pick(b, ['folio', 'clientId', 'workId', 'date', 'total', 'dueDate', 'attachmentId']), subtotal: b.subtotal === '' ? null : b.subtotal ?? null, tax: b.tax === '' ? null : b.tax ?? null, currency: b.currency || 'MXN', status: 'registrada' });
    if (inv.subtotal !== null && inv.tax !== null && !d.eq(d.add(inv.subtotal, inv.tax), inv.total)) throw invalid('Subtotal más impuestos no coincide con el total de la factura.', 'total');
    for (const l of b.links || []) linkInvoice(tx, inv, l);
    return { id: inv.id };
  }));
  function linkInvoice(tx, inv, l) {
    const k = tx.must('kEstimates', l.kEstimateId, 'La estimación'); if (k.clientId !== inv.clientId) throw invalid('La estimación es de otro cliente.', 'links'); if (k.status !== 'aprobada') throw blocked('Solo se relacionan facturas con estimaciones aprobadas por el cliente.');
    const am = d.norm(l.amount); if (!d.isPos(am)) throw invalid('El importe relacionado debe ser mayor que cero.', 'links');
    const used = d.sum(tx.by('invoiceLinks', 'invoiceId', inv.id).map((x) => x.amount)); if (d.gt(d.add(used, am), inv.total)) throw blocked('Lo relacionado supera el total de la factura.');
    const r = receivableState(tx, k); if (d.gt(am, r.toInvoice)) throw blocked(`Lo relacionado supera lo pendiente de facturar de ${k.folio} (${d.fmtMoney(r.toInvoice)}).`);
    return tx.insert('invoiceLinks', { invoiceId: inv.id, kEstimateId: k.id, amount: am });
  }
  app.post('/api/invoices/:id/links', (c) => c.tx('relacion_factura', (tx) => { guard(c, 'receipts.register'); const inv = tx.must('invoices', c.params.id); if (inv.status !== 'registrada') throw blocked('La factura está cancelada.'); return { id: linkInvoice(tx, inv, c.body).id }; }));
  app.post('/api/invoices/:id/cancel', (c) => c.tx('cancelacion_factura', (tx) => { guard(c, 'receipts.register'); requireReason(c.body, 'la cancelación'); tx.update('invoices', c.params.id, { status: 'cancelada' }); return { ok: true }; }));

  // ── Cobros ──
  const rRow = (db, r) => ({ ...pick(r, ['id', 'folio', 'kind', 'date', 'reference', 'grossAmount', 'commission', 'netAmount', 'commissionNature', 'commissionValidated', 'status', 'note', 'workId', 'clientId']), client: label(db, 'parties', r.clientId), work: label(db, 'works', r.workId), account: label(db, 'accounts', r.accountId), method: label(db, 'paymentMethods', r.methodId), applied: d.sum(db.by('receiptApplications', 'receiptId', r.id).filter((a) => a.status === 'aplicada').map((a) => a.amount)) });
  app.get('/api/receipts', (c) => { const ok = guard(c); return listResult(c, c.db.where('receipts', (r) => !r.workId || ok(r.workId)).map((r) => rRow(c.db, r)),
    [{ key: 'folio', label: 'Folio' }, { key: 'date', label: 'Fecha', type: 'date' }, { key: 'client', label: 'Cliente' }, { key: 'work', label: 'Obra' }, { key: 'kind', label: 'Tipo', type: 'status', values: { cobro: 'Cobro', anticipo: 'Anticipo', devolucion: 'Devolución' } }, { key: 'grossAmount', label: 'Bruto', type: 'money', total: true }, { key: 'commission', label: 'Comisión', type: 'money', total: true }, { key: 'netAmount', label: 'Neto recibido', type: 'money', total: true }, { key: 'applied', label: 'Aplicado', type: 'money', total: true }, { key: 'reference', label: 'Referencia' }, { key: 'status', label: 'Estado', type: 'status', values: { confirmado: 'Confirmado', revertido: 'Revertido' } }], { defaultSort: '-date', name: 'cobros', dateField: 'date' }); });
  app.get('/api/receipts/:id', (c) => { guard(c); const r = c.db.get('receipts', c.params.id); if (!r) throw notFound(); return { ...rRow(c.db, r), applications: c.db.by('receiptApplications', 'receiptId', r.id).map((a) => ({ ...pick(a, ['id', 'amount', 'status', 'kEstimateId']), estimate: label(c.db, 'kEstimates', a.kEstimateId, 'folio') })), advance: c.db.by('clientAdvances', 'receiptId', r.id).map((a) => ({ id: a.id, amount: a.amount, balance: clientAdvanceBalance(c.db, a) }))[0] || null }; });
  app.post('/api/receipts', (c) => c.tx('registro_cobro', (tx) => {
    guard(c, 'receipts.register'); const b = req(c.body, ['date', 'accountId', 'clientId', 'grossAmount']); const kind = b.kind || 'cobro';
    const gross = d.norm(b.grossAmount); if (!d.isPos(gross)) throw invalid('El importe debe ser mayor que cero.', 'grossAmount');
    const commission = b.commission === undefined || b.commission === '' || b.commission === null ? null : d.norm(b.commission);
    if (commission !== null && (d.isNeg(commission) || d.gte(commission, gross))) throw invalid('La comisión debe ser menor que el importe bruto.', 'commission');
    // Bruto, comisión y neto se conservan por separado; la diferencia no se interpreta como cobro faltante.
    const net = commission !== null ? d.sub(gross, commission) : gross;
    if (b.netAmount !== undefined && b.netAmount !== '' && !d.eq(b.netAmount, net)) throw invalid(`Bruto menos comisión (${d.fmtMoney(net)}) no coincide con el neto capturado (${d.fmtMoney(b.netAmount)}).`, 'netAmount', 'Verifique los tres importes contra el documento de origen.');
    if (b.workId && tx.must('works', b.workId).clientId !== b.clientId) throw invalid('La obra no pertenece a ese cliente.', 'workId');
    const dup = b.reference ? tx.by('receipts', 'reference', b.reference).filter((r) => r.clientId === b.clientId && r.status === 'confirmado' && d.eq(r.grossAmount, gross)) : [];
    if (dup.length && !b.confirmDuplicate) throw blocked(`Ya existe un cobro con la misma referencia e importe (${dup[0].folio}).`, [], 'Si es otro cobro distinto, confírmelo expresamente.');
    const r = tx.insert('receipts', { folio: nextFolio(tx, 'receipts', kind === 'anticipo' ? 'AC' : 'CB'), kind, date: b.date, accountId: b.accountId, methodId: b.methodId || null, reference: b.reference || null, clientId: b.clientId, workId: b.workId || null, grossAmount: gross, commission, netAmount: net, commissionNature: commission !== null ? b.commissionNature || 'pendiente de validar' : null, commissionValidated: commission !== null ? !!b.commissionValidated : null, currency: 'MXN', status: 'confirmado', note: b.note || null });
    postCash(tx, { accountId: b.accountId, type: 'cobro', opDate: b.date, amount: net, counterpartyId: b.clientId, reference: b.reference || null, sourceType: 'receipt', sourceId: r.id });
    let applied = '0.00';
    if (kind === 'anticipo') { if (!b.workId) throw invalid('Un anticipo se registra para una obra.', 'workId'); if ((b.applications || []).length) throw invalid('Un anticipo no se aplica directo a estimaciones: se amortiza conforme al contrato.', 'applications');
      // Un anticipo recibido es dinero con saldo por aplicar; no es avance físico ni ingreso por ejecución.
      tx.insert('clientAdvances', { workId: b.workId, clientId: b.clientId, contractId: tx.by('contracts', 'workId', b.workId).find((x) => x.status === 'vigente')?.id || null, receiptId: r.id, amount: gross, currency: 'MXN', status: 'vigente' }); }
    else for (const a of b.applications || []) { applied = d.add(applied, applyReceipt(tx, r, a, applied)); }
    return { id: r.id, folio: r.folio, unapplied: kind === 'cobro' ? d.sub(gross, applied) : '0.00' };
  }));
  function applyReceipt(tx, r, a, already) {
    const k = tx.must('kEstimates', a.kEstimateId, 'La estimación'); if (k.clientId !== r.clientId) throw invalid('La estimación es de otro cliente.', 'applications'); if (k.status !== 'aprobada') throw blocked(`${k.folio} no está aprobada por el cliente; no admite cobros.`, [], 'Si el cliente pagó por adelantado, regístrelo como anticipo.');
    const am = d.norm(a.amount); if (!d.isPos(am)) throw invalid('Cada aplicación debe ser mayor que cero.', 'applications');
    if (d.gt(d.add(already, am), r.grossAmount)) throw blocked('Las aplicaciones superan el importe del cobro.');
    const st = receivableState(tx, k); if (d.gt(am, st.balance)) throw blocked(`La aplicación a ${k.folio} (${d.fmtMoney(am)}) supera su saldo (${d.fmtMoney(st.balance)}).`, [], 'Aplique el excedente a otra estimación o regístrelo como anticipo.');
    tx.insert('receiptApplications', { receiptId: r.id, kEstimateId: k.id, amount: am, status: 'aplicada' }); return am;
  }
  app.post('/api/receipts/:id/apply', (c) => c.tx('aplicacion_cobro', (tx) => { guard(c, 'receipts.register'); const r = tx.must('receipts', c.params.id); if (r.status !== 'confirmado' || r.kind !== 'cobro') throw blocked('Este registro no admite aplicaciones.'); const already = d.sum(tx.by('receiptApplications', 'receiptId', r.id).filter((a) => a.status === 'aplicada').map((a) => a.amount)); applyReceipt(tx, r, c.body, already); return { ok: true }; }));
  app.post('/api/receipts/:id/reverse', (c) => c.tx('reverso_cobro', (tx) => {
    guard(c, 'ar.adjust.authorize'); const r = tx.must('receipts', c.params.id); if (r.status !== 'confirmado') throw blocked('El cobro ya fue revertido.'); const reason = requireReason(c.body, 'el reverso');
    for (const adv of tx.by('clientAdvances', 'receiptId', r.id)) { if (tx.by('clientAdvanceApplications', 'advanceId', adv.id).some((a) => a.status === 'aplicada')) throw blocked('El anticipo de este cobro ya fue amortizado.'); tx.update('clientAdvances', adv.id, { status: 'devuelto' }); }
    for (const a of tx.by('receiptApplications', 'receiptId', r.id)) if (a.status === 'aplicada') tx.update('receiptApplications', a.id, { status: 'revertida' });
    const orig = tx.by('cashMovements', 'sourceId', r.id).find((m) => m.sourceType === 'receipt');
    postCash(tx, { accountId: r.accountId, type: 'cobro', opDate: c.body.date || localDate(), amount: d.neg(r.netAmount), counterpartyId: r.clientId, sourceType: 'receipt', sourceId: r.id, reversesId: orig?.id || null, note: `Reverso de ${r.folio}: ${reason}` });
    tx.update('receipts', r.id, { status: 'revertido' }); return { ok: true };
  }));
  app.post('/api/receipts/:id/commission', (c) => c.tx('naturaleza_comision', (tx) => { guard(c, 'ar.adjust.authorize'); const r = tx.must('receipts', c.params.id); req(c.body, ['commissionNature']); tx.update('receipts', r.id, { commissionNature: c.body.commissionNature, commissionValidated: true }); return { ok: true }; }));

  // ── Anticipos de cliente y retenciones ──
  app.get('/api/client-advances', (c) => { const ok = guard(c); return { items: c.db.where('clientAdvances', (a) => ok(a.workId)).map((a) => { const r = c.db.get('receipts', a.receiptId); return { id: a.id, work: label(c.db, 'works', a.workId), workId: a.workId, client: label(c.db, 'parties', a.clientId), date: r.date, receipt: r.folio, gross: a.amount, commission: r.commission, net: r.netAmount, commissionNature: r.commissionNature, commissionValidated: r.commissionValidated, balance: clientAdvanceBalance(c.db, a), status: a.status, applications: c.db.by('clientAdvanceApplications', 'advanceId', a.id).map((x) => ({ estimate: label(c.db, 'kEstimates', x.kEstimateId, 'folio'), amount: x.amount, date: x.date, status: x.status })) }; }),
    retentions: c.db.where('retentions', (r) => ok(r.workId)).map((r) => { const rel = d.sum(c.db.by('retentionReleases', 'retentionId', r.id).map((x) => x.amount)); return { id: r.id, work: label(c.db, 'works', r.workId), estimate: label(c.db, 'kEstimates', r.kEstimateId, 'folio'), amount: r.amount, released: rel, balance: d.sub(r.amount, rel), status: r.status }; }) }; });
  // Liberar una garantía la convierte en importe exigible; el dinero entra hasta registrar su cobro.
  app.post('/api/retentions/:id/release', (c) => c.tx('liberacion_retencion', (tx) => { guard(c, 'ar.adjust.authorize'); const r = tx.must('retentions', c.params.id); const am = d.norm(req(c.body, ['amount', 'date']).amount); const rel = d.sum(tx.by('retentionReleases', 'retentionId', r.id).map((x) => x.amount));
    if (!d.isPos(am) || d.gt(d.add(rel, am), r.amount)) throw invalid('La liberación debe ser mayor que cero y no superar lo retenido.', 'amount');
    tx.insert('retentionReleases', { retentionId: r.id, amount: am, date: c.body.date, note: c.body.note || null });
    const k = tx.get('kEstimates', r.kEstimateId); tx.update('kEstimates', k.id, { retention: d.sub(k.retention, am), total: d.add(k.total, am) });
    if (d.eq(d.add(rel, am), r.amount)) tx.update('retentions', r.id, { status: 'liberada' }); return { ok: true }; }));

  // ── Ajustes: centavos con tolerancia, notas, incobrables (no borran la deuda) y recuperaciones ──
  app.post('/api/k-estimates/:id/ar-adjustments', (c) => c.tx('ajuste_cxc', (tx) => {
    guard(c, 'receipts.register'); const k = tx.must('kEstimates', c.params.id); const b = req(c.body, ['kind', 'amount']); const reason = requireReason(b, 'el ajuste'); const am = d.norm(b.amount);
    if (!d.isPos(am)) throw invalid('El importe del ajuste debe ser mayor que cero.', 'amount'); const st = receivableState(tx, k);
    if (b.kind === 'centavos') { const tol = setting(tx, 'tolerance.cents', '1.00'); if (d.gt(am, tol)) throw blocked(`Una diferencia de ${d.fmtMoney(am)} supera la tolerancia de centavos (${d.fmtMoney(tol)}).`, [], 'No es un redondeo: regístrela como nota de ajuste con su soporte.'); }
    if (b.kind !== 'recuperacion' && d.gt(am, st.balance)) throw blocked('El ajuste supera el saldo de la estimación.');
    if (b.kind === 'recuperacion' && !b.relatedAdjustmentId) throw invalid('Una recuperación se vincula al ajuste de incobrable que revierte.', 'relatedAdjustmentId');
    return { id: tx.insert('arAdjustments', { kEstimateId: k.id, kind: b.kind, amount: am, reason, status: 'propuesto', proposedBy: c.user.id, relatedAdjustmentId: b.relatedAdjustmentId || null, receiptId: b.receiptId || null }).id };
  }));
  app.post('/api/ar-adjustments/:id/decide', (c) => c.tx('decision_ajuste_cxc', (tx) => { guard(c, 'ar.adjust.authorize'); const a = tx.must('arAdjustments', c.params.id); if (a.status !== 'propuesto') throw blocked('El ajuste ya fue resuelto.'); c.acc.checkLimit('ajuste_saldo', a.amount); tx.update('arAdjustments', a.id, { status: c.body.decision === 'autorizar' ? 'autorizado' : 'rechazado', authorizedBy: c.user.id }); return { ok: true }; }));
  app.get('/api/k-estimates/:id/collection', (c) => { guard(c); const k = c.db.get('kEstimates', c.params.id); if (!k) throw notFound(); return { receivable: receivableState(c.db, k), adjustments: c.db.by('arAdjustments', 'kEstimateId', k.id).map((a) => ({ ...pick(a, ['id', 'kind', 'amount', 'reason', 'status', 'relatedAdjustmentId']), proposedBy: label(c.db, 'users', a.proposedBy), authorizedBy: label(c.db, 'users', a.authorizedBy) })), actions: c.db.by('collectionActions', 'kEstimateId', k.id).map((a) => ({ ...pick(a, ['id', 'kind', 'date', 'followUpDate', 'promiseDate', 'promiseAmount', 'note', 'status']), responsible: label(c.db, 'users', a.responsibleId) })), receipts: c.db.by('receiptApplications', 'kEstimateId', k.id).map((a) => { const r = c.db.get('receipts', a.receiptId); return { folio: r.folio, date: r.date, amount: a.amount, status: a.status, reference: r.reference }; }), invoices: c.db.by('invoiceLinks', 'kEstimateId', k.id).map((l) => { const i = c.db.get('invoices', l.invoiceId); return { folio: i.folio, date: i.date, amount: l.amount, status: i.status }; }), advanceApplications: c.db.by('clientAdvanceApplications', 'kEstimateId', k.id).map((a) => pick(a, ['amount', 'date', 'status'])) }; });
  app.post('/api/k-estimates/:id/collection', (c) => c.tx('gestion_cobranza', (tx) => { guard(c, 'receipts.register'); const k = tx.must('kEstimates', c.params.id); const b = req(c.body, ['kind', 'date']); return { id: tx.insert('collectionActions', { kEstimateId: k.id, responsibleId: b.responsibleId || c.user.id, kind: b.kind, date: b.date, followUpDate: b.followUpDate || null, promiseDate: b.promiseDate || null, promiseAmount: b.promiseAmount || null, note: b.note || null, status: 'abierta' }).id }; }));
  app.post('/api/collection-actions/:id/status', (c) => c.tx('estado_gestion_cobranza', (tx) => { guard(c, 'receipts.register'); tx.update('collectionActions', c.params.id, { status: c.body.status }); return { ok: true }; }));
}
