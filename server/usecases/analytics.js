// Reportería avanzada: motor de análisis sobre conjuntos de datos con dimensiones y medidas declaradas.
// El alcance por obra y los permisos se aplican ANTES de agregar. Las sumas usan decimales exactos.
// Un dato faltante no se suma como cero: se informa cuántos registros no tenían la medida.
import { renderPdf } from '../pdf/render.js';
import * as d from '../domain/decimal.js';
import { toCsv } from '../core/csv.js';
import { invalid, notFound, forbidden } from '../core/errors.js';
import { localDate, weekOf, diffDays, fmtDate } from '../domain/dates.js';
import { label, locationPath, effectiveQty, allocatedQty, inWorkScope, req } from './common.js';
import { obligationState, receivableState, PAY_STATUS } from './ledger.js';
import { tracking } from './budgets.js';
import { exposure, KIND as ADD_KIND, OP, COST, SALE } from './additionals.js';
import { evidenceCount } from './progress.js';
import { aging, AGING } from './receivables.js';
import { STATUS as CE_STATUS, ITEM_STATUS } from './cestimates.js';
import { STATUS as K_STATUS } from './kestimates.js';
import { STATUS as G_STATUS } from './expenses.js';
import { M_TYPE, FLOW } from './cash.js';
import { D_STATUS } from './payments.js';
import { KIND as SUP_KIND } from './supplies.js';

const P_STATUS = { borrador: 'Borrador', reportado: 'Reportado', validado: 'Validado', rechazado: 'Rechazado' };
const dim = (key, lbl, values) => ({ key, label: lbl, values });
const money = (key, lbl) => ({ key, label: lbl, type: 'money' }); const qty = (key, lbl) => ({ key, label: lbl, type: 'qty' }); const count = { key: 'n', label: 'Registros', type: 'count' };
const none = (v) => (v === null || v === undefined || v === '' ? 'Sin dato' : v);

