// Obligaciones y desembolsos son entidades distintas. "Pagado" exige un movimiento confirmado.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { invalid, forbidden, notFound, blocked } from '../core/errors.js';
import { setting, label, nextFolio, notify, req, requireReason } from './common.js';
import { obligationState, contractorAdvanceBalance, PAY_STATUS } from './ledger.js';

export const D_STATUS = { preparado: 'Preparado', autorizado: 'Autorizado', pendiente_confirmacion: 'Pendiente de confirmación', confirmado: 'Confirmado', rechazado: 'Rechazado', revertido: 'Revertido' };
const KIND_NATURE = { nomina_bancaria: 'parte_del_pago', transferencia: 'parte_del_pago', cheque: 'parte_del_pago', descuento: 'descuento', costo_adicional: 'costo_adicional_dcl' };
export const COMPONENT_KIND = { nomina_bancaria: 'Nómina bancaria', transferencia: 'Transferencia', cheque: 'Cheque', descuento: 'Descuento', anticipo_aplicado: 'Anticipo aplicado', costo_adicional: 'Costo adicional de DCL' };

export function postCash(tx, m) {
  return tx.insert('cashMovements', { flowClass: 'operacion', currency: 'MXN', confirmDate: m.opDate, ...m });
}

function visibleObligation(db, acc, o) {
  if (!o) return false;
  if (acc.audience === 'interno') return o.workId ? acc.inScope('payments.view', o.workId) : acc.canGlobal('payments.view');
  if (acc.audience === 'contratista') return !!acc.partyId && o.beneficiaryId === acc.partyId && o.kind === 'contratista';
  return false;
}
const sourceOf = (db, o) => (o.sourceType === 'cEstimate' ? { type: 'cEstimate', id: o.sourceId, folio: label(db, 'cEstimates', o.sourceId, 'folio') } : o.sourceType === 'expense' ? { type: 'expense', id: o.sourceId, folio: label(db, 'expenses', o.sourceId, 'folio') } : null);
export function obligationRow(db, o) {
  const st = obligationState(db, o);
  return { id: o.id, folio: o.folio, kind: o.kind, beneficiaryId: o.beneficiaryId, beneficiary: label(db, 'parties', o.beneficiaryId), workId: o.workId, work: label(db, 'works', o.workId), period: label(db, 'weekPeriods', o.periodId, 'code'), source: sourceOf(db, o)?.folio || null, sourceType: o.sourceType, sourceId: o.sourceId, dueDate: o.dueDate, status: o.status, currency: o.currency, ...st };
}
const O_COLUMNS = [
  { key: 'folio', label: 'Obligación' }, { key: 'beneficiary', label: 'Beneficiario' }, { key: 'work', label: 'Obra' }, { key: 'source', label: 'Origen' }, { key: 'dueDate', label: 'Vence', type: 'date' },
  { key: 'gross', label: 'Bruto autorizado', type: 'money', total: true }, { key: 'discounts', label: 'Descuentos', type: 'money', total: true }, { key: 'advances', label: 'Anticipos aplicados', type: 'money', total: true },
  { key: 'netPayable', label: 'Neto por pagar', type: 'money', total: true }, { key: 'paid', label: 'Pagado confirmado', type: 'money', total: true }, { key: 'balance', label: 'Saldo', type: 'money', total: true },
  { key: 'payStatus', label: 'Pago', type: 'status', values: PAY_STATUS },
];

