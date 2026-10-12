// Adicionales, incidencias y jornadas. En un adicional conviven tres decisiones independientes:
// que el trabajo existe, cuánto se paga al contratista y si se cobra al cliente (y a qué precio).
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { invalid, notFound, blocked, forbidden } from '../core/errors.js';
import { setting, label, pick, locationPath, nextFolio, notify, resolveNotifications, req, requireReason, inWorkScope, periodFor } from './common.js';
import { evidenceFor } from './attachments.js';

export const OP = { reportado: 'Reportado', en_aclaracion: 'En aclaración', validado: 'Validado', rechazado: 'Rechazado', resuelto: 'Resuelto' };
export const COST = { pendiente: 'Pendiente de valorar', autorizado: 'Pago autorizado', rechazado: 'Pago rechazado', no_aplica: 'No aplica' };
export const SALE = { pendiente: 'Pendiente de decidir', propuesto: 'Propuesto al cliente', aprobado_cliente: 'Aprobado por el cliente', rechazado_cliente: 'Rechazado por el cliente', absorbido: 'Absorbido por DCL', no_aplica: 'No aplica' };
export const KIND = { trabajo_nuevo: 'Trabajo nuevo', correccion_medicion: 'Corrección de medición', dano: 'Daño', reposicion: 'Reposición', retrabajo: 'Retrabajo', cambio_solicitado: 'Cambio solicitado' };

// Exposición: costo autorizado cuyo cobro al cliente no está asegurado. No es una pérdida comprobada.
export const exposure = (a) => (a.costStatus === 'autorizado' && ['pendiente', 'propuesto', 'rechazado_cliente'].includes(a.saleStatus) ? a.costAmount : null);

export function addRow(db, acc, a) {
  const seeCost = acc.can('rates.contract.view', a.workId) || acc.can('additionals.cost.authorize', a.workId), seeSale = acc.can('rates.client.view', a.workId) || acc.can('additionals.sale.authorize', a.workId);
  return { id: a.id, recordVersion: a.recordVersion, folio: a.folio, workId: a.workId, work: label(db, 'works', a.workId), location: locationPath(db, a.locationId), locationId: a.locationId, date: a.date, description: a.description, kind: a.kind, urgency: a.urgency, executor: label(db, 'parties', a.executorId), executorId: a.executorId, qty: a.qty, unit: label(db, 'units', a.unitId, 'code'), executed: a.executed,
    opStatus: a.opStatus, costStatus: a.costStatus, saleStatus: a.saleStatus, costAmount: seeCost ? a.costAmount : undefined, saleAmount: seeSale ? a.saleAmount : undefined, exposure: seeCost && seeSale ? exposure(a) : undefined, reportedBy: label(db, 'users', a.reportedBy) };
}
const COLUMNS = [{ key: 'folio', label: 'Folio' }, { key: 'date', label: 'Fecha', type: 'date' }, { key: 'work', label: 'Obra' }, { key: 'location', label: 'Ubicación' }, { key: 'description', label: 'Descripción' }, { key: 'kind', label: 'Tipo', type: 'status', values: KIND },
  { key: 'opStatus', label: 'Trabajo', type: 'status', values: OP }, { key: 'costStatus', label: 'Pago al contratista', type: 'status', values: COST }, { key: 'costAmount', label: 'Costo autorizado', type: 'money', total: true }, { key: 'saleStatus', label: 'Cobro al cliente', type: 'status', values: SALE }, { key: 'saleAmount', label: 'Precio al cliente', type: 'money', total: true }, { key: 'exposure', label: 'Expuesto', type: 'money', total: true }];