// Cada conjunto: permiso, campo de fecha, dimensiones, medidas y generador de filas planas (con enlace al registro).
const DATASETS = {
  avances: { title: 'Avances de obra', area: 'Operación', perm: 'progress.view', dateLabel: 'Fecha de ejecución',
    dims: [dim('work', 'Obra'), dim('client', 'Cliente'), dim('location', 'Ubicación'), dim('concept', 'Concepto'), dim('family', 'Familia de concepto'), dim('unit', 'Unidad'), dim('contractor', 'Contratista'), dim('author', 'Supervisor que capturó'), dim('week', 'Semana operativa'), dim('status', 'Estado', P_STATUS), dim('workType', 'Tipo de trabajo', { ordinario: 'Ordinario', adicional: 'Adicional', retrabajo: 'Retrabajo' }), dim('evidence', 'Evidencia', { opcional: 'Opcional', completa: 'Completa', faltante: 'Faltante', excepcion: 'Excepción autorizada' }), dim('paid', 'En pago al contratista', { si: 'Incluido', parcial: 'Parcial', no: 'Pendiente' }), dim('billed', 'En cobro al cliente', { si: 'Incluido', parcial: 'Parcial', no: 'Pendiente' })],
    measures: [count, qty('qty', 'Cantidad vigente'), qty('paidQty', 'Cantidad en pago al contratista'), qty('billedQty', 'Cantidad en cobro al cliente'), qty('unbilledQty', 'Cantidad sin estimar al cliente')],
    rows(db, ok) { return db.all('progressEntries').filter((e) => ok(e.workId)).map((e) => { const w = db.get('works', e.workId), c = db.get('concepts', e.conceptId), eff = effectiveQty(db, e), p = allocatedQty(db, e.id, 'contratista'), b = allocatedQty(db, e.id, 'cliente'); const part = (x) => (d.isZero(x) ? 'no' : d.gte(x, eff) ? 'si' : 'parcial'); const ev = evidenceCount(db, e.id);
      return { _href: `#/avances/${e.id}`, _date: e.executionDate, work: w?.name, client: label(db, 'parties', w?.clientId), location: locationPath(db, e.locationId), concept: c?.name, family: c?.family, unit: label(db, 'units', e.unitId, 'code'), contractor: label(db, 'parties', e.contractorId), author: label(db, 'users', e.authorId), week: label(db, 'weekPeriods', e.periodId, 'code'), status: e.status, workType: e.workType, evidence: !e.evidenceRequired ? 'opcional' : ev ? 'completa' : e.evidenceException ? 'excepcion' : 'faltante', paid: part(p), billed: part(b), qty: eff, paidQty: p, billedQty: b, unbilledQty: e.status === 'validado' ? d.sub(eff, b, 4) : '0' }; }); } },
  mano_obra: { title: 'Mano de obra (partidas de estimaciones)', area: 'Mano de obra', perm: 'cestimates.view', dateLabel: 'Fin de la semana',
    dims: [dim('work', 'Obra'), dim('contractor', 'Contratista'), dim('week', 'Semana operativa'), dim('concept', 'Concepto'), dim('location', 'Ubicación'), dim('itemStatus', 'Estado de la partida', ITEM_STATUS), dim('status', 'Estado de la estimación', CE_STATUS), dim('workType', 'Tipo de trabajo', { ordinario: 'Ordinario', adicional: 'Adicional', retrabajo: 'Retrabajo' }), dim('method', 'Método de cálculo', { cantidad: 'Cantidad × tarifa', jornada: 'Jornada', hora: 'Hora', lote: 'Lote', destajo: 'Destajo', fijo: 'Importe fijo' }), dim('estimate', 'Estimación'), dim('valued', 'Valorización', { si: 'Con tarifa', no: 'Pendiente de valorar' })],
    measures: [money('amount', 'Importe'), money('authorized', 'Importe autorizado'), qty('qty', 'Cantidad'), count],
    rows(db, ok) { return db.all('cEstimateItems').map((i) => ({ i, e: db.get('cEstimates', i.estimateId) })).filter(({ e }) => e && e.status !== 'cancelada' && ok(e.workId)).map(({ i, e }) => { const p = db.get('weekPeriods', e.periodId);
      return { _href: `#/estimaciones-contratistas/${e.id}`, _date: p?.endDate, work: label(db, 'works', e.workId), contractor: label(db, 'parties', e.contractorId), week: p?.code, concept: label(db, 'concepts', i.conceptId) || i.description, location: locationPath(db, i.locationId), itemStatus: i.status, status: e.status, workType: i.workType, method: i.method, estimate: e.folio, valued: i.amount === null ? 'no' : 'si', amount: ['rechazada', 'diferida'].includes(i.status) ? '0' : i.amount, authorized: i.status === 'autorizada' ? i.amount : '0', qty: i.qty }; }); } },
  obligaciones: { title: 'Obligaciones y saldos por pagar', area: 'Pagos', perm: 'payments.view', dateLabel: 'Vencimiento',
    dims: [dim('beneficiary', 'Beneficiario'), dim('kind', 'Tipo', { contratista: 'Contratista', proveedor: 'Proveedor', otro: 'Otro' }), dim('work', 'Obra'), dim('week', 'Semana operativa'), dim('payStatus', 'Estado de pago', PAY_STATUS), dim('overdue', 'Vencimiento', { vencida: 'Vencida con saldo', vigente: 'Vigente', pagada: 'Sin saldo' }), dim('folio', 'Obligación')],
    measures: [money('gross', 'Bruto autorizado'), money('discounts', 'Descuentos'), money('advances', 'Anticipos aplicados'), money('netPayable', 'Neto por pagar'), money('bankPlanned', 'Asignado a banco'), money('cashPlanned', 'Efectivo calculado'), money('paid', 'Pagado confirmado'), money('balance', 'Saldo'), count],
    rows(db, ok) { const today = localDate(); return db.all('obligations').filter((o) => o.status === 'autorizada' && (o.workId ? ok(o.workId) : ok(null))).map((o) => { const s = obligationState(db, o);
      return { _href: `#/pagos/obligacion/${o.id}`, _date: o.dueDate, beneficiary: label(db, 'parties', o.beneficiaryId), kind: o.kind, work: label(db, 'works', o.workId), week: label(db, 'weekPeriods', o.periodId, 'code'), payStatus: s.payStatus, overdue: !d.isPos(s.balance) ? 'pagada' : o.dueDate && o.dueDate < today ? 'vencida' : 'vigente', folio: o.folio, gross: s.gross, discounts: s.discounts, advances: s.advances, netPayable: s.netPayable, bankPlanned: s.bankPlanned, cashPlanned: s.cashPlanned, paid: s.paid, balance: s.balance }; }); } },
  desembolsos: { title: 'Desembolsos', area: 'Pagos', perm: 'payments.view', global: true, dateLabel: 'Fecha del pago',
    dims: [dim('beneficiary', 'Beneficiario'), dim('method', 'Medio de pago'), dim('account', 'Cuenta'), dim('status', 'Estado', D_STATUS), dim('kind', 'Tipo', { pago: 'Pago', anticipo: 'Anticipo', reverso: 'Reverso' }), dim('receipt', 'Comprobante', { si: 'Con comprobante', no: 'Sin comprobante' })],
    measures: [money('amount', 'Importe'), money('confirmed', 'Importe confirmado'), count],
    rows(db) { return db.all('disbursements').map((x) => ({ _href: `#/pagos/desembolso/${x.id}`, _date: x.date, beneficiary: label(db, 'parties', x.beneficiaryId), method: label(db, 'paymentMethods', x.methodId), account: label(db, 'accounts', x.accountId), status: x.status, kind: x.kind, receipt: x.receiptAttachmentId ? 'si' : 'no', amount: x.kind === 'reverso' ? d.neg(x.amount) : x.amount, confirmed: x.status === 'confirmado' ? (x.kind === 'reverso' ? d.neg(x.amount) : x.amount) : x.status === 'revertido' ? x.amount : '0' })); } },
  gastos: { title: 'Gastos (asignaciones de costo)', area: 'Costos', perm: 'expenses.view', dateLabel: 'Fecha del documento',
    dims: [dim('target', 'Destino'), dim('supplier', 'Proveedor'), dim('category', 'Categoría'), dim('class', 'Clasificación'), dim('status', 'Estado', G_STATUS), dim('payStatus', 'Estado de pago', { ...PAY_STATUS, caja_chica: 'Caja chica' }), dim('treatment', 'Tratamiento', { gasto: 'Gasto del periodo', activo_pendiente: 'Activo pendiente', no_resultado: 'No es resultado' }), dim('quality', 'Calidad del dato', { completo: 'Con desglose fiscal', sin_desglose: 'Sin desglose', pendiente: 'Pendiente' }), dim('voucher', 'Comprobante', { si: 'Adjunto', no: 'Sin adjuntar' }), dim('folio', 'Gasto')],
    measures: [money('amount', 'Importe asignado'), money('paid', 'Pagado (proporcional)'), count],
    rows(db, ok, acc) { const all = acc.scope('expenses.view') === 'all'; const out = []; for (const e of db.all('expenses')) { const als = db.by('expenseAllocations', 'expenseId', e.id); const cat = db.get('costCategories', e.categoryId); const ob = e.obligationId ? db.get('obligations', e.obligationId) : null; const st = ob ? obligationState(db, ob) : null; const base = { _href: `#/gastos/${e.id}`, _date: e.docDate, supplier: label(db, 'parties', e.supplierId), category: cat?.name, class: cat?.class?.replace(/_/g, ' '), status: e.status, payStatus: e.pettyFundId ? 'caja_chica' : st ? st.payStatus : 'sin_pago', treatment: e.treatment, quality: e.quality, voucher: e.attachmentId ? 'si' : 'no', folio: e.folio };
        const ratio = st && d.isPos(st.gross) ? d.div(st.paid, st.gross, 8) : e.pettyFundId ? '1' : '0';
        if (!als.length) { if (all) out.push({ ...base, target: 'Sin distribuir', amount: e.total, paid: d.mul(e.total, ratio) }); continue; }
        for (const a of als) { if (a.workId ? !ok(a.workId) : !all) continue; out.push({ ...base, target: a.target === 'obra' ? label(db, 'works', a.workId) : a.target === 'administracion' ? 'Administración' : 'Stock', amount: a.amount, paid: d.mul(a.amount, ratio) }); } } return out; } },
  costos: { title: 'Costos reconocidos por obra', area: 'Costos', perm: 'results.view', dateLabel: 'Fecha de reconocimiento',
    dims: [dim('work', 'Obra'), dim('source', 'Origen', { mano_obra: 'Mano de obra autorizada', gasto: 'Gasto autorizado' }), dim('category', 'Categoría'), dim('party', 'Contratista o proveedor'), dim('document', 'Documento')],
    measures: [money('amount', 'Costo'), count],
    rows(db, ok) { const out = []; for (const e of db.all('cEstimates')) if (['autorizada', 'cerrada'].includes(e.status) && ok(e.workId)) out.push({ _href: `#/estimaciones-contratistas/${e.id}`, _date: e.authorizedAt?.slice(0, 10), work: label(db, 'works', e.workId), source: 'mano_obra', category: 'Mano de obra', party: label(db, 'parties', e.contractorId), document: e.folio, amount: e.authorizedTotal });
      for (const a of db.all('expenseAllocations')) { const e = db.get('expenses', a.expenseId); if (!e || !a.workId || !ok(a.workId) || !['autorizado', 'con_ajuste'].includes(e.status) || e.treatment !== 'gasto') continue; out.push({ _href: `#/gastos/${e.id}`, _date: e.docDate, work: label(db, 'works', a.workId), source: 'gasto', category: label(db, 'costCategories', e.categoryId), party: label(db, 'parties', e.supplierId), document: e.folio, amount: a.amount }); } return out; } },
  estimaciones_cliente: { title: 'Estimaciones al cliente (partidas)', area: 'Clientes', perm: 'kestimates.view', dateLabel: 'Fin del periodo estimado',
    dims: [dim('work', 'Obra'), dim('client', 'Cliente'), dim('estimate', 'Estimación'), dim('chapter', 'Capítulo'), dim('concept', 'Partida'), dim('status', 'Estado de la estimación', K_STATUS), dim('itemStatus', 'Estado de la partida', { propuesta: 'Propuesta', aceptada: 'Aceptada', observada: 'Aceptada parcialmente', rechazada: 'Rechazada', diferida: 'Diferida' })],
    measures: [money('proposed', 'Importe propuesto'), money('accepted', 'Importe aceptado'), qty('proposedQty', 'Cantidad propuesta'), qty('acceptedQty', 'Cantidad aceptada'), count],
    rows(db, ok) { return db.all('kEstimateItems').map((i) => ({ i, k: db.get('kEstimates', i.estimateId) })).filter(({ k }) => k && k.status !== 'cancelada' && ok(k.workId)).map(({ i, k }) => ({ _href: `#/estimaciones-clientes/${k.id}`, _date: k.periodTo, work: label(db, 'works', k.workId), client: label(db, 'parties', k.clientId), estimate: k.folio, chapter: i.chapter, concept: i.description, status: k.status, itemStatus: i.status, proposed: i.amount, accepted: i.acceptedAmount, proposedQty: i.proposedQty, acceptedQty: i.acceptedQty })); } },
  cobranza: { title: 'Cuentas por cobrar', area: 'Clientes', perm: 'receivables.view', dateLabel: 'Vencimiento',
    dims: [dim('work', 'Obra'), dim('client', 'Cliente'), dim('estimate', 'Estimación'), dim('aging', 'Antigüedad', { ...AGING, cobrada: 'Cobrada' }), dim('collect', 'Cobranza', { sin_cobro: 'Sin cobro', parcial: 'Parcial', cobrada: 'Cobrada' }), dim('invoice', 'Facturación', { sin_factura: 'Sin factura', parcial: 'Parcial', facturada: 'Facturada' })],
    measures: [money('total', 'Total aprobado'), money('subtotal', 'Subtotal de trabajo'), money('tax', 'Impuestos'), money('amortization', 'Amortización de anticipo'), money('retention', 'Retención'), money('invoiced', 'Facturado'), money('collected', 'Cobrado'), money('balance', 'Saldo'), count],
    rows(db, ok) { const today = localDate(); return db.all('kEstimates').filter((k) => k.status === 'aprobada' && ok(k.workId)).map((k) => { const r = receivableState(db, k);
      return { _href: `#/cobranza/estimacion/${k.id}`, _date: k.dueDate || k.approvedAt?.slice(0, 10), work: label(db, 'works', k.workId), client: label(db, 'parties', k.clientId), estimate: k.folio, aging: aging(k, r, today) || 'cobrada', collect: r.collectStatus, invoice: r.invoiceStatus, total: r.total, subtotal: k.approvedSubtotal, tax: k.taxAmount, amortization: k.amortization, retention: k.retention, invoiced: r.invoiced, collected: r.collected, balance: r.balance }; }); } },
  cobros: { title: 'Cobros y anticipos recibidos', area: 'Clientes', perm: 'receivables.view', dateLabel: 'Fecha del cobro',
    dims: [dim('client', 'Cliente'), dim('work', 'Obra'), dim('kind', 'Tipo', { cobro: 'Cobro', anticipo: 'Anticipo', devolucion: 'Devolución' }), dim('account', 'Cuenta'), dim('method', 'Medio'), dim('status', 'Estado', { confirmado: 'Confirmado', revertido: 'Revertido' })],
    measures: [money('gross', 'Importe bruto'), money('commission', 'Comisión'), money('net', 'Neto recibido'), money('applied', 'Aplicado a estimaciones'), count],
    rows(db, ok) { return db.all('receipts').filter((r) => (r.workId ? ok(r.workId) : ok(null))).map((r) => ({ _href: `#/cobranza/cobros/${r.id}`, _date: r.date, client: label(db, 'parties', r.clientId), work: label(db, 'works', r.workId), kind: r.kind, account: label(db, 'accounts', r.accountId), method: label(db, 'paymentMethods', r.methodId), status: r.status, gross: r.status === 'confirmado' ? r.grossAmount : '0', commission: r.status === 'confirmado' ? r.commission : null, net: r.status === 'confirmado' ? r.netAmount : '0', applied: d.sum(db.by('receiptApplications', 'receiptId', r.id).filter((a) => a.status === 'aplicada').map((a) => a.amount)) })); } },
  caja: { title: 'Movimientos de caja y bancos', area: 'Caja y bancos', perm: 'cash.view', global: true, dateLabel: 'Fecha de operación',
    dims: [dim('account', 'Cuenta'), dim('accountKind', 'Tipo de cuenta', { efectivo: 'Efectivo', banco: 'Banco' }), dim('type', 'Tipo de movimiento', M_TYPE), dim('flowClass', 'Clasificación', FLOW), dim('counterparty', 'Contraparte'), dim('direction', 'Sentido', { entrada: 'Entrada', salida: 'Salida' })],
    measures: [money('inflow', 'Entradas'), money('outflow', 'Salidas'), money('net', 'Neto'), count],
    rows(db) { return db.all('cashMovements').map((m) => { const a = db.get('accounts', m.accountId); const pos = d.isPos(m.amount);
      return { _href: m.sourceType === 'disbursement' ? `#/pagos/desembolso/${m.sourceId}` : m.sourceType === 'receipt' ? `#/cobranza/cobros/${m.sourceId}` : m.sourceType === 'expense' ? `#/gastos/${m.sourceId}` : '#/caja', _date: m.opDate, account: a?.name, accountKind: a?.kind, type: m.type, flowClass: m.flowClass, counterparty: label(db, 'parties', m.counterpartyId) || m.counterpartyName, direction: pos ? 'entrada' : 'salida', inflow: pos ? m.amount : '0', outflow: pos ? '0' : d.neg(m.amount), net: m.amount }; }); } },
  adicionales: { title: 'Adicionales y retrabajos', area: 'Operación', perm: 'additionals.validate', dateLabel: 'Fecha del adicional',
    dims: [dim('work', 'Obra'), dim('kind', 'Tipo', ADD_KIND), dim('opStatus', 'Trabajo', OP), dim('costStatus', 'Pago al contratista', COST), dim('saleStatus', 'Cobro al cliente', SALE), dim('executor', 'Ejecutor'), dim('urgency', 'Urgencia', { normal: 'Normal', urgente: 'Urgente' }), dim('exposed', 'Exposición', { si: 'Con importe expuesto', no: 'Sin exposición' })],
    measures: [money('cost', 'Costo autorizado'), money('sale', 'Precio al cliente'), money('exposure', 'Importe expuesto'), count],
    rows(db, ok) { return db.all('additionals').filter((a) => ok(a.workId)).map((a) => ({ _href: `#/adicionales/${a.id}`, _date: a.date, work: label(db, 'works', a.workId), kind: a.kind, opStatus: a.opStatus, costStatus: a.costStatus, saleStatus: a.saleStatus, executor: label(db, 'parties', a.executorId), urgency: a.urgency, exposed: exposure(a) ? 'si' : 'no', cost: a.costStatus === 'autorizado' ? a.costAmount : '0', sale: ['propuesto', 'aprobado_cliente'].includes(a.saleStatus) ? a.saleAmount : '0', exposure: exposure(a) || '0' })); } },
  presupuesto: { title: 'Presupuesto contra ejecución', area: 'Clientes', perm: 'budgets.view', needs: 'rates.client.view', noDate: true,
    dims: [dim('work', 'Obra'), dim('chapter', 'Capítulo'), dim('location', 'Ubicación'), dim('item', 'Partida'), dim('state', 'Seguimiento', { pendiente: 'Sin ejecución', en_proceso: 'En proceso', completa: 'Completa', excedida: 'Sobre presupuesto', cancelada: 'Cancelada', sustituida: 'Sustituida', modificacion: 'Modificación aprobada' })],
    measures: [money('budgetAmount', 'Presupuesto original'), money('currentAmount', 'Presupuesto vigente'), money('executedAmount', 'Ejecución valorizada'), money('pendingAmount', 'Pendiente por ejecutar'), count],
    rows(db, ok) { return db.all('works').filter((w) => ok(w.id)).flatMap((w) => tracking(db, w.id).rows.map((r) => ({ _href: `#/obras/${w.id}/presupuesto`, _date: null, work: w.name, chapter: r.chapter, location: r.location, item: r.description, state: r.state, budgetAmount: r.budgetAmount, currentAmount: r.currentAmount, executedAmount: r.executedAmount, pendingAmount: r.pendingAmount }))); } },
  jornadas: { title: 'Jornadas y rayas', area: 'Mano de obra', perm: 'workdays.approve', dateLabel: 'Fecha de la jornada',
    dims: [dim('who', 'Trabajador o cuadrilla'), dim('contractor', 'Contratista'), dim('work', 'Obra'), dim('status', 'Estado', { capturada: 'Capturada', aprobada: 'Aprobada', rechazada: 'Rechazada' }), dim('timeUnit', 'Unidad', { jornada: 'Jornada', hora: 'Hora' })],
    measures: [qty('qty', 'Jornadas u horas'), money('amount', 'Importe'), count],
    rows(db, ok) { return db.all('workdayAllocations').filter((a) => ok(a.workId)).map((a) => { const w = db.get('workdays', a.workdayId); return { _href: '#/adicionales/jornadas', _date: w.date, who: label(db, 'workers', w.workerId) || label(db, 'crews', w.crewId), contractor: label(db, 'parties', w.contractorId), work: label(db, 'works', a.workId), status: w.status, timeUnit: w.timeUnit, qty: a.qty, amount: a.amount }; }); } },
  insumos: { title: 'Movimientos de insumos', area: 'Costos', perm: 'supplies.manage', global: true, dateLabel: 'Fecha del movimiento',
    dims: [dim('supply', 'Insumo'), dim('unit', 'Unidad'), dim('kind', 'Movimiento', SUP_KIND), dim('work', 'Obra o almacén')],
    measures: [qty('qty', 'Cantidad'), count],
    rows(db) { return db.all('supplyMovements').map((m) => ({ _href: '#/gastos/insumos', _date: m.date, supply: label(db, 'supplies', m.supplyId), unit: label(db, 'units', m.unitId, 'code'), kind: m.kind, work: label(db, 'works', m.workId) || 'Almacén (stock)', qty: m.qty })); } },
  actividad: { title: 'Actividad del sistema (auditoría)', area: 'Control', perm: 'audit.view', global: true, dateLabel: 'Fecha del evento',
    dims: [dim('actor', 'Persona'), dim('action', 'Acción'), dim('entity', 'Registro'), dim('kind', 'Tipo', { alta: 'Alta', cambio: 'Cambio', baja: 'Baja', evento: 'Evento' }), dim('hour', 'Hora del día')],
    measures: [count],
    rows(db) { return db.all('auditEvents').map((e) => ({ _href: `#/auditoria?objectId=${e.objectId || ''}`, _date: localDate(e.at), actor: e.actorName, action: e.action.replace(/_/g, ' '), entity: e.collection, kind: e.kind, hour: `${new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Monterrey', hour: '2-digit', hour12: false }).format(new Date(e.at))} h` })); } },
  tiempos: { title: 'Tiempos del proceso', area: 'Control', perm: 'cestimates.view', dateLabel: 'Fin de la semana',
    dims: [dim('work', 'Obra'), dim('contractor', 'Contratista'), dim('week', 'Semana operativa'), dim('status', 'Estado', CE_STATUS)],
    measures: [{ key: 'daysToAuthorize', label: 'Días de la semana a la autorización (promedio)', type: 'avg' }, { key: 'daysToPay', label: 'Días de la autorización al primer pago (promedio)', type: 'avg' }, count],
    rows(db, ok) { return db.all('cEstimates').filter((e) => e.status !== 'cancelada' && ok(e.workId)).map((e) => { const p = db.get('weekPeriods', e.periodId); const ob = db.by('obligations', 'sourceId', e.id)[0]; const first = ob ? db.by('paymentApplications', 'obligationId', ob.id).filter((a) => a.status === 'confirmada').map((a) => db.get('disbursements', a.disbursementId)?.date).sort()[0] : null; const auth = e.authorizedAt ? localDate(e.authorizedAt) : null;
      return { _href: `#/estimaciones-contratistas/${e.id}`, _date: p?.endDate, work: label(db, 'works', e.workId), contractor: label(db, 'parties', e.contractorId), week: p?.code, status: e.status, daysToAuthorize: auth && p ? String(Math.max(0, diffDays(auth, p.endDate))) : null, daysToPay: auth && first ? String(Math.max(0, diffDays(first, auth))) : null }; }); } },
};
const BUCKETS = { dia: 'Día', semana: 'Semana', mes: 'Mes', trimestre: 'Trimestre', anio: 'Año' };
function bucketOf(date, b) { if (!date) return 'Sin fecha'; if (b === 'dia') return date; if (b === 'mes') return date.slice(0, 7); if (b === 'anio') return date.slice(0, 4); if (b === 'trimestre') return `${date.slice(0, 4)}-T${Math.ceil(Number(date.slice(5, 7)) / 3)}`; return weekOf(date).code; }