// ── Componentes de liquidación (cierre) ──
export function addComponent(tx, acc, obligationId, body) {
  const ob = tx.must('obligations', obligationId);
  acc.require('close.prepare', ob.workId, 'preparar la liquidación');
  req(body, ['kind', 'amount']);
  const nature = KIND_NATURE[body.kind]; if (!nature) throw invalid('Tipo de componente no permitido.', 'kind');
  const amount = d.norm(body.amount); if (!d.isPos(amount)) throw invalid('El importe del componente debe ser mayor que cero.', 'amount');
  if (nature === 'descuento' && (!body.support || body.support.trim().length < 5)) throw invalid('Un descuento requiere su soporte: regla, documento o acuerdo que lo respalda.', 'support', 'Describa el soporte; el descuento se autoriza por separado.');
  const st = obligationState(tx, ob);
  if (nature !== 'costo_adicional_dcl') {
    const proposed = d.sum(tx.by('payComponents', 'obligationId', ob.id).filter((c) => c.status === 'propuesto' && c.nature !== 'costo_adicional_dcl').map((c) => c.amount));
    const room = d.sub(d.sub(st.netPayable, st.bankPlanned), proposed);
    if (d.gt(amount, room)) throw blocked(`El componente (${d.fmtMoney(amount)}) excede lo disponible de la obligación (${d.fmtMoney(room)}).`, [], 'Los componentes son partes del mismo pago; su suma no puede superar el bruto autorizado.');
  }
  const cmp = tx.insert('payComponents', { obligationId, kind: body.kind, nature, amount, support: body.support || null, attachmentId: body.attachmentId || null, status: 'propuesto' });
  if (acc.can('paycomponents.authorize', ob.workId) && body.authorize) tx.update('payComponents', cmp.id, { status: 'autorizado', authorizedBy: acc.user.id });
  else notify(tx, { permission: 'paycomponents.authorize', workId: ob.workId, event: 'componente_por_autorizar', objectType: 'payComponent', objectId: cmp.id, title: `${COMPONENT_KIND[body.kind]} por autorizar en ${ob.folio}` });
  return { id: cmp.id };
}
export function decideComponent(tx, acc, id, body) {
  const cmp = tx.must('payComponents', id); const ob = tx.must('obligations', cmp.obligationId);
  if (body.decision === 'cancelar') {
    acc.require('close.prepare', ob.workId);
    if (cmp.kind === 'anticipo_aplicado') throw blocked('La aplicación de anticipo se revierte desde el anticipo.');
    if (tx.by('paymentInstructions', 'obligationId', ob.id).some((i) => i.status !== 'cancelada')) requireReason(body, 'cancelar un componente ya incluido en un cierre');
    tx.update('payComponents', id, { status: 'cancelado' }); return { id };
  }
  acc.require('paycomponents.authorize', ob.workId, 'autorizar componentes de liquidación');
  if (cmp.status !== 'propuesto') throw blocked('El componente ya fue resuelto.');
  tx.update('payComponents', id, { status: 'autorizado', authorizedBy: acc.user.id });
  return { id };
}
export function applyAdvance(tx, acc, obligationId, body) {
  const ob = tx.must('obligations', obligationId); acc.require('close.prepare', ob.workId, 'aplicar anticipos');
  const adv = tx.must('contractorAdvances', req(body, ['advanceId', 'amount']).advanceId);
  if (adv.partyId !== ob.beneficiaryId) throw invalid('El anticipo pertenece a otro beneficiario.', 'advanceId');
  const amount = d.norm(body.amount); if (!d.isPos(amount)) throw invalid('El importe debe ser mayor que cero.', 'amount');
  const bal = contractorAdvanceBalance(tx, adv);
  if (d.gt(amount, bal)) throw blocked(`El importe supera el saldo disponible del anticipo (${d.fmtMoney(bal)}).`);
  const st = obligationState(tx, ob);
  if (d.gt(amount, st.available)) throw blocked(`El importe supera el saldo disponible de la obligación (${d.fmtMoney(st.available)}).`);
  // Aplicar un anticipo reduce su saldo; no crea otra salida de dinero ni otro gasto.
  const app = tx.insert('advanceApplications', { advanceId: adv.id, obligationId, amount, date: body.date || tx.now.slice(0, 10), status: 'aplicada' });
  tx.insert('payComponents', { obligationId, kind: 'anticipo_aplicado', nature: 'anticipo_aplicado', amount, support: `Aplicación del ${adv.kind} del ${adv.date}`, status: 'autorizado', authorizedBy: acc.user.id, advanceApplicationId: app.id });
  return { id: app.id, advanceBalance: d.sub(bal, amount) };
}

