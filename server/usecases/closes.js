// Cierre semanal: reúne obras y contratistas del periodo, valida, concilia y emite un cierre con
// folio, versión y fotografía lógica. No ejecuta transferencias: genera instrucciones para tesorería.
import * as d from '../domain/decimal.js';
import { sha256 } from '../core/store.js';
import { notFound, blocked, invalid } from '../core/errors.js';
import { label, effectiveQty, allocatedQty, nextFolio, notify, requireReason, scopedWorks } from './common.js';
import { obligationState } from './ledger.js';
import { estimateRow, itemsOf, obligationOf, STATUS } from './cestimates.js';
import { evidenceCount } from './progress.js';

const priorIncluded = (db, estId) => d.sum(db.by('closeDocuments', 'estimateId', estId).map((x) => x.gross));
const instructed = (db, obId, medium) => d.sum(db.by('paymentInstructions', 'obligationId', obId).filter((i) => i.medium === medium && i.status !== 'cancelada').map((i) => i.amount));

// Conciliación de una obligación: bruto = banco + descuentos + anticipos + efectivo.
export function settlement(db, ob) {
  const st = obligationState(db, ob);
  const check = d.sum([st.bankPlanned, st.discounts, st.advances, st.cashPlanned]);
  return { ...st, difference: d.sub(st.gross, check) };
}

export function board(db, acc, periodId) {
  const period = db.get('weekPeriods', periodId); if (!period) throw notFound('El periodo');
  const ok = (w) => acc.inScope('close.view', w);
  const ests = db.by('cEstimates', 'periodId', periodId).filter((e) => ok(e.workId) && e.status !== 'cancelada');
  const rows = ests.map((e) => {
    const ob = obligationOf(db, e); const st = ob ? settlement(db, ob) : null;
    return { ...estimateRow(db, e), obligationId: ob?.id || null, obligation: ob?.folio || null, settlement: st, closeId: e.closeId, closeFolio: label(db, 'weeklyCloses', e.closeId, 'folio'), pendingDelta: e.status === 'autorizada' && !e.closeId ? d.sub(e.authorizedTotal, priorIncluded(db, e.id)) : null };
  });
  const toClose = rows.filter((r) => r.status === 'autorizada' && !r.closeId);
  const sum = (list, f) => d.sum(list.map(f));
  // Obras activas con supervisor asignado y sin captura (o con borradores) en la semana.
  const works = scopedWorks(db, acc, 'close.view').filter((w) => w.status === 'activa');
  const pendingCapture = works.map((w) => {
    const entries = db.by('progressEntries', 'workId', w.id).filter((e) => e.periodId === periodId);
    const drafts = entries.filter((e) => e.status === 'borrador').length, reported = entries.filter((e) => e.status === 'reportado').length;
    return { workId: w.id, work: w.name, entries: entries.length, drafts, reported };
  }).filter((x) => !x.entries || x.drafts || x.reported);
  return {
    period: { id: period.id, code: period.code, startDate: period.startDate, endDate: period.endDate, cutoffDate: period.cutoffDate, status: period.status },
    estimates: rows,
    progress: { total: rows.length, byStatus: Object.fromEntries(Object.keys(STATUS).map((s) => [s, rows.filter((r) => r.status === s).length])), reviewedPct: rows.length ? d.ratioPct(String(rows.filter((r) => ['autorizada', 'cerrada'].includes(r.status)).length), String(rows.length), 0) : null },
    pendingCapture,
    totals: {
      observedItems: sum(rows, (r) => String(r.observed)).split('.')[0],
      grossToClose: sum(toClose, (r) => r.settlement.gross), discounts: sum(toClose, (r) => r.settlement.discounts), advances: sum(toClose, (r) => r.settlement.advances),
      bank: sum(toClose, (r) => r.settlement.bankPlanned), cash: sum(toClose, (r) => r.settlement.cashPlanned), extraCost: sum(toClose, (r) => r.settlement.extraCost), difference: sum(toClose, (r) => r.settlement.difference),
      authorizedPendingPayment: sum(rows.filter((r) => r.settlement), (r) => r.settlement.balance), bankConfirmed: sum(rows.filter((r) => r.settlement), (r) => r.settlement.paid),
      notAuthorized: sum(rows.filter((r) => !['autorizada', 'cerrada'].includes(r.status)), (r) => r.grossTotal || '0'),
    },
    closes: db.by('weeklyCloses', 'periodId', periodId).map((x) => ({ id: x.id, folio: x.folio, kind: x.kind, version: x.version, status: x.status, closedAt: x.closedAt, closedBy: label(db, 'users', x.closedBy), grossTotal: x.grossTotal, cashTotal: x.cashTotal, bankTotal: x.bankTotal, discountsTotal: x.discountsTotal, advancesTotal: x.advancesTotal, reason: x.reason })),
    checks: validate(db, toClose.map((r) => r.id), rows),
    can: { prepare: acc.can('close.prepare'), confirm: acc.can('close.confirm') },
  };
}

