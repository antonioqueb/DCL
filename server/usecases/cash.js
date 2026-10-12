// Caja y bancos: saldos calculados, transferencias entre cuentas propias, movimientos que no son
// resultado operativo, conciliación bancaria por CSV, caja chica y proyección de flujo.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { sha256 } from '../core/store.js';
import { parseCsv } from '../core/csv.js';
import { invalid, notFound, blocked } from '../core/errors.js';
import { localDate, isDate, diffDays, addDays } from '../domain/dates.js';
import { label, pick, req, requireReason, nextFolio } from './common.js';
import { accountBalance, obligationState, receivableState } from './ledger.js';
import { postCash } from './payments.js';

export const M_TYPE = { cobro: 'Cobro', pago: 'Pago', transferencia_salida: 'Transferencia (salida)', transferencia_entrada: 'Transferencia (entrada)', prestamo_recibido: 'Préstamo recibido', pago_principal: 'Pago de principal', aportacion: 'Aportación de socios', retiro_socios: 'Retiro de socios', inversion: 'Inversión', ajuste: 'Ajuste de saldo', comision: 'Comisión bancaria', devolucion: 'Devolución' };
export const FLOW = { operacion: 'Operación', inversion: 'Inversión', financiamiento: 'Financiamiento', transferencia: 'Transferencia entre cuentas', ajuste: 'Ajuste' };
const MANUAL = { prestamo_recibido: ['financiamiento', 1], pago_principal: ['financiamiento', -1], aportacion: ['financiamiento', 1], retiro_socios: ['financiamiento', -1], inversion: ['inversion', -1], comision: ['operacion', -1] };
const reconciled = (db, movId) => d.sum(db.by('reconLinks', 'cashMovementId', movId).filter((l) => l.status === 'aceptado').map((l) => l.amount));

export function transfer(tx, { fromAccountId, toAccountId, date, amount, reference = null, note = null }) {
  if (fromAccountId === toAccountId) throw invalid('Las cuentas de origen y destino son la misma.', 'toAccountId');
  const a = tx.must('accounts', fromAccountId), b = tx.must('accounts', toAccountId); if (a.currency !== b.currency) throw blocked('Las cuentas están en monedas distintas.', [], 'Registre una conversión explícita con tipo de cambio aprobado.');
  const am = d.norm(amount); if (!d.isPos(am)) throw invalid('El importe debe ser mayor que cero.', 'amount');
  // Dos movimientos vinculados de signo contrario: no es ingreso ni gasto.
  const t = tx.insert('transfers', { fromAccountId, toAccountId, date, amount: am, reference, note });
  postCash(tx, { accountId: fromAccountId, type: 'transferencia_salida', flowClass: 'transferencia', opDate: date, amount: d.neg(am), currency: a.currency, reference, transferId: t.id, sourceType: 'transfer', sourceId: t.id, note });
  postCash(tx, { accountId: toAccountId, type: 'transferencia_entrada', flowClass: 'transferencia', opDate: date, amount: am, currency: a.currency, reference, transferId: t.id, sourceType: 'transfer', sourceId: t.id, note });
  return t;
}
function parseBankDate(s) { s = String(s).trim(); if (isDate(s)) return s; const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s); if (m) { const v = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return isDate(v) ? v : null; } return null; }
function parseAmount(s) { s = String(s ?? '').trim().replace(/[$\s]/g, ''); if (!s) return null; const neg = /^\(.*\)$/.test(s) || s.startsWith('-'); s = s.replace(/[()-]/g, '').replace(/,(?=\d{3}(\D|$))/g, ''); if (!/^\d+(\.\d+)?$/.test(s)) return undefined; return d.norm(neg ? `-${s}` : s); }