// ── Desembolsos ──
export function prepare(tx, acc, body) {
  req(body, ['date', 'accountId', 'methodId', 'amount']);
  const kind = body.kind || 'pago';
  const apps = body.applications || [];
  const amount = d.norm(body.amount); if (!d.isPos(amount)) throw invalid('El importe del desembolso debe ser mayor que cero.', 'amount');
  const account = tx.must('accounts', body.accountId, 'La cuenta'); const method = tx.must('paymentMethods', body.methodId, 'El medio de pago');
  if (method.kind === 'efectivo' && account.kind !== 'efectivo') throw invalid('Un pago en efectivo sale de una cuenta de efectivo.', 'accountId');
  if (method.kind !== 'efectivo' && account.kind !== 'banco') throw invalid('Transferencias y cheques salen de una cuenta bancaria.', 'accountId');
  let beneficiaryId = body.beneficiaryId || null; let sumApps = '0.00'; const seen = new Set();
  for (const a of apps) {
    const ob = tx.must('obligations', a.obligationId, 'La obligación');
    acc.require('payments.prepare', ob.workId, 'preparar pagos');
    if (seen.has(ob.id)) throw invalid('La misma obligación aparece dos veces en el pago.', 'applications'); seen.add(ob.id);
    if (ob.status !== 'autorizada') throw blocked(`La obligación ${ob.folio} no está autorizada; no admite pagos ordinarios.`, [], 'Si dirección permite adelantar dinero, regístrelo como anticipo.');
    if (beneficiaryId && ob.beneficiaryId !== beneficiaryId) throw invalid('Un pago solo se aplica a obligaciones del mismo beneficiario.', 'applications');
    beneficiaryId = ob.beneficiaryId;
    if (ob.currency !== account.currency) throw blocked('La obligación y la cuenta están en monedas distintas.', [], 'Registre una conversión explícita con tipo de cambio aprobado.');
    const am = d.norm(a.amount); if (!d.isPos(am)) throw invalid('Cada aplicación debe ser mayor que cero.', 'applications');
    const st = obligationState(tx, ob);
    if (d.gt(am, st.available)) throw blocked(`La aplicación a ${ob.folio} (${d.fmtMoney(am)}) excede su saldo disponible (${d.fmtMoney(st.available)}).`, [], 'Reduzca el importe o registre la diferencia como anticipo identificado.');
    sumApps = d.add(sumApps, am);
  }
  if (!apps.length) acc.require('payments.prepare', body.workId || undefined, 'preparar pagos');
  if (!beneficiaryId) throw invalid('Indique el beneficiario del pago.', 'beneficiaryId');
  if (d.gt(sumApps, amount)) throw invalid(`Las aplicaciones (${d.fmtMoney(sumApps)}) superan el importe del pago (${d.fmtMoney(amount)}).`, 'applications');
  if (kind === 'pago' && !d.eq(sumApps, amount)) throw invalid(`El pago (${d.fmtMoney(amount)}) no está aplicado por completo (${d.fmtMoney(sumApps)}).`, 'applications', 'Aplique el total a obligaciones autorizadas o registre el excedente como anticipo.');
  if (kind === 'anticipo') requireReason({ reason: body.note }, 'el anticipo');
  const dups = body.reference ? tx.by('disbursements', 'reference', body.reference).filter((x) => x.accountId === account.id && !['rechazado'].includes(x.status)) : [];
  const similar = tx.by('disbursements', 'beneficiaryId', beneficiaryId).filter((x) => x.date === body.date && d.eq(x.amount, amount) && ['preparado', 'autorizado', 'pendiente_confirmacion', 'confirmado'].includes(x.status));
  const dis = tx.insert('disbursements', { folio: nextFolio(tx, 'disbursements', kind === 'anticipo' ? 'AN' : 'PG'), kind, date: body.date, accountId: account.id, methodId: method.id, beneficiaryId, payeeName: body.payeeName || null, amount, currency: account.currency, reference: body.reference || null, status: 'preparado', duplicateFlag: dups.length || similar.length ? 'posible' : 'ninguno', note: body.note || null });
  for (const a of apps) tx.insert('paymentApplications', { disbursementId: dis.id, obligationId: a.obligationId, amount: d.norm(a.amount), status: 'reservada' });
  for (const iid of body.instructionIds || []) { const ins = tx.get('paymentInstructions', iid); if (ins && ins.status === 'pendiente') tx.update('paymentInstructions', iid, { disbursementId: dis.id }); }
  notify(tx, { permission: 'payments.authorize', event: 'pago_por_autorizar', objectType: 'disbursement', objectId: dis.id, title: `${dis.folio} por autorizar: ${d.fmtMoney(amount)} a ${label(tx, 'parties', beneficiaryId)}` });
  const warnings = [];
  if (dups.length) warnings.push({ type: 'referencia_repetida', message: `La referencia ya se usó en ${dups.map((x) => x.folio).join(', ')}. Revise antes de continuar.` });
  if (similar.length) warnings.push({ type: 'posible_duplicado', message: `Existe otro pago del mismo importe, fecha y beneficiario (${similar.map((x) => x.folio).join(', ')}).` });
  return { id: dis.id, folio: dis.folio, warnings };
}

