// Obras, ubicaciones jerárquicas, asignaciones con vigencia y cierres operativo / financiero.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { invalid, notFound, blocked } from '../core/errors.js';
import { localDate } from '../domain/dates.js';
import { label, pick, workOr404, scopedWorks, locationPath, req, requireReason, nextFolio } from './common.js';
import { obligationState, receivableState } from './ledger.js';

export const W_STATUS = { planeacion: 'Planeación', activa: 'Activa', suspendida: 'Suspendida', cierre_operativo: 'Cierre operativo', cierre_financiero: 'Cierre financiero', archivada: 'Archivada' };
const FIELDS = ['code', 'name', 'clientId', 'representativeContactId', 'address', 'startDate', 'endDate', 'currency', 'paymentTerms', 'consolidation', 'consolidationNote'];
const COLUMNS = [{ key: 'code', label: 'Folio' }, { key: 'name', label: 'Obra' }, { key: 'client', label: 'Cliente' }, { key: 'status', label: 'Estado', type: 'status', values: W_STATUS }, { key: 'startDate', label: 'Inicio', type: 'date' }, { key: 'supervisors', label: 'Supervisión' }, { key: 'contractors', label: 'Contratistas' }];

const activeOn = (a, day) => a.validFrom <= day && (!a.validTo || a.validTo >= day) && !a.archivedAt;
function row(db, acc, w) {
  const today = localDate(); const as = db.by('workAssignments', 'workId', w.id).filter((a) => activeOn(a, today));
  const internal = acc.audience === 'interno';
  return { id: w.id, recordVersion: w.recordVersion, code: w.code, name: w.name, clientId: internal ? w.clientId : undefined, client: internal || acc.audience === 'cliente' ? label(db, 'parties', w.clientId) : undefined, status: w.status, startDate: w.startDate, endDate: w.endDate, address: w.address, currency: w.currency,
    supervisors: internal ? as.filter((a) => a.kind === 'supervisor').map((a) => label(db, 'users', a.userId)).join(', ') : undefined, contractors: internal ? as.filter((a) => a.kind === 'contratista').map((a) => label(db, 'parties', a.partyId)).join(', ') : undefined };
}
export function locationTree(db, workId) {
  const all = db.by('locations', 'workId', workId).filter((l) => !l.archivedAt).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'es', { numeric: true }));
  const flat = []; const walk = (parentId, depth) => { for (const l of all.filter((x) => (x.parentId || null) === parentId)) { flat.push({ id: l.id, recordVersion: l.recordVersion, parentId: l.parentId, kind: l.kind, name: l.name, depth, path: locationPath(db, l.id), status: l.status }); walk(l.id, depth + 1); } };
  walk(null, 0); return flat;
}

// Revisión previa a cada cierre: las excepciones se muestran y se autorizan; no se ocultan.
export function closureChecklist(db, w, kind) {
  const items = [];
  const push = (label_, count, detail) => items.push({ label: label_, ok: !count, count, detail });
  if (kind === 'operativo') {
    const entries = db.by('progressEntries', 'workId', w.id);
    push('Avances sin validar', entries.filter((e) => ['borrador', 'reportado'].includes(e.status)).length, 'Capturas en borrador o reportadas.');
    push('Retrabajos e incidencias abiertas', db.by('incidents', 'workId', w.id).filter((i) => i.status !== 'cerrada').length, 'Incidencias sin cierre con evidencia.');
    push('Adicionales sin resolver', db.by('additionals', 'workId', w.id).filter((a) => ['reportado', 'en_aclaracion'].includes(a.opStatus)).length, 'Adicionales reportados o en aclaración.');
    push('Estimaciones de contratista abiertas', db.by('cEstimates', 'workId', w.id).filter((e) => !['autorizada', 'cerrada', 'cancelada'].includes(e.status)).length, 'Documentos sin autorizar.');
  } else {
    const obs = db.by('obligations', 'workId', w.id).filter((o) => o.status === 'autorizada');
    push('Obligaciones con saldo', obs.filter((o) => d.isPos(obligationState(db, o).balance)).length, 'Pagos pendientes a contratistas o proveedores.');
    const ks = db.by('kEstimates', 'workId', w.id);
    push('Estimaciones al cliente sin resolver', ks.filter((k) => ['borrador', 'revision_interna', 'enviada', 'observada', 'corregida'].includes(k.status)).length, 'Documentos comerciales abiertos.');
    push('Saldos por cobrar', ks.filter((k) => { const r = receivableState(db, k); return r.balance !== null && d.isPos(r.balance); }).length, 'Estimaciones aprobadas con saldo.');
    push('Retenciones sin liberar', db.by('retentions', 'workId', w.id).filter((r) => r.status === 'retenida').length, 'Garantías retenidas por el cliente.');
    push('Anticipos de cliente por amortizar', db.by('clientAdvances', 'workId', w.id).filter((a) => a.status === 'vigente' && d.isPos(d.sub(a.amount, d.sum(db.by('clientAdvanceApplications', 'advanceId', a.id).filter((x) => x.status === 'aplicada').map((x) => x.amount))))).length, 'Anticipos con saldo por aplicar.');
    push('Gastos sin autorizar o sin comprobante', db.all('expenses').filter((e) => db.by('expenseAllocations', 'expenseId', e.id).some((a) => a.workId === w.id) && (['borrador', 'pendiente_informacion', 'revisado'].includes(e.status) || (!e.attachmentId && e.status !== 'cancelado'))).length, 'Comprobantes pendientes de revisión.');
  }
  return items;
}