export function register(app) {
  const internal = (c) => { if (c.acc.audience !== 'interno') throw notFound(); };
  const visible = (acc, w) => acc.inScope('works.view', w) && (acc.can('additionals.report', w) || acc.can('additionals.validate', w) || acc.can('audit.view'));
  app.get('/api/additionals', (c) => {
    internal(c);
    let rows = c.db.where('additionals', (a) => visible(c.acc, a.workId)).map((a) => addRow(c.db, c.acc, a));
    if (c.query.exposed === '1') rows = rows.filter((r) => r.exposure);
    return listResult(c, rows, COLUMNS, { defaultSort: '-folio', name: 'adicionales', dateField: 'date' });
  });
  app.get('/api/additionals/:id', (c) => {
    internal(c); const a = c.db.get('additionals', c.params.id); if (!a || !visible(c.acc, a.workId)) throw notFound('El adicional');
    const w = a.workId;
    return { ...addRow(c.db, c.acc, a), ...pick(a, ['cause', 'requesterName', 'relatedEntryId', 'valuation', 'conceptId', 'detailLevelId', 'opNote', 'opAt', 'costAt', 'saleAt', 'saleNote', 'unitId']), opBy: label(c.db, 'users', a.opBy), costBy: label(c.db, 'users', a.costBy), saleBy: label(c.db, 'users', a.saleBy),
      evidence: evidenceFor(c.db, c.acc, 'additional', a.id), incidents: c.db.by('incidents', 'additionalId', a.id).map((i) => pick(i, ['id', 'title', 'status', 'dueDate'])),
      reworkCosts: c.acc.can('expenses.view') ? c.db.where('expenses', (e) => e.additionalId === a.id).map((e) => pick(e, ['id', 'folio', 'description', 'total', 'status'])) : undefined,
      can: { validate: c.acc.can('additionals.validate', w), cost: c.acc.can('additionals.cost.authorize', w), sale: c.acc.can('additionals.sale.authorize', w), edit: a.opStatus === 'reportado' && (a.reportedBy === c.user.id || c.acc.can('additionals.validate', w)) } };
  });
  app.post('/api/additionals', (c) => c.tx('reporte_adicional', (tx) => {
    internal(c); const b = req(c.body, ['workId', 'date', 'description', 'kind']); c.acc.require('additionals.report', b.workId, 'reportar adicionales');
    tx.must('works', b.workId); if (b.locationId && tx.must('locations', b.locationId).workId !== b.workId) throw invalid('La ubicación no pertenece a la obra.', 'locationId');
    if (b.description.trim().length < 10) throw invalid('Describa el trabajo de forma concreta (qué se hizo y dónde).', 'description');
    const a = tx.insert('additionals', { folio: nextFolio(tx, 'additionals', 'AD'), ...pick(b, ['workId', 'locationId', 'date', 'requesterName', 'executorId', 'description', 'cause', 'kind', 'unitId', 'qty', 'relatedEntryId', 'valuation', 'conceptId', 'detailLevelId']), urgency: b.urgency || 'normal', reportedBy: c.user.id, executed: !!b.executed, opStatus: 'reportado', costStatus: 'pendiente', saleStatus: 'pendiente' });
    notify(tx, { permission: 'additionals.validate', workId: b.workId, event: 'adicional_reportado', objectType: 'additional', objectId: a.id, title: `Adicional ${a.folio} por validar`, priority: b.urgency === 'urgente' ? 'alta' : 'normal' });
    return { id: a.id, folio: a.folio };
  }));
  app.patch('/api/additionals/:id', (c) => c.tx('edicion_adicional', (tx) => {
    internal(c); const a = tx.must('additionals', c.params.id);
    if (a.reportedBy !== c.user.id) c.acc.require('additionals.validate', a.workId);
    const patch = pick(c.body, ['locationId', 'date', 'requesterName', 'executorId', 'description', 'cause', 'kind', 'urgency', 'unitId', 'qty', 'valuation', 'conceptId', 'detailLevelId', 'executed']);
    if (a.costStatus === 'autorizado' && (patch.qty !== undefined || patch.executorId !== undefined)) throw blocked('El costo ya fue autorizado: cantidad y ejecutor no se modifican sin una nueva decisión.');
    const r = tx.update('additionals', a.id, patch, { expectedVersion: c.body.recordVersion }); return { id: r.id, recordVersion: r.recordVersion };
  }));
  // 1) ¿El trabajo existe?
  app.post('/api/additionals/:id/operation', (c) => c.tx('decision_operativa_adicional', (tx) => {
    const a = tx.must('additionals', c.params.id); c.acc.require('additionals.validate', a.workId, 'validar adicionales');
    const to = c.body.status; if (!OP[to] || to === 'reportado') throw invalid('Estado operativo no válido.', 'status');
    if (to === 'validado' && !tx.by('evidenceLinks', 'objectId', a.id).some((l) => l.objectType === 'additional') && !(c.body.reason && c.body.reason.trim().length >= 5)) throw blocked('Un adicional requiere evidencia para validarse.', [], 'Adjunte fotografías o registre una excepción con motivo.');
    if (['rechazado', 'en_aclaracion'].includes(to)) requireReason(c.body, 'esta decisión');
    if (to === 'resuelto' && a.opStatus !== 'validado') throw blocked('Solo un adicional validado puede marcarse como resuelto.');
    tx.update('additionals', a.id, { opStatus: to, opBy: c.user.id, opAt: tx.now, opNote: c.body.reason || null, ...(to === 'rechazado' && a.costStatus === 'pendiente' ? { costStatus: 'no_aplica', saleStatus: a.saleStatus === 'pendiente' ? 'no_aplica' : a.saleStatus } : {}) });
    resolveNotifications(tx, 'additional', a.id, 'adicional_reportado');
    if (to === 'validado') notify(tx, { permission: 'additionals.cost.authorize', workId: a.workId, event: 'adicional_por_valorar', objectType: 'additional', objectId: a.id, title: `Adicional ${a.folio} pendiente de valorar` });
    return { id: a.id };
  }));
  // 2) ¿Cuánto se paga al contratista?
  app.post('/api/additionals/:id/cost', (c) => c.tx('decision_costo_adicional', (tx) => {
    const a = tx.must('additionals', c.params.id); c.acc.require('additionals.cost.authorize', a.workId, 'autorizar el pago de adicionales');
    if (a.opStatus !== 'validado' && a.opStatus !== 'resuelto') throw blocked('Primero debe validarse que el trabajo existe.');
    if (tx.by('cEstimateItems', 'additionalId', a.id).some((i) => i.status === 'autorizada')) throw blocked('El adicional ya está incluido en una estimación autorizada.', [], 'Reabra la estimación para cambiar su costo.');
    if (c.body.decision === 'rechazar') { tx.update('additionals', a.id, { costStatus: 'rechazado', costBy: c.user.id, costAt: tx.now, costAmount: null }); requireReason(c.body, 'el rechazo'); }
    else {
      let amount = c.body.amount;
      if ((amount === undefined || amount === '') && a.detailLevelId) amount = tx.get('detailLevels', a.detailLevelId)?.costAmount;
      if (amount === undefined || amount === null || amount === '') throw invalid('Indique el importe a pagar. Un adicional sin valorar no se autoriza con cero.', 'amount');
      if (!d.isPos(amount)) throw invalid('El importe debe ser mayor que cero.', 'amount');
      c.acc.checkLimit('adicional_costo', amount);
      tx.update('additionals', a.id, { costStatus: 'autorizado', costAmount: amount, costBy: c.user.id, costAt: tx.now });
      // Pagar no implica cobrar: la decisión comercial sigue su propio camino.
      if (a.saleStatus === 'pendiente') notify(tx, { permission: 'additionals.sale.authorize', workId: a.workId, event: 'adicional_cobro_pendiente', objectType: 'additional', objectId: a.id, title: `Adicional ${a.folio}: decidir si se cobra al cliente` });
    }
    resolveNotifications(tx, 'additional', a.id, 'adicional_por_valorar');
    return { id: a.id };
  }));
  // 3) ¿Se cobra al cliente y a qué precio? La aceptación del cliente nunca se presume.
  app.post('/api/additionals/:id/sale', (c) => c.tx('decision_cobro_adicional', (tx) => {
    const a = tx.must('additionals', c.params.id); c.acc.require('additionals.sale.authorize', a.workId, 'decidir el cobro de adicionales');
    const to = c.body.status; if (!['propuesto', 'aprobado_cliente', 'rechazado_cliente', 'absorbido', 'no_aplica'].includes(to)) throw invalid('Decisión comercial no válida.', 'status');
    const patch = { saleStatus: to, saleBy: c.user.id, saleAt: tx.now, saleNote: c.body.reason || null };
    if (to === 'propuesto' || to === 'aprobado_cliente') { const am = c.body.amount ?? a.saleAmount; if (am === null || am === undefined || am === '' || !d.isPos(am)) throw invalid('Indique el precio al cliente.', 'amount', 'El precio de venta no se copia del costo: captúrelo expresamente.'); patch.saleAmount = am; }
    if (to === 'aprobado_cliente') { if (!c.body.evidenceAttachmentId && !(c.body.reason && c.body.reason.trim().length >= 5)) throw blocked('Registre cómo aprobó el cliente (documento, correo o constancia) y quién lo recabó.'); patch.clientApprovalEvidenceId = c.body.evidenceAttachmentId || null; }
    if (to === 'absorbido' || to === 'rechazado_cliente' || to === 'no_aplica') { requireReason(c.body, 'esta decisión'); if (to !== 'rechazado_cliente') patch.saleAmount = null; }
    tx.update('additionals', a.id, patch); resolveNotifications(tx, 'additional', a.id, 'adicional_cobro_pendiente');
    return { id: a.id };
  }));

  // ── Incidencias ──
  const I_ST = { abierta: 'Abierta', en_proceso: 'En proceso', cerrada: 'Cerrada' };
  app.get('/api/incidents', (c) => { internal(c); const ok = inWorkScope(c.acc, 'works.view');
    return listResult(c, c.db.where('incidents', (i) => ok(i.workId)).map((i) => ({ ...pick(i, ['id', 'recordVersion', 'workId', 'title', 'description', 'dueDate', 'status', 'additionalId', 'closeNote']), work: label(c.db, 'works', i.workId), responsible: label(c.db, 'users', i.responsibleId), responsibleId: i.responsibleId, additional: label(c.db, 'additionals', i.additionalId, 'folio'), comments: c.db.by('incidentComments', 'incidentId', i.id).map((m) => ({ text: m.text, author: label(c.db, 'users', m.authorId), at: m.at })) })),
      [{ key: 'title', label: 'Incidencia' }, { key: 'work', label: 'Obra' }, { key: 'responsible', label: 'Responsable' }, { key: 'dueDate', label: 'Compromiso', type: 'date' }, { key: 'status', label: 'Estado', type: 'status', values: I_ST }, { key: 'additional', label: 'Adicional' }], { defaultSort: 'dueDate', name: 'incidencias' }); });
  app.post('/api/incidents', (c) => c.tx('alta_incidencia', (tx) => { internal(c); const b = req(c.body, ['workId', 'title']); c.acc.require('additionals.report', b.workId);
    const i = tx.insert('incidents', { ...pick(b, ['workId', 'additionalId', 'title', 'description', 'responsibleId', 'dueDate']), status: 'abierta' });
    if (b.responsibleId) notify(tx, { users: [tx.must('users', b.responsibleId)], workId: b.workId, event: 'incidencia_asignada', objectType: 'incident', objectId: i.id, title: `Incidencia asignada: ${b.title}`, dueDate: b.dueDate || null });
    return { id: i.id }; }));
  app.post('/api/incidents/:id/comment', (c) => c.tx('comentario_incidencia', (tx) => { internal(c); const i = tx.must('incidents', c.params.id); if (!c.acc.inScope('works.view', i.workId)) throw notFound(); req(c.body, ['text']);
    tx.insert('incidentComments', { incidentId: i.id, text: c.body.text, authorId: c.user.id, at: tx.now }); if (i.status === 'abierta') tx.update('incidents', i.id, { status: 'en_proceso' }); return { id: i.id }; }));
  // El cierre exige evidencia; no se aplican descuentos automáticos al trabajador por una incidencia.
  app.post('/api/incidents/:id/close', (c) => c.tx('cierre_incidencia', (tx) => { internal(c); const i = tx.must('incidents', c.params.id); if (i.responsibleId !== c.user.id) c.acc.require('additionals.validate', i.workId);
    if (!c.body.closeEvidenceId) throw blocked('El cierre de una incidencia requiere evidencia.', [], 'Adjunte la fotografía o el documento que respalda la solución.');
    tx.update('incidents', i.id, { status: 'cerrada', closedAt: tx.now, closeEvidenceId: c.body.closeEvidenceId, closeNote: c.body.note || null }); resolveNotifications(tx, 'incident', i.id); return { id: i.id }; }));

  // ── Jornadas y rayas ──
  const WD = { capturada: 'Capturada', aprobada: 'Aprobada', rechazada: 'Rechazada' };
  const wdRow = (db, w) => { const als = db.by('workdayAllocations', 'workdayId', w.id); return { ...pick(w, ['id', 'recordVersion', 'date', 'timeUnit', 'qty', 'rate', 'amount', 'status', 'note', 'overlapJustification', 'workerId', 'crewId', 'contractorId']), who: label(db, 'workers', w.workerId) || label(db, 'crews', w.crewId), contractor: label(db, 'parties', w.contractorId), period: label(db, 'weekPeriods', w.periodId, 'code'), works: als.map((a) => `${label(db, 'works', a.workId)} (${d.fmtQty(a.qty)})`).join(' · '), allocations: als.map((a) => ({ workId: a.workId, work: label(db, 'works', a.workId), qty: a.qty, amount: a.amount })), method: `${w.timeUnit === 'hora' ? 'horas' : 'jornadas'} × tarifa` }; };
  app.get('/api/workdays', (c) => { internal(c); if (!c.acc.can('workdays.capture') && !c.acc.can('workdays.approve')) throw notFound(); const ok = inWorkScope(c.acc, 'works.view'); const seeRate = c.acc.can('rates.contract.view') || c.acc.can('workdays.approve');
    const rows = c.db.all('workdays').filter((w) => c.db.by('workdayAllocations', 'workdayId', w.id).some((a) => ok(a.workId))).map((w) => { const r = wdRow(c.db, w); if (!seeRate) { r.rate = undefined; r.amount = undefined; r.allocations.forEach((a) => { a.amount = undefined; }); } return r; });
    return listResult(c, rows, [{ key: 'date', label: 'Fecha', type: 'date' }, { key: 'who', label: 'Trabajador o cuadrilla' }, { key: 'contractor', label: 'Contratista' }, { key: 'works', label: 'Distribución por obra' }, { key: 'qty', label: 'Cantidad', type: 'qty' }, { key: 'method', label: 'Método' }, { key: 'rate', label: 'Tarifa', type: 'money' }, { key: 'amount', label: 'Importe', type: 'money', total: true }, { key: 'status', label: 'Estado', type: 'status', values: WD }], { defaultSort: '-date', name: 'jornadas', dateField: 'date' }); });
  app.post('/api/workdays', (c) => c.tx('captura_jornada', (tx) => {
    internal(c); const b = req(c.body, ['date', 'qty']); const allocs = b.allocations || [];
    if (!b.workerId && !b.crewId) throw invalid('Indique el trabajador o la cuadrilla.', 'workerId');
    if (!allocs.length) throw invalid('Distribuya la jornada en al menos una obra.', 'allocations');
    for (const a of allocs) c.acc.require('workdays.capture', a.workId, 'capturar jornadas');
    const qty = d.norm(b.qty, 4); if (!d.isPos(qty)) throw invalid('La cantidad debe ser mayor que cero.', 'qty');
    // La distribución entre obras debe conciliar con el total del día.
    const sumAl = d.sum(allocs.map((a) => a.qty), 4);
    if (!d.eq(sumAl, qty)) throw invalid(`La distribución por obra (${d.fmtQty(sumAl)}) no concilia con el total (${d.fmtQty(qty)}).`, 'allocations', 'Ajuste las porciones para que sumen el total de la jornada.');
    const unit = b.timeUnit === 'hora' ? 'hora' : 'jornada';
    const max = d.norm(setting(tx, unit === 'hora' ? 'workday.hoursPerDay' : 'workday.maxPerDay', unit === 'hora' ? '8' : '1'), 4);
    const same = b.workerId ? tx.by('workdays', 'workerId', b.workerId).filter((w) => w.date === b.date && w.timeUnit === unit && w.status !== 'rechazada') : [];
    const dayTotal = d.add(d.sum(same.map((w) => w.qty), 4), qty, 4);
    const warnings = [];
    if (d.gt(dayTotal, max)) { if (!b.overlapJustification || b.overlapJustification.trim().length < 5) throw blocked(`Con esta captura el trabajador suma ${d.fmtQty(dayTotal)} ${unit === 'hora' ? 'horas' : 'jornadas'} el ${b.date}, más que lo configurado (${d.fmtQty(max)}).`, same.map((w) => `Ya tiene ${d.fmtQty(w.qty)} registradas`), 'Corrija la captura o explique la excepción.'); warnings.push({ type: 'jornada_excedida', message: 'Jornada mayor a la configurada, registrada con justificación.' }); }
    const contractorId = b.contractorId || (b.workerId ? tx.get('workers', b.workerId)?.contractorId : tx.get('crews', b.crewId)?.contractorId) || null;
    const rate = b.rate === undefined || b.rate === '' || b.rate === null ? null : d.norm(b.rate, 4);
    const w = tx.insert('workdays', { workerId: b.workerId || null, crewId: b.crewId || null, contractorId, date: b.date, periodId: periodFor(tx, b.date).id, timeUnit: unit, qty, rate, amount: rate !== null ? d.lineAmount(qty, rate) : null, currency: 'MXN', status: 'capturada', overlapJustification: b.overlapJustification || null, note: b.note || null });
    const parts = rate !== null ? d.allocate(d.lineAmount(qty, rate), allocs.map((a) => a.qty)).parts : [];
    allocs.forEach((a, i) => tx.insert('workdayAllocations', { workdayId: w.id, workId: a.workId, qty: a.qty, amount: rate !== null ? parts[i] : null }));
    return { id: w.id, warnings };
  }));
  app.post('/api/workdays/:id/decide', (c) => c.tx('decision_jornada', (tx) => {
    const w = tx.must('workdays', c.params.id); for (const a of tx.by('workdayAllocations', 'workdayId', w.id)) c.acc.require('workdays.approve', a.workId, 'aprobar jornadas');
    if (w.status !== 'capturada') throw blocked('La jornada ya fue resuelta.');
    if (c.body.decision === 'rechazar') { requireReason(c.body, 'el rechazo'); tx.update('workdays', w.id, { status: 'rechazada', approvedBy: c.user.id }); return { id: w.id }; }
    let rate = w.rate; if (c.body.rate !== undefined && c.body.rate !== '') rate = d.norm(c.body.rate, 4);
    if (rate === null) throw blocked('La jornada no tiene tarifa: no se aprueba con importe cero por omisión.', [], 'Capture la tarifa aplicable.');
    const amount = d.lineAmount(w.qty, rate); const als = tx.by('workdayAllocations', 'workdayId', w.id); const parts = d.allocate(amount, als.map((a) => a.qty)).parts;
    als.forEach((a, i) => tx.update('workdayAllocations', a.id, { amount: parts[i] }));
    tx.update('workdays', w.id, { status: 'aprobada', approvedBy: c.user.id, rate, amount }); return { id: w.id };
  }));
}
export { forbidden };