const appsOf = (db, id) => db.by('paymentApplications', 'disbursementId', id);
function mustDis(tx, acc, id, perm, what) {
  const dis = tx.must('disbursements', id);
  const works = appsOf(tx, id).map((a) => tx.get('obligations', a.obligationId)?.workId).filter(Boolean);
  if (works.length) for (const w of new Set(works)) acc.require(perm, w, what); else acc.require(perm, undefined, what);
  return dis;
}
export function authorizeDis(tx, acc, id, body) {
  const dis = mustDis(tx, acc, id, 'payments.authorize', 'autorizar pagos');
  if (dis.status !== 'preparado') throw blocked('Solo un pago preparado puede autorizarse.');
  if (dis.kind === 'anticipo') acc.require('advances.contractor.authorize', undefined, 'autorizar anticipos a contratistas');
  if (dis.duplicateFlag === 'posible') throw blocked('Este pago tiene una alerta de posible duplicado.', [], 'Revise la alerta y descártela con motivo antes de autorizar.');
  acc.checkLimit('pago', dis.amount);
  tx.update('disbursements', id, { status: 'autorizado', authorizedBy: acc.user.id }, { expectedVersion: body.recordVersion });
  return { id, status: 'autorizado' };
}
export function sendDis(tx, acc, id, body) {
  const dis = mustDis(tx, acc, id, 'payments.prepare');
  if (dis.status !== 'autorizado') throw blocked('Solo un pago autorizado puede marcarse como emitido.');
  tx.update('disbursements', id, { status: 'pendiente_confirmacion', reference: body.reference || dis.reference });
  return { id, status: 'pendiente_confirmacion' };
}
export function confirmDis(tx, acc, id, body) {
  const dis = mustDis(tx, acc, id, 'payments.confirm', 'confirmar pagos');
  if (!['autorizado', 'pendiente_confirmacion'].includes(dis.status)) throw blocked(dis.status === 'preparado' ? 'El pago está preparado pero no autorizado; no puede confirmarse.' : 'Este pago no admite confirmación.');
  const method = tx.get('paymentMethods', dis.methodId);
  const receipt = body.receiptAttachmentId || dis.receiptAttachmentId || null;
  if (method.kind === 'efectivo' && setting(tx, 'policy.cashReceiptRequired', true) && !receipt) throw blocked('El efectivo se confirma con recibo o constancia de entrega.', [], 'Adjunte el recibo firmado o la constancia.');
  if (method.kind !== 'efectivo' && !(body.reference || dis.reference)) throw invalid('Capture la referencia bancaria del movimiento.', 'reference');
  let applied = '0.00';
  for (const a of appsOf(tx, id).filter((x) => x.status === 'reservada')) {
    const ob = tx.must('obligations', a.obligationId);
    if (ob.status !== 'autorizada') throw blocked(`La obligación ${ob.folio} dejó de estar autorizada; el pago no puede confirmarse contra ella.`);
    const st = obligationState(tx, ob);
    if (d.gt(a.amount, st.balance)) throw blocked(`La aplicación a ${ob.folio} supera su saldo actual (${d.fmtMoney(st.balance)}).`, [], 'Corrija las aplicaciones del pago.');
    tx.update('paymentApplications', a.id, { status: 'confirmada' }); applied = d.add(applied, a.amount);
  }
  const date = body.confirmDate || dis.date;
  const mov = postCash(tx, { accountId: dis.accountId, type: 'pago', opDate: dis.date, confirmDate: date, amount: d.neg(dis.amount), currency: dis.currency, counterpartyId: dis.beneficiaryId, counterpartyName: dis.payeeName, reference: body.reference || dis.reference, sourceType: 'disbursement', sourceId: dis.id });
  const rest = d.sub(dis.amount, applied);
  if (d.isPos(rest)) tx.insert('contractorAdvances', { partyId: dis.beneficiaryId, kind: 'anticipo', date: dis.date, amount: rest, currency: dis.currency, disbursementId: dis.id, authorizedBy: dis.authorizedBy, note: dis.note, status: 'vigente' });
  tx.update('disbursements', id, { status: 'confirmado', confirmedAt: tx.now, confirmedBy: acc.user.id, deliveredByName: body.deliveredByName || null, receiptAttachmentId: receipt, reference: body.reference || dis.reference });
  for (const ins of tx.by('paymentInstructions', 'disbursementId', id)) if (ins.status === 'pendiente') tx.update('paymentInstructions', ins.id, { status: 'atendida' });
  return { id, status: 'confirmado', cashMovementId: mov.id };
}
export function rejectDis(tx, acc, id, body) {
  const dis = mustDis(tx, acc, id, 'payments.prepare');
  if (!['preparado', 'autorizado', 'pendiente_confirmacion'].includes(dis.status)) throw blocked('Un pago confirmado no se rechaza: se revierte.');
  requireReason(body, 'el rechazo');
  for (const a of appsOf(tx, id)) if (a.status === 'reservada') tx.update('paymentApplications', a.id, { status: 'liberada' });
  for (const ins of tx.by('paymentInstructions', 'disbursementId', id)) if (ins.status === 'pendiente') tx.update('paymentInstructions', ins.id, { disbursementId: null });
  tx.update('disbursements', id, { status: 'rechazado', reverseReason: body.reason });
  return { id, status: 'rechazado' };
}
// La cancelación de un pago confirmado no elimina nada: genera un reverso y libera las aplicaciones.
export function reverseDis(tx, acc, id, body) {
  const dis = mustDis(tx, acc, id, 'payments.reverse', 'revertir pagos');
  if (dis.status !== 'confirmado' || dis.kind === 'reverso') throw blocked('Solo se revierte un pago confirmado.');
  const reason = requireReason(body, 'el reverso');
  for (const adv of tx.by('contractorAdvances', 'disbursementId', id)) {
    if (tx.by('advanceApplications', 'advanceId', adv.id).some((a) => a.status === 'aplicada')) throw blocked('El anticipo que nació de este pago ya fue aplicado.', [], 'Revierta primero la aplicación del anticipo.');
    tx.update('contractorAdvances', adv.id, { status: 'cancelado' });
  }
  const date = body.date || tx.now.slice(0, 10);
  const rev = tx.insert('disbursements', { folio: nextFolio(tx, 'disbursements', 'RV'), kind: 'reverso', date, accountId: dis.accountId, methodId: dis.methodId, beneficiaryId: dis.beneficiaryId, amount: dis.amount, currency: dis.currency, reference: body.reference || null, status: 'confirmado', confirmedAt: tx.now, confirmedBy: acc.user.id, reversesId: dis.id, reverseReason: reason, duplicateFlag: 'ninguno' });
  const orig = tx.by('cashMovements', 'sourceId', dis.id).find((m) => m.sourceType === 'disbursement');
  postCash(tx, { accountId: dis.accountId, type: 'pago', opDate: date, amount: dis.amount, currency: dis.currency, counterpartyId: dis.beneficiaryId, reference: body.reference || null, sourceType: 'disbursement', sourceId: rev.id, reversesId: orig?.id || null, note: `Reverso de ${dis.folio}: ${reason}` });
  for (const a of appsOf(tx, id)) if (a.status === 'confirmada') tx.update('paymentApplications', a.id, { status: 'revertida' });
  for (const ins of tx.by('paymentInstructions', 'disbursementId', id)) if (ins.status === 'atendida') tx.update('paymentInstructions', ins.id, { status: 'pendiente', disbursementId: null });
  tx.update('disbursements', id, { status: 'revertido', reverseReason: reason });
  return { id, reversalId: rev.id, reversalFolio: rev.folio };
}