// Validaciones previas al cierre. Cada una indica qué falla, dónde y por qué bloquea.
export function validate(db, estimateIds, boardRows = []) {
  const checks = []; const add = (code, title, problems, blocking = true) => checks.push({ code, title, ok: !problems.length, blocking, problems });
  const ests = estimateIds.map((id) => db.get('cEstimates', id));
  const P = { rates: [], qty: [], evidence: [], conformity: [], sums: [], dup: [], discounts: [], distribution: [] };
  for (const e of ests) {
    const items = itemsOf(db, e.id).filter((i) => i.status === 'autorizada'); const ob = obligationOf(db, e);
    for (const i of items) {
      if (i.amount === null) P.rates.push(`${e.folio}: "${i.description}" sin tarifa definida.`);
      if (!d.isPos(i.qty) || (i.method !== 'fijo' && !i.unitId)) P.qty.push(`${e.folio}: "${i.description}" con cantidad o unidad inválida.`);
      const ap = db.by('approvals', 'objectId', e.id).find((a) => a.objectType === 'cEstimate' && a.valid && a.itemId === i.id && a.itemRev === i.rev);
      if (!ap) P.conformity.push(`${e.folio}: "${i.description}" sin conformidad vigente ni excepción autorizada.`);
      for (const a of db.by('executionAllocations', 'itemId', i.id).filter((x) => x.state !== 'liberada')) {
        const en = db.get('progressEntries', a.progressEntryId);
        if (en.evidenceRequired && !evidenceCount(db, en.id) && !en.evidenceException) P.evidence.push(`${e.folio}: falta evidencia obligatoria del avance del ${en.executionDate} (${i.description}).`);
        if (d.gt(allocatedQty(db, en.id, 'contratista'), effectiveQty(db, en))) P.dup.push(`${e.folio}: el avance del ${en.executionDate} está asignado por más cantidad de la ejecutada.`);
      }
    }
    const total = d.sum(items.filter((i) => i.amount !== null).map((i) => i.amount));
    if (!d.eq(total, e.authorizedTotal || '0')) P.sums.push(`${e.folio}: la suma de partidas (${d.fmtMoney(total)}) no coincide con el total autorizado (${d.fmtMoney(e.authorizedTotal)}).`);
    if (!ob) { P.sums.push(`${e.folio}: no tiene obligación de pago.`); continue; }
    if (!d.eq(ob.grossAmount, e.authorizedTotal || '0')) P.sums.push(`${e.folio}: la obligación ${ob.folio} (${d.fmtMoney(ob.grossAmount)}) difiere del total autorizado.`);
    const st = settlement(db, ob);
    if (st.pendingComponents) P.discounts.push(`${ob.folio}: ${st.pendingComponents} componente(s) o descuento(s) sin autorizar.`);
    for (const cmp of db.by('payComponents', 'obligationId', ob.id)) if (cmp.status === 'autorizado' && cmp.nature === 'descuento' && !cmp.support) P.discounts.push(`${ob.folio}: descuento sin soporte.`);
    if (!d.isZero(st.difference)) P.distribution.push(`${ob.folio}: la distribución no concilia (diferencia ${d.fmtMoney(st.difference)}).`);
    if (d.isNeg(st.cashPlanned)) P.distribution.push(`${ob.folio}: los componentes superan el bruto autorizado.`);
  }
  add('tarifas', 'Tarifas definidas', P.rates);
  add('cantidades', 'Cantidades y unidades válidas', P.qty);
  add('evidencias', 'Evidencias requeridas', P.evidence);
  add('conformidades', 'Conformidades vigentes o excepción autorizada', P.conformity);
  add('sumas', 'Sumas del detalle', P.sums);
  add('asignaciones', 'Sin asignaciones duplicadas de ejecución', P.dup);
  add('descuentos', 'Descuentos y componentes soportados y autorizados', P.discounts);
  add('distribucion', 'Distribución de medios de pago conciliada', P.distribution);
  add('pendientes', 'Pendientes informados', boardRows.filter((r) => !['autorizada', 'cerrada'].includes(r.status)).map((r) => `${r.folio} (${r.work} · ${r.contractor}) sigue en "${STATUS[r.status]}" y quedará fuera de este cierre.`), false);
  return checks;
}

