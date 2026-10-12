// Saldos calculados a partir de movimientos y aplicaciones. Ningún saldo es un campo editable.
import * as d from '../domain/decimal.js';

// Estado de una obligación: bruto − descuentos − anticipos aplicados = neto por pagar;
// los componentes bancarios son parte del mismo pago, no obligaciones adicionales.
export function obligationState(db, ob) {
  const comps = db.by('payComponents', 'obligationId', ob.id).filter((c) => c.status !== 'cancelado');
  const auth = comps.filter((c) => c.status === 'autorizado');
  const sumBy = (list, nature) => d.sum(list.filter((c) => c.nature === nature).map((c) => c.amount));
  const discounts = sumBy(auth, 'descuento');
  const advances = d.sum(db.by('advanceApplications', 'obligationId', ob.id).filter((a) => a.status === 'aplicada').map((a) => a.amount));
  const bankPlanned = sumBy(auth, 'parte_del_pago');
  const extraCost = sumBy(auth, 'costo_adicional_dcl');
  const netPayable = d.sub(d.sub(ob.grossAmount, discounts), advances);
  const apps = db.by('paymentApplications', 'obligationId', ob.id);
  const paid = d.sum(apps.filter((a) => a.status === 'confirmada').map((a) => a.amount));
  const reserved = d.sum(apps.filter((a) => a.status === 'reservada').map((a) => a.amount));
  const reversed = apps.some((a) => a.status === 'revertida');
  const balance = d.sub(netPayable, paid);
  const payStatus = d.isZero(paid) ? (reversed ? 'con_reverso' : 'sin_pago') : d.lte(balance, '0') ? 'pagado' : 'parcial';
  return {
    gross: ob.grossAmount, discounts, advances, netPayable, bankPlanned, cashPlanned: d.sub(netPayable, bankPlanned), extraCost,
    paid, reserved, balance, available: d.sub(balance, reserved), payStatus, hasReversal: reversed,
    pendingComponents: comps.filter((c) => c.status === 'propuesto').length,
  };
}
export const PAY_STATUS = { sin_pago: 'Sin pago', parcial: 'Pago parcial', pagado: 'Pagado', con_reverso: 'Con reverso' };

export function contractorAdvanceBalance(db, adv) {
  if (adv.status !== 'vigente') return '0.00';
  const applied = d.sum(db.by('advanceApplications', 'advanceId', adv.id).filter((a) => a.status === 'aplicada').map((a) => a.amount));
  const repaid = d.sum(db.by('advanceRepayments', 'advanceId', adv.id).map((a) => a.amount));
  return d.sub(d.sub(adv.amount, applied), repaid);
}

export function accountBalance(db, account, upTo = null) {
  let b = account.openingBalance;
  for (const m of db.by('cashMovements', 'accountId', account.id)) if (!upTo || m.opDate <= upTo) b = d.add(b, m.amount);
  return b;
}

export function clientAdvanceBalance(db, adv) {
  if (adv.status !== 'vigente') return '0.00';
  return d.sub(adv.amount, d.sum(db.by('clientAdvanceApplications', 'advanceId', adv.id).filter((a) => a.status === 'aplicada').map((a) => a.amount)));
}

// Cuenta por cobrar de una estimación aprobada. La factura relacionada NO crea otra cuenta:
// solo indica qué parte de la misma obligación ya está facturada.
export function receivableState(db, k) {
  const approved = k.status === 'aprobada';
  const total = approved && k.total !== null ? k.total : null;
  const collected = d.sum(db.by('receiptApplications', 'kEstimateId', k.id).filter((a) => a.status === 'aplicada').map((a) => a.amount));
  const adjustments = d.sum(db.by('arAdjustments', 'kEstimateId', k.id).filter((a) => a.status === 'autorizado').map((a) => (a.kind === 'recuperacion' ? d.neg(a.amount) : a.amount)));
  const invoiced = d.sum(db.by('invoiceLinks', 'kEstimateId', k.id).filter((l) => db.get('invoices', l.invoiceId)?.status === 'registrada').map((l) => l.amount));
  const balance = total === null ? null : d.sub(d.sub(total, collected), adjustments);
  const uncollectible = db.by('arAdjustments', 'kEstimateId', k.id).some((a) => a.status === 'autorizado' && a.kind === 'incobrable');
  return {
    total, collected, adjustments, invoiced, balance,
    toInvoice: total === null ? null : d.max(d.sub(total, invoiced), '0'),
    invoiceStatus: total === null ? 'no_aplica' : d.isZero(invoiced) ? 'sin_factura' : d.gte(invoiced, total) ? 'facturada' : 'parcial',
    collectStatus: total === null ? 'no_aplica' : d.lte(balance, '0') ? 'cobrada' : d.isZero(collected) ? 'sin_cobro' : 'parcial',
    uncollectible,
  };
}