export function disRow(db, x) {
  const apps = appsOf(db, x.id);
  return { id: x.id, recordVersion: x.recordVersion, folio: x.folio, kind: x.kind, date: x.date, account: label(db, 'accounts', x.accountId), accountId: x.accountId, method: label(db, 'paymentMethods', x.methodId), methodKind: label(db, 'paymentMethods', x.methodId, 'kind'), beneficiaryId: x.beneficiaryId, beneficiary: label(db, 'parties', x.beneficiaryId), payeeName: x.payeeName, amount: x.amount, reference: x.reference, status: x.status, duplicateFlag: x.duplicateFlag, applied: d.sum(apps.filter((a) => a.status === 'confirmada' || a.status === 'reservada').map((a) => a.amount)), confirmedAt: x.confirmedAt, hasReceipt: !!x.receiptAttachmentId, works: [...new Set(apps.map((a) => db.get('obligations', a.obligationId)?.workId).filter(Boolean))] };
}
const D_COLUMNS = [
  { key: 'folio', label: 'Folio' }, { key: 'date', label: 'Fecha', type: 'date' }, { key: 'beneficiary', label: 'Beneficiario' }, { key: 'method', label: 'Medio' }, { key: 'account', label: 'Cuenta' }, { key: 'reference', label: 'Referencia' },
  { key: 'amount', label: 'Importe', type: 'money', total: true }, { key: 'status', label: 'Estado', type: 'status', values: D_STATUS }, { key: 'kind', label: 'Tipo', type: 'status', values: { pago: 'Pago', anticipo: 'Anticipo', reverso: 'Reverso' } },
];
function visibleDis(db, acc, x) {
  if (acc.audience === 'contratista') return !!acc.partyId && x.beneficiaryId === acc.partyId && ['confirmado', 'revertido'].includes(x.status);
  if (acc.audience !== 'interno') return false;
  const works = disRow(db, x).works;
  return works.length ? works.some((w) => acc.inScope('payments.view', w)) : acc.can('payments.view');
}