export function confirm(tx, acc, body) {
  acc.require('close.confirm', undefined, 'confirmar el cierre semanal');
  const period = tx.must('weekPeriods', body.periodId, 'El periodo');
  const candidates = tx.by('cEstimates', 'periodId', period.id).filter((e) => e.status === 'autorizada' && !e.closeId && acc.inScope('close.confirm', e.workId) && (!body.estimateIds || body.estimateIds.includes(e.id)));
  if (!candidates.length) throw blocked('No hay estimaciones autorizadas pendientes de cierre en esta semana.');
  const prior = tx.by('weeklyCloses', 'periodId', period.id).filter((x) => x.status === 'emitido');
  const kind = prior.length ? 'complemento' : 'ordinario';
  // Un cierre emitido no se modifica en silencio: lo posterior entra como complemento identificado.
  const reason = kind === 'complemento' ? requireReason(body, 'el complemento del cierre') : body.reason || null;
  const all = tx.by('cEstimates', 'periodId', period.id).filter((e) => e.status !== 'cancelada').map((e) => estimateRow(tx, e));
  const checks = validate(tx, candidates.map((e) => e.id), all);
  const failed = checks.filter((x) => x.blocking && !x.ok);
  if (failed.length) throw blocked('El cierre no puede confirmarse.', failed.flatMap((x) => x.problems), 'Corrija cada punto y vuelva a intentar.');
  const pending = checks.find((x) => x.code === 'pendientes');
  if (!pending.ok && !body.acknowledgePending) throw blocked('Hay documentos que quedarán fuera de este cierre.', pending.problems, 'Confirme que está informado de los pendientes para continuar.');
  const close = tx.insert('weeklyCloses', { folio: nextFolio(tx, 'weeklyCloses', `CS-${period.code}`, 'folio', 2), periodId: period.id, version: prior.length + 1, kind, parentCloseId: prior[0]?.id || null, reason, status: 'emitido', closedAt: tx.now, closedBy: acc.user.id, currency: 'MXN', grossTotal: '0', discountsTotal: '0', advancesTotal: '0', bankTotal: '0', cashTotal: '0', extraCostTotal: '0' });
  const T = { gross: '0.00', discounts: '0.00', advances: '0.00', bank: '0.00', cash: '0.00', extra: '0.00' }; const docs = [];
  for (const e of candidates) {
    const ob = obligationOf(tx, e); const st = settlement(tx, ob);
    const priorGross = priorIncluded(tx, e.id); const first = d.isZero(priorGross);
    const delta = d.sub(e.authorizedTotal, priorGross);
    tx.insert('closeDocuments', { closeId: close.id, estimateId: e.id, estimateVersion: e.version, obligationId: ob.id, gross: delta });
    // Instrucciones por medio: solo lo que no se había instruido en cierres previos.
    const bank = d.sub(st.bankPlanned, instructed(tx, ob.id, 'banco')), cash = d.sub(st.cashPlanned, instructed(tx, ob.id, 'efectivo'));
    if (d.isPos(bank)) tx.insert('paymentInstructions', { closeId: close.id, obligationId: ob.id, beneficiaryId: ob.beneficiaryId, medium: 'banco', amount: bank, status: 'pendiente' });
    if (d.isPos(cash)) tx.insert('paymentInstructions', { closeId: close.id, obligationId: ob.id, beneficiaryId: ob.beneficiaryId, medium: 'efectivo', amount: cash, status: 'pendiente' });
    if (d.isNeg(bank) || d.isNeg(cash)) throw blocked(`La nueva liquidación de ${ob.folio} es menor que lo ya instruido en un cierre anterior.`, [], 'Cancele o revierta primero la instrucción o el pago excedente; el ajuste debe quedar explícito.');
    tx.update('cEstimates', e.id, { status: 'cerrada', closeId: close.id });
    T.gross = d.add(T.gross, delta);
    if (first) { T.discounts = d.add(T.discounts, st.discounts); T.advances = d.add(T.advances, st.advances); }
    T.bank = d.add(T.bank, d.max(bank, '0')); T.cash = d.add(T.cash, d.max(cash, '0')); T.extra = d.add(T.extra, first ? st.extraCost : '0');
    docs.push({ estimateId: e.id, folio: e.folio, version: e.version, work: label(tx, 'works', e.workId), contractor: label(tx, 'parties', e.contractorId), obligation: ob.folio, authorizedTotal: e.authorizedTotal, includedInThisClose: delta, discounts: st.discounts, advances: st.advances, bank: st.bankPlanned, cash: st.cashPlanned, bankInstructed: d.max(bank, '0'), cashInstructed: d.max(cash, '0'),
      components: tx.by('payComponents', 'obligationId', ob.id).filter((x) => x.status === 'autorizado').map((x) => ({ kind: x.kind, nature: x.nature, amount: x.amount, support: x.support })) });
  }
  const recon = d.sub(T.gross, d.sum([T.bank, T.discounts, T.advances, T.cash]));
  if (kind === 'ordinario' && !d.isZero(recon)) throw blocked(`La conciliación del cierre no cuadra (diferencia ${d.fmtMoney(recon)}).`, [], 'Revise los componentes de cada obligación.');
  const upd = tx.update('weeklyCloses', close.id, { grossTotal: T.gross, discountsTotal: T.discounts, advancesTotal: T.advances, bankTotal: T.bank, cashTotal: T.cash, extraCostTotal: T.extra });
  const snapshot = { folio: upd.folio, kind, version: upd.version, period: period.code, periodStart: period.startDate, periodEnd: period.endDate, closedAt: tx.now, closedBy: acc.user.name, reason, parentFolio: prior[0]?.folio || null, totals: { gross: T.gross, discounts: T.discounts, advances: T.advances, bank: T.bank, cash: T.cash, extraCost: T.extra, reconciliation: recon }, documents: docs, pending: pending.problems };
  tx.insert('documentVersions', { docType: 'weeklyClose', docId: close.id, version: upd.version, reason, snapshot, snapshotHash: sha256(JSON.stringify(snapshot)), frozenAt: tx.now, frozenBy: acc.user.id });
  if (kind === 'ordinario') tx.update('weekPeriods', period.id, { status: 'cerrada' });
  tx.event('cierre_semanal', { collection: 'weeklyCloses', objectId: close.id, objectVersion: upd.version, reason, detail: snapshot.totals });
  notify(tx, { permission: 'payments.prepare', event: 'cierre_emitido', objectType: 'weeklyClose', objectId: close.id, title: `Cierre ${upd.folio} emitido: efectivo ${d.fmtMoney(T.cash)}, banco ${d.fmtMoney(T.bank)}`, priority: 'alta' });
  return { id: close.id, folio: upd.folio, kind, totals: snapshot.totals };
}

