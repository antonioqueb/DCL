// Servicios compartidos de dominio: folios, periodos, tarifas, ejecución elegible, avisos.
import * as d from '../domain/decimal.js';
import { weekOf, localDate } from '../domain/dates.js';
import { buildAccess } from '../core/auth.js';
import { invalid, notFound, forbidden } from '../core/errors.js';

export const setting = (db, key, def) => { const s = db.one('settings', 'key', key); return s && s.value !== null ? s.value.v : def; };
export const label = (db, c, id, field = 'name') => (id ? db.get(c, id)?.[field] ?? null : null);

export function nextFolio(tx, collection, prefix, field = 'folio', width = 4) {
  let max = 0;
  for (const r of tx.all(collection)) { const v = r[field]; if (v && v.startsWith(prefix + '-')) { const n = parseInt(v.slice(prefix.length + 1), 10); if (n > max) max = n; } }
  return `${prefix}-${String(max + 1).padStart(width, '0')}`;
}

export function periodFor(tx, date) {
  const w = weekOf(date, setting(tx, 'week.endOffsetDays', 5));
  const found = tx.by('weekPeriods', 'code', w.code)[0];
  if (found) return found;
  return tx.insert('weekPeriods', { year: w.year, week: w.week, code: w.code, startDate: w.start, endDate: w.end, cutoffDate: w.end, status: 'abierta' });
}

// Ruta legible de una ubicación: "Torre A › Sótano 1 › Lobby".
export function locationPath(db, id) {
  const parts = []; let cur = db.get('locations', id); let guard = 0;
  while (cur && guard++ < 12) { parts.unshift(cur.name); cur = cur.parentId ? db.get('locations', cur.parentId) : null; }
  return parts.join(' › ') || null;
}

// ── Tarifas ──
// Precedencia (de más específica a más general): obra+contratista › contratista › obra › general.
// Dentro del mismo nivel gana la vigencia más reciente que cubra la fecha. Sin tarifa → null (pendiente de valorar).
export function resolveRate(db, { circuit, conceptId, unitId, workId = null, contractorId = null, date }) {
  const cands = db.by('rates', 'conceptId', conceptId).filter((r) => r.circuit === circuit && r.unitId === unitId && r.status === 'vigente' && !r.archivedAt && r.validFrom <= date && (!r.validTo || r.validTo >= date)
    && (!r.workId || r.workId === workId) && (!r.contractorId || r.contractorId === contractorId));
  if (!cands.length) return null;
  const level = (r) => (r.workId && r.contractorId ? 3 : r.contractorId ? 2 : r.workId ? 1 : 0);
  cands.sort((a, b) => level(b) - level(a) || (a.validFrom < b.validFrom ? 1 : -1));
  const r = cands[0];
  return { rateId: r.id, price: r.price, currency: r.currency, unitId: r.unitId, validFrom: r.validFrom, validTo: r.validTo, scope: ['general', 'obra', 'contratista', 'obra y contratista'][level(r)], includes: r.includes, exceptional: !!r.exceptional, origin: 'catálogo de tarifas', copiedOn: localDate() };
}

// ── Ejecución ──
export function effectiveQty(db, entry) {
  let q = entry.qty;
  for (const a of db.by('progressAdjustments', 'entryId', entry.id)) if (a.status === 'autorizado') q = d.add(q, a.qtyDelta, 4);
  return q;
}
// Cantidad ya incluida en documentos vigentes de un circuito (reservada o confirmada).
export function allocatedQty(db, entryId, circuit, exceptAllocationId = null) {
  let q = '0.0000';
  for (const a of db.by('executionAllocations', 'progressEntryId', entryId)) if (a.circuit === circuit && a.state !== 'liberada' && a.id !== exceptAllocationId) q = d.add(q, a.qty, 4);
  return q;
}
export const availableQty = (db, entry, circuit) => d.sub(effectiveQty(db, entry), allocatedQty(db, entry.id, circuit), 4);

export const comparableKey = (e) => [e.workId, e.locationId, e.conceptId, e.unitId, e.budgetItemId || '', e.workType].join('|');
// Acumulado validado comparable (misma obra, ubicación, concepto, unidad y alcance).
export function validatedCumulative(db, e, exceptId = null) {
  const key = comparableKey(e); let q = '0.0000';
  for (const o of db.by('progressEntries', 'locationId', e.locationId)) if (o.id !== exceptId && o.status === 'validado' && comparableKey(o) === key) q = d.add(q, effectiveQty(db, o), 4);
  return q;
}

// ── Avisos internos (sin repetir el mismo evento) ──
export function usersWith(db, permission, workId) {
  return db.where('users', (u) => u.status === 'activo' && !u.archivedAt).filter((u) => buildAccess(db, u).can(permission, workId));
}
export function notify(tx, { users, permission, workId = null, event, objectType, objectId, title, priority = 'normal', dueDate = null }) {
  const targets = users || usersWith(tx, permission, workId);
  for (const u of targets) {
    const dedupeKey = `${u.id}|${event}|${objectType}|${objectId}`;
    const prev = tx.by('notifications', 'dedupeKey', dedupeKey)[0];
    if (prev) { if (prev.status === 'resuelta') tx.update('notifications', prev.id, { status: 'nueva', title }); continue; }
    tx.insert('notifications', { userId: u.id, workId, event, objectType, objectId, title, priority, dueDate, status: 'nueva', dedupeKey });
  }
}
export function resolveNotifications(tx, objectType, objectId, event = null) {
  for (const n of tx.by('notifications', 'objectId', objectId)) if (n.objectType === objectType && n.status !== 'resuelta' && (!event || n.event === event)) tx.update('notifications', n.id, { status: 'resuelta' });
}

// ── Alcance por obra y por tercero ──
export function workOr404(db, acc, workId, permission) {
  const w = db.get('works', workId);
  if (!w || !visibleWork(db, acc, w, permission)) throw notFound('La obra');
  return w;
}
export function visibleWork(db, acc, w, permission = 'works.view') {
  if (acc.audience === 'interno') return acc.inScope(permission, w.id);
  if (acc.audience === 'contratista') return !!acc.partyId && db.by('workAssignments', 'workId', w.id).some((a) => a.kind === 'contratista' && a.partyId === acc.partyId);
  if (acc.audience === 'cliente') return !!acc.partyId && w.clientId === acc.partyId;
  return false;
}
export const scopedWorks = (db, acc, permission = 'works.view') => db.where('works', (w) => visibleWork(db, acc, w, permission));
export const inWorkScope = (acc, permission) => { const s = acc.scope(permission); return (workId) => s === 'all' || (workId && s.has(workId)); };

export function req(body, fields) {
  for (const f of fields) if (body[f] === undefined || body[f] === null || body[f] === '') throw invalid(`Falta el dato obligatorio: ${FIELD_LABELS[f] || f}.`, f, 'Complete el campo y vuelva a guardar.');
  return body;
}
export const FIELD_LABELS = { workId: 'obra', locationId: 'ubicación', conceptId: 'concepto', contractorId: 'contratista', executionDate: 'fecha de ejecución', qty: 'cantidad', reason: 'motivo', amount: 'importe', date: 'fecha', accountId: 'cuenta', methodId: 'medio de pago', description: 'descripción', periodId: 'periodo', text: 'explicación', name: 'nombre', total: 'total', clientId: 'cliente' };
export const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
export const requireReason = (body, what = 'esta acción') => { if (!body.reason || String(body.reason).trim().length < 5) throw invalid(`Indique el motivo de ${what} (al menos 5 caracteres).`, 'reason'); return String(body.reason).trim(); };
export { forbidden };