export function register(app) {
  app.get('/api/obligations', (c) => {
    let rows = c.db.where('obligations', (o) => visibleObligation(c.db, c.acc, o)).map((o) => obligationRow(c.db, o));
    if (c.query.open === '1') rows = rows.filter((r) => r.status === 'autorizada' && d.isPos(r.balance));
    return listResult(c, rows, O_COLUMNS, { defaultSort: '-folio', name: 'obligaciones', dateField: 'dueDate' });
  });
  app.get('/api/obligations/:id', (c) => {
    const o = c.db.get('obligations', c.params.id); if (!visibleObligation(c.db, c.acc, o)) throw notFound('La obligación');
    const internal = c.acc.audience === 'interno';
    return {
      ...obligationRow(c.db, o), source: sourceOf(c.db, o),
      components: c.db.by('payComponents', 'obligationId', o.id).filter((x) => x.status !== 'cancelado' && (internal || (x.status === 'autorizado' && x.nature !== 'costo_adicional_dcl'))).map((x) => ({ id: x.id, kind: x.kind, nature: x.nature, amount: x.amount, support: x.support, status: x.status, authorizedBy: internal ? label(c.db, 'users', x.authorizedBy) : undefined, attachmentId: internal ? x.attachmentId : undefined })),
      applications: c.db.by('paymentApplications', 'obligationId', o.id).filter((a) => internal || ['confirmada', 'revertida'].includes(a.status)).map((a) => { const x = c.db.get('disbursements', a.disbursementId); return { id: a.id, amount: a.amount, status: a.status, disbursementId: x.id, folio: x.folio, date: x.date, method: label(c.db, 'paymentMethods', x.methodId), disbursementStatus: x.status, reference: x.reference }; }),
      instructions: internal ? c.db.by('paymentInstructions', 'obligationId', o.id).map((i) => ({ id: i.id, medium: i.medium, amount: i.amount, status: i.status, close: label(c.db, 'weeklyCloses', i.closeId, 'folio'), disbursementId: i.disbursementId })) : undefined,
      advancesAvailable: internal ? c.db.by('contractorAdvances', 'partyId', o.beneficiaryId).map((a) => ({ id: a.id, kind: a.kind, date: a.date, amount: a.amount, balance: contractorAdvanceBalance(c.db, a) })).filter((a) => d.isPos(a.balance)) : undefined,
      can: internal ? { prepareClose: c.acc.can('close.prepare', o.workId), authorizeComponent: c.acc.can('paycomponents.authorize', o.workId), pay: c.acc.can('payments.prepare', o.workId) } : {},
    };
  });
  app.post('/api/obligations/:id/components', (c) => c.tx('componente_liquidacion', (tx) => addComponent(tx, c.acc, c.params.id, c.body)));
  app.post('/api/obligations/:id/apply-advance', (c) => c.tx('aplicacion_anticipo', (tx) => applyAdvance(tx, c.acc, c.params.id, c.body)));
  app.post('/api/pay-components/:id/decide', (c) => c.tx('decision_componente', (tx) => decideComponent(tx, c.acc, c.params.id, c.body)));

  app.get('/api/disbursements', (c) => listResult(c, c.db.where('disbursements', (x) => visibleDis(c.db, c.acc, x)).map((x) => disRow(c.db, x)), D_COLUMNS, { defaultSort: '-folio', name: 'pagos', dateField: 'date' }));
  app.get('/api/disbursements/:id', (c) => {
    const x = c.db.get('disbursements', c.params.id); if (!x || !visibleDis(c.db, c.acc, x)) throw notFound('El pago');
    const internal = c.acc.audience === 'interno';
    return {
      ...disRow(c.db, x), note: internal ? x.note : undefined, receiptAttachmentId: x.receiptAttachmentId, deliveredByName: x.deliveredByName, confirmedBy: label(c.db, 'users', x.confirmedBy), authorizedBy: internal ? label(c.db, 'users', x.authorizedBy) : undefined, reverseReason: x.reverseReason, reversesFolio: label(c.db, 'disbursements', x.reversesId, 'folio'),
      applications: appsOf(c.db, x.id).map((a) => { const o = c.db.get('obligations', a.obligationId); return { id: a.id, amount: a.amount, status: a.status, obligationId: o.id, obligation: o.folio, work: label(c.db, 'works', o.workId), source: sourceOf(c.db, o) }; }),
      can: internal ? { authorize: c.acc.can('payments.authorize'), confirm: c.acc.can('payments.confirm'), reverse: c.acc.can('payments.reverse'), prepare: c.acc.can('payments.prepare') } : {},
    };
  });
  app.post('/api/disbursements', (c) => c.tx('preparacion_pago', (tx) => prepare(tx, c.acc, c.body)));
  app.post('/api/disbursements/:id/authorize', (c) => c.tx('autorizacion_pago', (tx) => authorizeDis(tx, c.acc, c.params.id, c.body)));
  app.post('/api/disbursements/:id/send', (c) => c.tx('emision_pago', (tx) => sendDis(tx, c.acc, c.params.id, c.body)));
  app.post('/api/disbursements/:id/confirm', (c) => c.tx('confirmacion_pago', (tx) => confirmDis(tx, c.acc, c.params.id, c.body)));
  app.post('/api/disbursements/:id/reject', (c) => c.tx('rechazo_pago', (tx) => rejectDis(tx, c.acc, c.params.id, c.body)));
  app.post('/api/disbursements/:id/reverse', (c) => c.tx('reverso_pago', (tx) => reverseDis(tx, c.acc, c.params.id, c.body)));
  app.post('/api/disbursements/:id/dismiss-duplicate', (c) => c.tx('descarte_duplicado_pago', (tx) => { mustDis(tx, c.acc, c.params.id, 'payments.authorize'); requireReason(c.body, 'descartar la alerta'); tx.update('disbursements', c.params.id, { duplicateFlag: 'descartado' }); return { id: c.params.id }; }));

  app.get('/api/contractor-advances', (c) => {
    const rows = c.db.where('contractorAdvances', (a) => (c.acc.audience === 'interno' ? c.acc.can('payments.view') : c.acc.audience === 'contratista' && a.partyId === c.acc.partyId))
      .map((a) => ({ id: a.id, party: label(c.db, 'parties', a.partyId), partyId: a.partyId, kind: a.kind, date: a.date, amount: a.amount, balance: contractorAdvanceBalance(c.db, a), status: a.status, origin: label(c.db, 'disbursements', a.disbursementId, 'folio') }));
    return listResult(c, rows, [{ key: 'date', label: 'Fecha', type: 'date' }, { key: 'party', label: 'Contratista' }, { key: 'kind', label: 'Tipo', type: 'status', values: { anticipo: 'Anticipo', prestamo: 'Préstamo' } }, { key: 'origin', label: 'Pago de origen' }, { key: 'amount', label: 'Importe', type: 'money', total: true }, { key: 'balance', label: 'Saldo por aplicar', type: 'money', total: true }, { key: 'status', label: 'Estado', type: 'status', values: { vigente: 'Vigente', cancelado: 'Cancelado' } }], { defaultSort: '-date', name: 'anticipos-contratistas' });
  });
  app.post('/api/contractor-advances/:id/repay', (c) => c.tx('abono_contratista', (tx) => {
    c.acc.require('cash.manage'); const adv = tx.must('contractorAdvances', c.params.id); req(c.body, ['amount', 'date', 'accountId']);
    const amount = d.norm(c.body.amount); if (!d.isPos(amount) || d.gt(amount, contractorAdvanceBalance(tx, adv))) throw invalid('El abono debe ser mayor que cero y no superar el saldo del anticipo.', 'amount');
    const mov = postCash(tx, { accountId: c.body.accountId, type: 'devolucion', opDate: c.body.date, amount, counterpartyId: adv.partyId, reference: c.body.reference || null, sourceType: 'contractorAdvance', sourceId: adv.id, note: 'Abono de contratista a su anticipo o préstamo' });
    return { id: tx.insert('advanceRepayments', { advanceId: adv.id, amount, date: c.body.date, accountId: c.body.accountId, cashMovementId: mov.id, note: c.body.note || null }).id };
  }));
  // Estado de cuenta del contratista: bruto acordado, descuentos, anticipos, pagos confirmados y saldo.
  app.get('/api/contractor/statement', (c) => {
    const partyId = c.acc.audience === 'contratista' ? c.acc.partyId : c.query.partyId;
    if (!partyId) throw notFound(); if (c.acc.audience === 'interno') c.acc.require('payments.view'); else if (c.acc.audience !== 'contratista') throw notFound();
    const rows = c.db.by('obligations', 'beneficiaryId', partyId).filter((o) => o.kind === 'contratista' && visibleObligation(c.db, c.acc, o)).map((o) => obligationRow(c.db, o));
    const t = (k) => d.sum(rows.map((r) => r[k]));
    return { party: label(c.db, 'parties', partyId), obligations: rows, totals: { gross: t('gross'), discounts: t('discounts'), advances: t('advances'), netPayable: t('netPayable'), paid: t('paid'), balance: t('balance') } };
  });
}
export { forbidden };