export function register(app) {
  app.get('/api/periods', (c) => {
    if (c.acc.audience !== 'interno') throw notFound();
    return { items: c.db.all('weekPeriods').sort((a, b) => (a.code < b.code ? 1 : -1)).map((p) => ({ id: p.id, code: p.code, year: p.year, week: p.week, startDate: p.startDate, endDate: p.endDate, cutoffDate: p.cutoffDate, status: p.status })) };
  });
  app.post('/api/periods', (c) => c.tx('alta_periodo', (tx) => {
    c.acc.require('close.prepare'); const { year, week } = c.body; if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) throw invalid('Indique año y número de semana válidos.', 'week');
    const code = `${year}-S${String(week).padStart(2, '0')}`; const ex = tx.by('weekPeriods', 'code', code)[0]; if (ex) return { id: ex.id };
    return import_weekByNumber(tx, year, week, c.body.cutoffDate);
  }));
  app.patch('/api/periods/:id', (c) => c.tx('configuracion_periodo', (tx) => { c.acc.require('close.prepare'); const p = tx.must('weekPeriods', c.params.id); tx.update('weekPeriods', p.id, { cutoffDate: c.body.cutoffDate || p.cutoffDate }, { expectedVersion: c.body.recordVersion }); return { id: p.id }; }));
  app.get('/api/closes/board', (c) => { if (c.acc.audience !== 'interno' || !c.acc.can('close.view')) throw notFound(); return board(c.db, c.acc, c.query.periodId); });
  app.post('/api/closes', (c) => c.tx('cierre_semanal', (tx) => confirm(tx, c.acc, c.body)));
  app.get('/api/closes/:id', (c) => {
    if (c.acc.audience !== 'interno' || !c.acc.can('close.view')) throw notFound();
    const x = c.db.get('weeklyCloses', c.params.id); if (!x) throw notFound('El cierre');
    const v = c.db.by('documentVersions', 'docId', x.id).find((y) => y.docType === 'weeklyClose');
    // Conciliación del total original con el actualizado (complementos y reaperturas se muestran aparte).
    const family = c.db.by('weeklyCloses', 'periodId', x.periodId).sort((a, b) => a.version - b.version);
    return { id: x.id, ...v.snapshot, snapshotHash: v.snapshotHash, status: x.status, family: family.map((f) => ({ id: f.id, folio: f.folio, kind: f.kind, grossTotal: f.grossTotal, reason: f.reason, closedAt: f.closedAt })), familyTotal: d.sum(family.map((f) => f.grossTotal)),
      instructions: c.db.by('paymentInstructions', 'closeId', x.id).map((i) => ({ id: i.id, obligationId: i.obligationId, obligation: label(c.db, 'obligations', i.obligationId, 'folio'), beneficiary: label(c.db, 'parties', i.beneficiaryId), beneficiaryId: i.beneficiaryId, medium: i.medium, amount: i.amount, status: i.status, disbursement: label(c.db, 'disbursements', i.disbursementId, 'folio'), disbursementId: i.disbursementId })) };
  });
}
import { weekByNumber } from '../domain/dates.js';
import { setting } from './common.js';
function import_weekByNumber(tx, year, week, cutoffDate) {
  const w = weekByNumber(year, week, setting(tx, 'week.endOffsetDays', 5));
  return { id: tx.insert('weekPeriods', { year: w.year, week: w.week, code: w.code, startDate: w.start, endDate: w.end, cutoffDate: cutoffDate || w.end, status: 'abierta' }).id };
}