function dataset(c, code) {
  const ds = DATASETS[code]; if (!ds || c.acc.audience !== 'interno' || !c.acc.can(ds.perm) || (ds.needs && !c.acc.can(ds.needs))) throw notFound('El conjunto de datos');
  const scope = inWorkScope(c.acc, ds.perm); const all = c.acc.scope(ds.perm) === 'all';
  // Registros sin obra (o conjuntos globales) solo para quien tiene alcance global.
  return { ds, rows: () => ds.rows(c.db, (w) => (w ? scope(w) : all), c.acc) };
}
// Aplica periodo y filtros. Devuelve filas con el valor de cada dimensión ya resuelto (incluida "_periodo").
function select(ds, rows, q) {
  const bucket = BUCKETS[q.bucket] ? q.bucket : 'mes'; const filters = q.filters || {};
  for (const k of Object.keys(filters)) if (k !== '_periodo' && !ds.dims.some((x) => x.key === k)) throw invalid(`Filtro desconocido: ${k}`, 'filters');
  return rows.filter((r) => { if (!ds.noDate) { if (q.from && (!r._date || r._date < q.from)) return false; if (q.to && (!r._date || r._date > q.to)) return false; }
    for (const [k, vals] of Object.entries(filters)) { if (!Array.isArray(vals) || !vals.length) continue; const v = k === '_periodo' ? bucketOf(r._date, bucket) : none(r[k]); if (!vals.includes(String(v))) return false; } return true; }).map((r) => ({ ...r, _periodo: bucketOf(r._date, bucket) }));
}
const dimLabel = (ds, key, v) => { if (key === '_periodo') return v; const dm = ds.dims.find((x) => x.key === key); return dm?.values?.[v] || none(v); };
function aggregate(rows, m) {
  if (m.type === 'count') return { value: String(rows.length), missing: 0 };
  const vals = rows.map((r) => r[m.key]).filter((v) => v !== null && v !== undefined && v !== ''); const missing = rows.length - vals.length;
  if (m.type === 'avg') return { value: vals.length ? d.div(d.sum(vals, 4), String(vals.length), 1) : null, missing };
  return { value: vals.length || !rows.length ? d.sum(vals, m.type === 'qty' ? 4 : 2) : null, missing };
}