export function register(app) {
  app.get('/api/works', (c) => listResult(c, scopedWorks(c.db, c.acc).map((w) => row(c.db, c.acc, w)), c.acc.audience === 'interno' ? COLUMNS : COLUMNS.slice(0, 4), { defaultSort: 'code', name: 'obras' }));
  app.post('/api/works', (c) => c.tx('alta_obra', (tx) => {
    c.acc.require('works.manage'); req(c.body, ['name']);
    const data = pick(c.body, FIELDS); if (!data.code) data.code = nextFolio(tx, 'works', 'OB', 'code', 3);
    const w = tx.insert('works', { currency: 'MXN', consolidation: 'pendiente_clasificar', ...data, status: 'planeacion' });
    return { id: w.id, code: w.code };
  }));
  app.get('/api/works/:id', (c) => {
    const w = workOr404(c.db, c.acc, c.params.id); const internal = c.acc.audience === 'interno';
    const base = { ...row(c.db, c.acc, w), locations: locationTree(c.db, w.id) };
    if (!internal) return base;
    return { ...base, ...pick(w, ['paymentTerms', 'operationalCloseDate', 'financialCloseDate', 'consolidation', 'consolidationNote', 'representativeContactId']),
      assignments: c.db.by('workAssignments', 'workId', w.id).filter((a) => !a.archivedAt).map((a) => ({ id: a.id, kind: a.kind, who: label(c.db, 'users', a.userId) || label(c.db, 'parties', a.partyId) || label(c.db, 'crews', a.crewId), userId: a.userId, partyId: a.partyId, crewId: a.crewId, validFrom: a.validFrom, validTo: a.validTo, note: a.note })).sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1)),
      closures: c.db.by('workClosures', 'workId', w.id).map((x) => ({ ...pick(x, ['id', 'kind', 'date', 'checklist', 'exceptions', 'note']), authorizedBy: label(c.db, 'users', x.authorizedBy) })),
      can: { manage: c.acc.can('works.manage', w.id), closeOperational: c.acc.can('works.close.operational', w.id), closeFinancial: c.acc.can('works.close.financial', w.id), capture: c.acc.can('progress.capture', w.id) } };
  });
  app.patch('/api/works/:id', (c) => c.tx('edicion_obra', (tx) => {
    const w = tx.must('works', c.params.id); c.acc.require('works.manage', w.id);
    const patch = pick(c.body, FIELDS);
    if (c.body.status && c.body.status !== w.status) {
      if (['cierre_operativo', 'cierre_financiero'].includes(c.body.status)) throw invalid('Los cierres se registran con su revisión previa.', 'status', 'Use la acción de cierre operativo o financiero.');
      if (!W_STATUS[c.body.status]) throw invalid('Estado de obra no válido.', 'status');
      if (['cierre_operativo', 'cierre_financiero', 'archivada'].includes(w.status) && c.body.status === 'activa') requireReason(c.body, 'la reactivación de la obra');
      patch.status = c.body.status;
    }
    const r = tx.update('works', w.id, patch, { expectedVersion: c.body.recordVersion });
    return { id: r.id, recordVersion: r.recordVersion };
  }));
  app.get('/api/works/:id/closure-check', (c) => { const w = workOr404(c.db, c.acc, c.params.id); if (c.acc.audience !== 'interno') throw notFound(); return { kind: c.query.kind, items: closureChecklist(c.db, w, c.query.kind === 'financiero' ? 'financiero' : 'operativo') }; });
  app.post('/api/works/:id/close', (c) => c.tx('cierre_obra', (tx) => {
    const w = tx.must('works', c.params.id); const kind = c.body.kind === 'financiero' ? 'financiero' : 'operativo';
    c.acc.require(kind === 'financiero' ? 'works.close.financial' : 'works.close.operational', w.id);
    if (kind === 'financiero' && !w.operationalCloseDate) throw blocked('El cierre financiero requiere el cierre operativo previo.');
    const checklist = closureChecklist(tx, w, kind); const open = checklist.filter((i) => !i.ok);
    if (open.length && !(c.body.reason && c.body.reason.trim().length >= 5)) throw blocked('Hay pendientes que impiden un cierre limpio.', open.map((i) => `${i.label}: ${i.count}`), 'Resuelva los pendientes o autorice el cierre con excepciones indicando el motivo; quedarán registradas y visibles.');
    const date = c.body.date || localDate();
    tx.insert('workClosures', { workId: w.id, kind, date, checklist: { items: checklist }, exceptions: open.length ? { items: open, reason: c.body.reason } : null, authorizedBy: c.user.id, note: c.body.reason || null });
    tx.update('works', w.id, kind === 'operativo' ? { status: 'cierre_operativo', operationalCloseDate: date } : { status: 'cierre_financiero', financialCloseDate: date });
    return { id: w.id, kind, exceptions: open.length };
  }));

  // Ubicaciones
  app.post('/api/works/:id/locations', (c) => c.tx('alta_ubicacion', (tx) => {
    const w = tx.must('works', c.params.id); if (!c.acc.can('works.manage', w.id) && !c.acc.can('progress.capture', w.id)) c.acc.require('works.manage', w.id);
    req(c.body, ['name', 'kind']);
    if (c.body.parentId) { const p = tx.must('locations', c.body.parentId); if (p.workId !== w.id) throw invalid('La ubicación superior pertenece a otra obra.', 'parentId'); }
    const same = tx.by('locations', 'workId', w.id).find((l) => (l.parentId || null) === (c.body.parentId || null) && l.name.trim().toLowerCase() === c.body.name.trim().toLowerCase() && !l.archivedAt);
    if (same) throw invalid('Ya existe una ubicación con ese nombre en el mismo nivel.', 'name');
    return { id: tx.insert('locations', { workId: w.id, parentId: c.body.parentId || null, kind: c.body.kind, name: c.body.name.trim(), sortOrder: c.body.sortOrder ?? tx.by('locations', 'workId', w.id).length, status: 'activo' }).id };
  }));
  app.patch('/api/locations/:id', (c) => c.tx('edicion_ubicacion', (tx) => {
    const l = tx.must('locations', c.params.id); c.acc.require('works.manage', l.workId);
    const r = tx.update('locations', l.id, pick(c.body, ['name', 'kind', 'sortOrder', 'status']), { expectedVersion: c.body.recordVersion }); return { id: r.id };
  }));

  // Asignaciones: una sustitución cierra la vigencia anterior; no altera al autor de mediciones previas.
  app.post('/api/works/:id/assignments', (c) => c.tx('asignacion_obra', (tx) => {
    const w = tx.must('works', c.params.id); c.acc.require('works.manage', w.id); req(c.body, ['kind']);
    const b = c.body; const validFrom = b.validFrom || localDate();
    if (['supervisor', 'coordinador', 'auxiliar', 'tesoreria'].includes(b.kind) && !b.userId) throw invalid('Seleccione a la persona.', 'userId');
    if (['contratista', 'cliente'].includes(b.kind) && !b.partyId) throw invalid('Seleccione la empresa o persona.', 'partyId');
    if (b.kind === 'cuadrilla' && !b.crewId) throw invalid('Seleccione la cuadrilla.', 'crewId');
    const dup = tx.by('workAssignments', 'workId', w.id).find((a) => a.kind === b.kind && !a.archivedAt && (a.userId || null) === (b.userId || null) && (a.partyId || null) === (b.partyId || null) && (a.crewId || null) === (b.crewId || null) && (!a.validTo || a.validTo >= validFrom));
    if (dup) throw invalid('Esa asignación ya está vigente en la obra.', 'kind');
    return { id: tx.insert('workAssignments', { workId: w.id, kind: b.kind, userId: b.userId || null, partyId: b.partyId || null, crewId: b.crewId || null, validFrom, validTo: b.validTo || null, note: b.note || null }).id };
  }));
  app.post('/api/assignments/:id/end', (c) => c.tx('fin_asignacion', (tx) => {
    const a = tx.must('workAssignments', c.params.id); c.acc.require('works.manage', a.workId);
    tx.update('workAssignments', a.id, { validTo: c.body.validTo || localDate(), note: c.body.note || a.note }); return { id: a.id };
  }));
}