export function register(app) {
  const guard = (c, perm = 'cash.view') => { if (c.acc.audience !== 'interno' || !c.acc.can(perm)) throw notFound(); };
  const movRow = (db, m) => ({ ...pick(m, ['id', 'type', 'flowClass', 'opDate', 'confirmDate', 'amount', 'reference', 'sourceType', 'sourceId', 'note', 'counterpartyName', 'accountId', 'reversesId', 'adjustmentCategory']), account: label(db, 'accounts', m.accountId), counterparty: label(db, 'parties', m.counterpartyId) || m.counterpartyName, document: m.sourceType === 'disbursement' ? label(db, 'disbursements', m.sourceId, 'folio') : m.sourceType === 'receipt' ? label(db, 'receipts', m.sourceId, 'folio') : m.sourceType === 'expense' ? label(db, 'expenses', m.sourceId, 'folio') : null, inflow: d.isPos(m.amount) ? m.amount : null, outflow: d.isNeg(m.amount) ? d.neg(m.amount) : null, reconciled: reconciled(db, m.id), recon: d.eq(d.abs(reconciled(db, m.id)), d.abs(m.amount)) ? 'conciliado' : d.isZero(reconciled(db, m.id)) ? 'sin_conciliar' : 'parcial' });
  app.get('/api/cash/accounts', (c) => { guard(c); const today = localDate(); return { items: c.db.all('accounts').filter((a) => !a.archivedAt).map((a) => { const ms = c.db.by('cashMovements', 'accountId', a.id); const lastBatch = c.db.by('reconBatches', 'accountId', a.id).filter((b) => b.cutoffDate).map((b) => b.cutoffDate).sort().pop() || null;
    return { id: a.id, code: a.code, name: a.name, kind: a.kind, currency: a.currency, openingBalance: a.openingBalance, openingDate: a.openingDate, balance: accountBalance(c.db, a), movements: ms.length, unreconciled: a.kind === 'banco' ? ms.filter((m) => !d.eq(d.abs(reconciled(c.db, m.id)), d.abs(m.amount))).length : null, lastReconCutoff: lastBatch, asOf: today }; }), basis: 'Saldo = saldo inicial fechado + movimientos confirmados. Un ingreso futuro no es efectivo disponible.' }; });
  app.get('/api/cash/movements', (c) => { guard(c); let rows = c.db.all('cashMovements').map((m) => movRow(c.db, m)); if (c.query.accountId) rows = rows.filter((r) => r.accountId === c.query.accountId);
    return listResult(c, rows, [{ key: 'opDate', label: 'Fecha de operación', type: 'date' }, { key: 'confirmDate', label: 'Fecha de banco', type: 'date' }, { key: 'account', label: 'Cuenta' }, { key: 'type', label: 'Tipo', type: 'status', values: M_TYPE }, { key: 'flowClass', label: 'Clasificación', type: 'status', values: FLOW }, { key: 'counterparty', label: 'Contraparte' }, { key: 'document', label: 'Documento' }, { key: 'reference', label: 'Referencia' }, { key: 'inflow', label: 'Entrada', type: 'money', total: true }, { key: 'outflow', label: 'Salida', type: 'money', total: true }, { key: 'recon', label: 'Conciliación', type: 'status', values: { conciliado: 'Conciliado', parcial: 'Parcial', sin_conciliar: 'Sin conciliar' } }], { defaultSort: '-opDate', name: 'movimientos', dateField: 'opDate' }); });
  app.post('/api/cash/transfers', (c) => c.tx('transferencia_cuentas', (tx) => { guard(c, 'cash.manage'); const b = req(c.body, ['fromAccountId', 'toAccountId', 'date', 'amount']); return { id: transfer(tx, b).id }; }));
  // Préstamos, aportaciones, retiros e inversiones: se clasifican aparte del resultado operativo.
  app.post('/api/cash/movements', (c) => c.tx('movimiento_caja', (tx) => {
    guard(c, 'cash.manage'); const b = req(c.body, ['type', 'accountId', 'date', 'amount']); const am = d.norm(b.amount); if (!d.isPos(am)) throw invalid('Capture el importe en positivo; el sentido lo define el tipo de movimiento.', 'amount');
    if (b.type === 'ajuste') {
      // Nunca un "ajuste para cuadrar" invisible: motivo, categoría y autorización.
      c.acc.require('balance.adjust.authorize', undefined, 'autorizar ajustes de saldo'); const reason = requireReason(b, 'el ajuste de saldo'); if (!b.adjustmentCategory) throw invalid('Indique la categoría del ajuste.', 'adjustmentCategory'); c.acc.checkLimit('ajuste_saldo', am);
      return { id: postCash(tx, { accountId: b.accountId, type: 'ajuste', flowClass: 'ajuste', opDate: b.date, amount: b.direction === 'salida' ? d.neg(am) : am, reference: b.reference || null, note: reason, adjustmentCategory: b.adjustmentCategory, authorizedBy: c.user.id }).id };
    }
    const def = MANUAL[b.type]; if (!def) throw invalid('Tipo de movimiento no permitido aquí. Pagos y cobros se registran desde sus documentos.', 'type');
    return { id: postCash(tx, { accountId: b.accountId, type: b.type, flowClass: def[0], opDate: b.date, amount: def[1] < 0 ? d.neg(am) : am, counterpartyId: b.counterpartyId || null, counterpartyName: b.counterpartyName || null, reference: b.reference || null, note: b.note || null }).id };
  }));

  // ── Conciliación bancaria ──
  app.get('/api/recon/batches', (c) => { guard(c); return { items: c.db.all('reconBatches').map((b) => ({ ...pick(b, ['id', 'fileName', 'importedAt', 'cutoffDate', 'status', 'rowCount', 'accountId']), account: label(c.db, 'accounts', b.accountId), pending: c.db.by('bankLines', 'batchId', b.id).filter((l) => l.status !== 'conciliada').length })).sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1)) }; });
  app.post('/api/recon/batches', (c) => c.tx('importar_estado_cuenta', (tx) => {
    guard(c, 'recon.manage'); const b = req(c.body, ['accountId', 'fileName', 'csv']); const acct = tx.must('accounts', b.accountId); if (acct.kind !== 'banco') throw invalid('La conciliación aplica a cuentas bancarias.', 'accountId');
    const hash = sha256(Buffer.from(b.csv, 'utf8')); const prev = tx.by('reconBatches', 'sha256', hash).find((x) => x.accountId === acct.id); if (prev) return { id: prev.id, already: true }; // idempotente
    const rows = parseCsv(b.csv).map((r) => r.map((x) => x.v.trim())); if (rows.length < 2) throw invalid('El archivo no tiene movimientos.', 'csv');
    const head = rows[0].map((h) => h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()); const col = (names) => head.findIndex((h) => names.some((n) => h.includes(n)));
    const iDate = col(['fecha']), iRef = col(['referencia', 'folio']), iDesc = col(['descripcion', 'concepto']), iAmt = col(['importe', 'monto']), iDeb = col(['cargo', 'retiro']), iCre = col(['abono', 'deposito']);
    if (iDate < 0 || (iAmt < 0 && (iDeb < 0 || iCre < 0))) throw invalid('No se reconocen las columnas. Se requiere "Fecha" e "Importe", o "Fecha", "Cargo" y "Abono".', 'csv');
    const batch = tx.insert('reconBatches', { accountId: acct.id, fileName: b.fileName, sha256: hash, importedAt: tx.now, cutoffDate: b.cutoffDate || null, status: 'abierto', rowCount: rows.length - 1 }); const seen = new Map(); const errors = [];
    rows.slice(1).forEach((r, i) => {
      if (r.every((x) => !x)) return; const date = parseBankDate(r[iDate]); let amount = iAmt >= 0 ? parseAmount(r[iAmt]) : null;
      if (iAmt < 0) { const deb = parseAmount(r[iDeb]), cre = parseAmount(r[iCre]); amount = deb === undefined || cre === undefined ? undefined : d.sub(cre || '0', deb || '0'); }
      if (!date || amount === undefined || amount === null) { errors.push(`Fila ${i + 2}: fecha o importe ilegible.`); return; }
      const key = `${date}|${r[iRef] || ''}|${amount}`; const dup = seen.has(key) || tx.by('bankLines', 'accountId', acct.id).some((l) => l.date === date && (l.reference || '') === (r[iRef] || '') && d.eq(l.amount, amount)); seen.set(key, 1);
      tx.insert('bankLines', { batchId: batch.id, accountId: acct.id, lineNo: i + 2, date, reference: iRef >= 0 ? r[iRef] || null : null, description: iDesc >= 0 ? r[iDesc] || null : null, amount, status: 'sin_conciliar', duplicateFlag: dup ? 'posible' : 'ninguno' });
    });
    if (errors.length) throw invalid('El estado de cuenta tiene filas que no pueden leerse; no se importó nada.', 'csv', errors.slice(0, 10).join(' '));
    return { id: batch.id, lines: tx.by('bankLines', 'batchId', batch.id).length };
  }));
  // Propone coincidencias por importe, referencia y fecha. Una sugerencia NO confirma el pago.
  const lineRest = (db, l) => d.sub(l.amount, d.sum(db.by('reconLinks', 'bankLineId', l.id).filter((x) => x.status === 'aceptado').map((x) => x.amount)));
  function suggest(tx, batchId) {
    let n = 0;
    for (const l of tx.by('bankLines', 'batchId', batchId).filter((x) => x.status !== 'conciliada')) {
      if (tx.by('reconLinks', 'bankLineId', l.id).some((x) => x.status !== 'rechazado')) continue;
      const cands = tx.by('cashMovements', 'accountId', l.accountId).filter((m) => d.eq(m.amount, l.amount) && d.isZero(reconciled(tx, m.id)) && !tx.by('reconLinks', 'cashMovementId', m.id).some((x) => x.status === 'sugerido'))
        .map((m) => ({ m, ref: !!l.reference && !!m.reference && l.reference === m.reference, days: Math.abs(diffDays(l.date, m.confirmDate || m.opDate)) })).filter((x) => x.ref || x.days <= 5).sort((a, b) => Number(b.ref) - Number(a.ref) || a.days - b.days);
      if (cands.length) { const x = cands[0]; tx.insert('reconLinks', { bankLineId: l.id, cashMovementId: x.m.id, amount: l.amount, status: 'sugerido', basis: `${x.ref ? 'misma referencia, ' : ''}mismo importe, ${x.days} día(s) de diferencia${cands.length > 1 ? ` · ${cands.length} candidatos` : ''}` }); n++; }
    }
    return n;
  }
  app.post('/api/recon/batches/:id/suggest', (c) => c.tx('sugerir_conciliacion', (tx) => { guard(c, 'recon.manage'); return { suggested: suggest(tx, c.params.id) }; }));
  app.get('/api/recon/batches/:id', (c) => { guard(c); const b = c.db.get('reconBatches', c.params.id); if (!b) throw notFound();
    const lines = c.db.by('bankLines', 'batchId', b.id).sort((x, y) => x.lineNo - y.lineNo).map((l) => ({ ...pick(l, ['id', 'lineNo', 'date', 'reference', 'description', 'amount', 'status', 'duplicateFlag']), rest: lineRest(c.db, l), links: c.db.by('reconLinks', 'bankLineId', l.id).filter((x) => x.status !== 'rechazado').map((x) => { const m = c.db.get('cashMovements', x.cashMovementId); return { id: x.id, status: x.status, amount: x.amount, basis: x.basis, movement: movRow(c.db, m) }; }) }));
    const movs = c.db.by('cashMovements', 'accountId', b.accountId).filter((m) => !d.eq(d.abs(reconciled(c.db, m.id)), d.abs(m.amount)) && (!b.cutoffDate || m.opDate <= b.cutoffDate)).map((m) => movRow(c.db, m));
    const acct = c.db.get('accounts', b.accountId); const bookBalance = accountBalance(c.db, acct, b.cutoffDate);
    return { ...pick(b, ['id', 'fileName', 'cutoffDate', 'status', 'rowCount']), account: acct.name, lines, unreconciledMovements: movs, summary: { bookBalance, linesPending: lines.filter((l) => l.status !== 'conciliada').length, pendingBankAmount: d.sum(lines.filter((l) => l.status !== 'conciliada').map((l) => l.rest)), pendingBookAmount: d.sum(movs.map((m) => d.sub(m.amount, m.reconciled))), probableDuplicates: lines.filter((l) => l.duplicateFlag === 'posible').length } }; });
  // Aceptar o crear vínculos: un renglón contra varios documentos y viceversa, con importes controlados.
  app.post('/api/recon/links', (c) => c.tx('vinculo_conciliacion', (tx) => {
    guard(c, 'recon.manage'); let link;
    if (c.body.linkId) { link = tx.must('reconLinks', c.body.linkId); if (c.body.decision === 'rechazar') { tx.update('reconLinks', link.id, { status: 'rechazado', decidedBy: c.user.id }); return { ok: true }; } }
    const l = tx.must('bankLines', link ? link.bankLineId : req(c.body, ['bankLineId', 'cashMovementId']).bankLineId); const m = tx.must('cashMovements', link ? link.cashMovementId : c.body.cashMovementId);
    if (m.accountId !== l.accountId) throw invalid('El movimiento es de otra cuenta.', 'cashMovementId');
    const am = d.norm(c.body.amount ?? (link ? link.amount : d.isNeg(l.amount) ? d.max(lineRest(tx, l), d.sub(m.amount, reconciled(tx, m.id))) : d.min(lineRest(tx, l), d.sub(m.amount, reconciled(tx, m.id)))));
    if (d.isZero(am) || d.isNeg(am) !== d.isNeg(l.amount) || d.isNeg(am) !== d.isNeg(m.amount)) throw invalid('El importe del vínculo debe tener el mismo sentido que el renglón y el movimiento.', 'amount');
    if (d.gt(d.abs(am), d.abs(lineRest(tx, l))) || d.gt(d.abs(am), d.abs(d.sub(m.amount, reconciled(tx, m.id))))) throw blocked('El vínculo supera lo pendiente de conciliar del renglón o del movimiento.');
    if (link) tx.update('reconLinks', link.id, { status: 'aceptado', amount: am, decidedBy: c.user.id }); else tx.insert('reconLinks', { bankLineId: l.id, cashMovementId: m.id, amount: am, status: 'aceptado', basis: 'vínculo manual', decidedBy: c.user.id });
    const rest = lineRest(tx, l); tx.update('bankLines', l.id, { status: d.isZero(rest) ? 'conciliada' : 'diferencia' }); return { ok: true, rest };
  }));
  app.post('/api/recon/batches/:id/close', (c) => c.tx('corte_conciliacion', (tx) => { guard(c, 'recon.manage'); const b = tx.must('reconBatches', c.params.id); const pending = tx.by('bankLines', 'batchId', b.id).filter((l) => l.status !== 'conciliada').length; if (pending) requireReason(c.body, `cerrar el corte con ${pending} partida(s) pendiente(s)`); tx.update('reconBatches', b.id, { status: 'cerrado', cutoffDate: c.body.cutoffDate || b.cutoffDate || localDate() }); return { ok: true, pending }; }));

  // ── Caja chica: entregar fondos no es gasto; el gasto nace de la comprobación aceptada ──
  const fundView = (db, f) => { const ms = db.by('pettyMovements', 'fundId', f.id); const s = (k) => d.sum(ms.filter((m) => m.kind === k).map((m) => m.amount)); const balance = accountBalance(db, db.get('accounts', f.accountId));
    return { ...pick(f, ['id', 'code', 'name', 'authorizedAmount', 'status', 'accountId']), responsible: label(db, 'users', f.responsibleId), balance, delivered: s('entrega'), verified: s('comprobacion'), rejected: s('rechazo'), returned: s('devolucion'), replenished: s('reposicion'), toReplenish: d.max(d.sub(f.authorizedAmount, balance), '0'), movements: ms.map((m) => ({ ...pick(m, ['id', 'kind', 'date', 'amount', 'note']), expense: label(db, 'expenses', m.expenseId, 'folio'), expenseId: m.expenseId })).sort((a, b) => (a.date < b.date ? 1 : -1)) }; };
  app.get('/api/petty-funds', (c) => { if (c.acc.audience !== 'interno' || !(c.acc.can('pettycash.manage') || c.acc.can('cash.view'))) throw notFound(); return { items: c.db.all('pettyFunds').map((f) => fundView(c.db, f)) }; });
  app.post('/api/petty-funds', (c) => c.tx('alta_caja_chica', (tx) => { guard(c, 'cash.manage'); const b = req(c.body, ['name', 'responsibleId', 'authorizedAmount']); const code = nextFolio(tx, 'pettyFunds', 'CC', 'code', 2);
    const acct = tx.insert('accounts', { code, name: `Caja chica · ${b.name}`, kind: 'efectivo', currency: 'MXN', openingBalance: '0', openingDate: b.date || localDate(), status: 'activo' });
    return { id: tx.insert('pettyFunds', { code, name: b.name, responsibleId: b.responsibleId, authorizedAmount: b.authorizedAmount, accountId: acct.id, currency: 'MXN', status: 'activo' }).id }; }));
  app.post('/api/petty-funds/:id/movements', (c) => c.tx('movimiento_caja_chica', (tx) => {
    const f = tx.must('pettyFunds', c.params.id); const b = req(c.body, ['kind', 'date']);
    if (['entrega', 'reposicion', 'devolucion'].includes(b.kind)) {
      guard(c, 'cash.manage'); req(b, ['amount', 'accountId']); const out = b.kind !== 'devolucion';
      // Entregas y reposiciones son traslados entre cuentas propias: no generan ni duplican gasto.
      transfer(tx, { fromAccountId: out ? b.accountId : f.accountId, toAccountId: out ? f.accountId : b.accountId, date: b.date, amount: b.amount, note: `Caja chica ${f.code}: ${b.kind}` });
      return { id: tx.insert('pettyMovements', { fundId: f.id, kind: b.kind, date: b.date, amount: b.amount, note: b.note || null }).id };
    }
    if (c.acc.audience !== 'interno' || !c.acc.can('pettycash.manage')) throw notFound(); const e = tx.must('expenses', req(b, ['expenseId']).expenseId, 'El gasto'); if (e.pettyFundId !== f.id) throw invalid('El gasto no está marcado como pagado con esta caja chica.', 'expenseId');
    if (tx.by('pettyMovements', 'fundId', f.id).some((m) => m.expenseId === e.id && ['comprobacion', 'rechazo'].includes(m.kind))) throw blocked('Ese comprobante ya fue resuelto en esta caja chica.');
    if (b.kind === 'rechazo') { c.acc.require('expenses.authorize'); requireReason(b, 'el rechazo del comprobante'); return { id: tx.insert('pettyMovements', { fundId: f.id, kind: 'rechazo', date: b.date, amount: e.total, expenseId: e.id, note: b.reason }).id }; }
    if (b.kind !== 'comprobacion') throw invalid('Movimiento de caja chica no válido.', 'kind');
    if (e.status !== 'autorizado') throw blocked('La comprobación requiere que el gasto esté autorizado.', [], 'Pida la autorización del gasto y vuelva a comprobar.');
    const mov = postCash(tx, { accountId: f.accountId, type: 'pago', opDate: b.date, amount: d.neg(e.total), counterpartyId: e.supplierId, reference: e.reference, sourceType: 'expense', sourceId: e.id, note: `Comprobación de caja chica ${f.code}` });
    return { id: tx.insert('pettyMovements', { fundId: f.id, kind: 'comprobacion', date: b.date, amount: e.total, expenseId: e.id, cashMovementId: mov.id, note: b.note || null }).id };
  }));

  // ── Proyección de flujo: saldos confirmados + vencimientos previstos. Distingue confirmado, previsto y vencido ──
  app.get('/api/cash/projection', (c) => { guard(c); const today = localDate(); const weeks = Math.min(parseInt(c.query.weeks, 10) || 8, 26);
    const confirmed = d.sum(c.db.all('accounts').filter((a) => !a.archivedAt).map((a) => accountBalance(c.db, a)));
    const ins = c.db.where('kEstimates', (k) => k.status === 'aprobada').map((k) => ({ k, r: receivableState(c.db, k) })).filter((x) => x.r.balance !== null && d.isPos(x.r.balance)).map((x) => ({ date: x.k.dueDate, amount: x.r.balance, doc: x.k.folio, party: label(c.db, 'parties', x.k.clientId) }));
    const outs = c.db.where('obligations', (o) => o.status === 'autorizada').map((o) => ({ o, s: obligationState(c.db, o) })).filter((x) => d.isPos(x.s.balance)).map((x) => ({ date: x.o.dueDate, amount: x.s.balance, doc: x.o.folio, party: label(c.db, 'parties', x.o.beneficiaryId) }));
    const bucket = (list, from, to) => d.sum(list.filter((x) => x.date && x.date >= from && x.date <= to).map((x) => x.amount)); const rows = []; let running = confirmed;
    const overdueIn = d.sum(ins.filter((x) => x.date && x.date < today).map((x) => x.amount)), overdueOut = d.sum(outs.filter((x) => x.date && x.date < today).map((x) => x.amount));
    for (let i = 0; i < weeks; i++) { const from = addDays(today, i * 7), to = addDays(today, i * 7 + 6); const inn = bucket(ins, from, to), out = bucket(outs, from, to); running = d.sub(d.add(running, inn), out); rows.push({ from, to, expectedIn: inn, expectedOut: out, projected: running }); }
    return { asOf: today, confirmedBalance: confirmed, overdue: { receivable: overdueIn, payable: overdueOut }, undated: { receivable: d.sum(ins.filter((x) => !x.date).map((x) => x.amount)), payable: d.sum(outs.filter((x) => !x.date).map((x) => x.amount)) }, rows, note: 'La proyección parte del saldo confirmado y suma vencimientos previstos. Lo vencido y lo que no tiene fecha se muestran aparte y no se cuentan como disponible.', detail: { ins, outs } }; });
}