export function run(c, q) {
  const { ds, rows } = dataset(c, q.dataset); const g1 = q.groupBy || ds.dims[0].key, g2 = q.seriesBy || null;
  for (const g of [g1, g2]) if (g && g !== '_periodo' && !ds.dims.some((x) => x.key === g)) throw invalid(`Dimensión desconocida: ${g}`, 'groupBy');
  if ((g1 === '_periodo' || g2 === '_periodo') && ds.noDate) throw invalid('Este conjunto no tiene fecha para agrupar por periodo.', 'groupBy');
  const ms = (q.measures?.length ? q.measures : [ds.measures[0].key]).map((k) => { const m = ds.measures.find((x) => x.key === k); if (!m) throw invalid(`Medida desconocida: ${k}`, 'measures'); return m; });
  const sel = select(ds, rows(), q); const groups = new Map();
  for (const r of sel) { const k = String(none(r[g1])); let g = groups.get(k); if (!g) groups.set(k, (g = [])); g.push(r); }
  let out = [...groups].map(([key, list]) => { const row = { key, label: dimLabel(ds, g1, key), count: list.length }; for (const m of ms) { const a = aggregate(list, m); row[m.key] = a.value; if (a.missing) row[`${m.key}__missing`] = a.missing; } return row; });
  const main = ms[0]; const time = g1 === '_periodo';
  const sort = q.sort || (time ? 'key' : `-${main.key}`); const desc = sort.startsWith('-'); const sk = desc ? sort.slice(1) : sort;
  out.sort((a, b) => { const x = a[sk], y = b[sk]; if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1; const r = sk === 'key' || sk === 'label' ? String(x).localeCompare(String(y), 'es', { numeric: true }) : d.cmp(x, y); return desc ? -r : r; });
  // Primeros N; el resto se agrupa como "Otros" para no perder el total.
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || (time ? 60 : 15), 1), 200); let others = null;
  if (!time && out.length > limit) { const rest = out.slice(limit); const restKeys = new Set(rest.map((r) => r.key)); const list = sel.filter((r) => restKeys.has(String(none(r[g1])))); others = { key: '__otros', label: `Otros (${rest.length})`, count: list.length }; for (const m of ms) others[m.key] = aggregate(list, m).value; out = out.slice(0, limit); }
  const totals = {}; for (const m of ms) { const a = aggregate(sel, m); totals[m.key] = a.value; if (a.missing) totals[`${m.key}__missing`] = a.missing; }
  let series = null;
  if (g2) { const keys = new Map(); for (const r of sel) { const k = String(none(r[g2])); keys.set(k, (keys.get(k) || 0) + 1); }
    const sKeys = [...keys].sort((a, b) => (g2 === '_periodo' ? a[0].localeCompare(b[0]) : b[1] - a[1])).slice(0, 12).map(([k]) => k);
    series = sKeys.map((sk2) => ({ key: sk2, name: dimLabel(ds, g2, sk2), data: out.map((row) => aggregate(sel.filter((r) => String(none(r[g1])) === row.key && String(none(r[g2])) === sk2), main).value) })); }
  const mixedUnits = main.type === 'qty' && ds.dims.some((x) => x.key === 'unit') && g1 !== 'unit' && g2 !== 'unit' && !(q.filters?.unit?.length === 1) && new Set(sel.map((r) => r.unit)).size > 1;
  return { dataset: q.dataset, title: ds.title, groupBy: g1, seriesBy: g2, groupLabel: g1 === '_periodo' ? BUCKETS[BUCKETS[q.bucket] ? q.bucket : 'mes'] : ds.dims.find((x) => x.key === g1).label, measures: ms, rows: others ? [...out, others] : out, series, totals, records: sel.length, asOf: localDate(),
    warnings: [mixedUnits ? 'La medida suma cantidades de unidades distintas (m², ml, piezas…). Agrupe o filtre por unidad para una lectura válida.' : null, ...ms.filter((m) => totals[`${m.key}__missing`]).map((m) => `${totals[`${m.key}__missing`]} registro(s) no tienen "${m.label}" y no se sumaron como cero.`)].filter(Boolean) };
}

export function register(app) {
  const meta = (code, ds) => ({ code, title: ds.title, area: ds.area, hasDate: !ds.noDate, dateLabel: ds.dateLabel || null, dims: ds.dims.map((x) => ({ key: x.key, label: x.label })), measures: ds.measures });
  app.get('/api/analytics/datasets', (c) => { if (c.acc.audience !== 'interno') throw notFound(); return { buckets: BUCKETS, items: Object.entries(DATASETS).filter(([, ds]) => c.acc.can(ds.perm) && (!ds.needs || c.acc.can(ds.needs))).map(([code, ds]) => meta(code, ds)) }; });
  // Valores disponibles de cada dimensión, para los filtros.
  app.get('/api/analytics/datasets/:code/values', (c) => { const { ds, rows } = dataset(c, c.params.code); const all = rows(); const out = {}; for (const x of ds.dims) { const set = new Map(); for (const r of all) { const v = String(none(r[x.key])); set.set(v, (set.get(v) || 0) + 1); } if (set.size <= 300) out[x.key] = [...set].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, label: x.values?.[id] || id, n })); } return { values: out, records: all.length }; });
  app.post('/api/analytics/query', (c) => { req(c.body, ['dataset']); return run(c, c.body); }, { read: true });
  // Desglose: registros que componen una barra o renglón, con enlace al documento de origen.
  app.post('/api/analytics/rows', (c) => {
    const { ds, rows } = dataset(c, req(c.body, ['dataset']).dataset); const sel = select(ds, rows(), c.body); const ms = ds.measures.filter((m) => m.type !== 'count');
    const columns = [...(ds.noDate ? [] : [{ key: '_date', label: ds.dateLabel || 'Fecha', type: 'date' }]), ...ds.dims.map((x) => ({ key: x.key, label: x.label, type: x.values ? 'status' : 'text', values: x.values })), ...ms.map((m) => ({ key: m.key, label: m.label, type: m.type === 'avg' ? 'qty' : m.type }))];
    if (c.body.format === 'csv') return { __file: { buffer: Buffer.from('﻿' + toCsv(sel, columns, { human: true }), 'utf8'), mime: 'text/csv; charset=utf-8', name: `${c.body.dataset}-detalle.csv` } };
    return { columns, total: sel.length, items: sel.slice(0, 300).map((r) => ({ ...r, href: r._href })) };
  }, { read: true });
  app.post('/api/analytics/export', (c) => { const r = run(c, { ...c.body, limit: 200 }); const columns = [{ key: 'label', label: r.groupLabel }, ...r.measures.map((m) => ({ key: m.key, label: m.label, type: m.type === 'count' ? 'int' : m.type === 'avg' ? 'qty' : m.type })), { key: 'count', label: 'Registros', type: 'int' }];
    if (c.body.format === 'pdf') { const q = c.body; const { ds } = dataset(c, q.dataset); const time = r.groupBy === '_periodo'; const main = r.measures[0]; const vt = (m) => (m.type === 'count' ? 'int' : m.type === 'avg' ? 'qty' : m.type); const plain = r.rows.filter((x) => x.key !== '__otros'); const hasCount = r.measures.some((m) => m.type === 'count');
      const kind = q.chart === 'table' ? null : q.chart === 'line' || q.chart === 'area' ? 'line' : time ? 'column' : 'hbar'; const src = r.series ? plain : r.rows;
      const filters = Object.entries(q.filters || {}).filter(([, v]) => v?.length).map(([k, v]) => `${k === '_periodo' ? 'Periodo' : ds.dims.find((x) => x.key === k)?.label || k}: ${v.map((x) => dimLabel(ds, k, x)).slice(0, 4).join(', ')}${v.length > 4 ? ` y ${v.length - 4} más` : ''}`);
      const title = String(q.title || `${r.title} por ${r.groupLabel.toLowerCase()}`).slice(0, 90);
      const model = { title, audienceLabel: 'Reporte · uso interno', subtitle: `${r.title} · datos al ${fmtDate(r.asOf)}`, footer: 'Reporte interno de DCL Instalaciones calculado con los registros vigentes a la fecha de corte. No es un documento contable ni fiscal.',
        meta: [['Qué se mide', r.measures.map((m) => m.label).join(', ')], ['Agrupado por', r.groupLabel + (r.seriesBy ? ` y ${r.seriesBy === '_periodo' ? 'periodo' : ds.dims.find((x) => x.key === r.seriesBy)?.label.toLowerCase()}` : '')], ['Periodo', q.from || q.to ? `${q.from ? fmtDate(q.from) : 'inicio'} a ${q.to ? fmtDate(q.to) : 'hoy'}` : 'Todo el historial'], ['Filtros', filters.length ? filters.join(' · ') : 'Sin filtros']],
        highlights: [...r.measures.slice(0, 3).map((m, i) => [m.label, r.totals[m.key], vt(m), i === 0 ? 'primary' : undefined]), ...(hasCount ? [] : [['Registros', String(r.records), 'text']])],
        sections: [...(kind && src.length ? [{ title: kind === 'hbar' ? `${main.label} por ${r.groupLabel.toLowerCase()}` : `Evolución de ${main.label.toLowerCase()}`, chart: { type: kind, valueType: vt(main), categories: src.map((x) => x.label), series: r.series ? r.series.map((sr) => ({ name: sr.name, data: sr.data })) : [{ name: main.label, data: src.map((x) => x[main.key]) }] } }] : []),
          { title: 'Detalle', columns: hasCount ? columns.filter((x) => x.key !== 'count') : columns, rows: r.rows, totals: r.measures.filter((m) => m.type !== 'avg').map((m) => [`Total ${m.label.toLowerCase()}`, r.totals[m.key], vt(m)]), note: r.warnings.join(' ') || null }] };
      return renderPdf(model).then((buffer) => ({ __file: { buffer, mime: 'application/pdf', name: `${title}.pdf`, inline: true } })); }
    return { __file: { buffer: Buffer.from('﻿' + toCsv(r.rows.map((x) => ({ ...x, count: x.count })), columns, { human: true }), 'utf8'), mime: 'text/csv; charset=utf-8', name: `${r.dataset}.csv` } }; }, { read: true });

  // Reportes guardados por cada persona (y compartidos con el equipo).
  app.get('/api/analytics/saved', (c) => { if (c.acc.audience !== 'interno') throw notFound(); return { items: c.db.all('savedReports').filter((s) => !s.archivedAt && (s.userId === c.user.id || s.shared)).filter((s) => { const ds = DATASETS[s.config?.dataset]; return ds && c.acc.can(ds.perm); }).map((s) => ({ id: s.id, name: s.name, description: s.description, shared: s.shared, mine: s.userId === c.user.id, owner: label(c.db, 'users', s.userId), config: s.config, updatedAt: s.updatedAt })).sort((a, b) => a.name.localeCompare(b.name, 'es')) }; });
  app.post('/api/analytics/saved', (c) => c.tx('reporte_guardado', (tx) => { if (c.acc.audience !== 'interno') throw notFound(); const b = req(c.body, ['name', 'config']); dataset(c, b.config.dataset);
    const prev = b.id ? tx.get('savedReports', b.id) : null; if (prev && prev.userId !== c.user.id) throw forbidden('Solo quien creó el reporte puede modificarlo.');
    const data = { name: String(b.name).slice(0, 120), description: b.description || null, shared: !!b.shared, config: b.config }; return { id: (prev ? tx.update('savedReports', prev.id, data) : tx.insert('savedReports', { ...data, userId: c.user.id })).id }; }));
  app.del('/api/analytics/saved/:id', (c) => c.tx('baja_reporte_guardado', (tx) => { const s = tx.must('savedReports', c.params.id); if (s.userId !== c.user.id) throw forbidden('Solo quien creó el reporte puede eliminarlo.'); tx.archive('savedReports', s.id); return { ok: true }; }));
}
