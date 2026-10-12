// Autenticación y sesiones. Las credenciales y sesiones viven fuera de las colecciones de negocio
// (carpeta secure/) y nunca forman parte de las exportaciones.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeFileDurable } from './store.js';
import { AppError, forbidden, invalid } from './errors.js';
import { localDate } from '../domain/dates.js';
import { gt } from '../domain/decimal.js';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const IDLE_MS = 12 * 3600e3, ABSOLUTE_MS = 7 * 24 * 3600e3;
const tokenHash = (t) => crypto.createHash('sha256').update(t).digest('hex');

export class AuthStore {
  constructor(dir) {
    this.file = path.join(dir, 'secure', 'auth.json');
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.data = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : { credentials: {}, sessions: {} };
    this.fails = new Map();
  }
  _save() { writeFileDurable(this.file, JSON.stringify(this.data)); try { fs.chmodSync(this.file, 0o600); } catch { /* sin soporte de permisos */ } }
  setPassword(userId, password) {
    if (typeof password !== 'string' || password.length < 10) throw invalid('La contraseña debe tener al menos 10 caracteres.', 'password');
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password.normalize('NFKC'), salt, SCRYPT.keylen, SCRYPT);
    this.data.credentials[userId] = { alg: 'scrypt', ...SCRYPT, salt: salt.toString('base64'), hash: hash.toString('base64'), setAt: new Date().toISOString() };
    this._save();
  }
  hasPassword(userId) { return !!this.data.credentials[userId]; }
  verify(userId, password) {
    const c = this.data.credentials[userId];
    // Se calcula siempre un hash para no revelar por tiempo si el usuario existe.
    const salt = c ? Buffer.from(c.salt, 'base64') : Buffer.alloc(16);
    const hash = crypto.scryptSync(String(password).normalize('NFKC'), salt, SCRYPT.keylen, c ? { N: c.N, r: c.r, p: c.p } : SCRYPT);
    return !!c && crypto.timingSafeEqual(hash, Buffer.from(c.hash, 'base64'));
  }
  checkThrottle(key) {
    const f = this.fails.get(key);
    if (f && f.count >= 5 && Date.now() - f.last < 5 * 60e3) throw new AppError(429, 'demasiados_intentos', 'Demasiados intentos fallidos. Espere cinco minutos e inténtelo de nuevo.');
  }
  noteFail(key) { const f = this.fails.get(key) || { count: 0, last: 0 }; if (Date.now() - f.last > 5 * 60e3) f.count = 0; f.count++; f.last = Date.now(); this.fails.set(key, f); }
  clearFail(key) { this.fails.delete(key); }
  createSession(user) {
    const token = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    this.data.sessions[tokenHash(token)] = { userId: user.id, epoch: user.sessionEpoch || 0, createdAt: now, lastSeen: now };
    this._prune(); this._save();
    return token;
  }
  session(token) {
    if (!token) return null;
    const h = tokenHash(token); const s = this.data.sessions[h];
    if (!s) return null;
    const now = Date.now();
    if (now - s.lastSeen > IDLE_MS || now - s.createdAt > ABSOLUTE_MS) { delete this.data.sessions[h]; this._save(); return null; }
    if (now - s.lastSeen > 60e3) { s.lastSeen = now; this._save(); }
    return s;
  }
  destroy(token) { if (token && this.data.sessions[tokenHash(token)]) { delete this.data.sessions[tokenHash(token)]; this._save(); } }
  destroyUser(userId) { for (const [h, s] of Object.entries(this.data.sessions)) if (s.userId === userId) delete this.data.sessions[h]; this._save(); }
  _prune() { const now = Date.now(); for (const [h, s] of Object.entries(this.data.sessions)) if (now - s.lastSeen > IDLE_MS || now - s.createdAt > ABSOLUTE_MS) delete this.data.sessions[h]; }
  exportCredentials() { return { credentials: this.data.credentials, sessions: {} }; }
}

// ── Contexto de acceso: permisos efectivos por acción y obra, calculados en el servidor ──
export function buildAccess(db, user, { withDelegations = true } = {}) {
  const today = localDate();
  const perms = new Map(); // permiso → { global, works:Set, delegatedBy }
  const grant = (p, scope, workId, via) => {
    let e = perms.get(p); if (!e) perms.set(p, (e = { global: false, works: new Set(), delegatedBy: null }));
    if (scope === 'global') e.global = true; else if (workId) e.works.add(workId);
    if (via) e.delegatedBy = via;
  };
  const active = (a) => (!a.validFrom || a.validFrom <= today) && (!a.validTo || a.validTo >= today) && !a.archivedAt;
  const assignedWorks = db.by('workAssignments', 'userId', user.id).filter(active).map((a) => a.workId);
  const roles = [];
  for (const ra of db.by('roleAssignments', 'userId', user.id).filter(active)) {
    const role = db.get('roles', ra.roleId); if (!role || role.archivedAt) continue;
    roles.push(role);
    for (const rp of db.by('rolePermissions', 'roleId', role.id)) {
      if (ra.scope === 'global') grant(rp.permission, 'global');
      else if (ra.scope === 'obra') grant(rp.permission, 'obra', ra.workId);
      else for (const w of assignedWorks) grant(rp.permission, 'obra', w);
    }
  }
  // Delegaciones vigentes: solo valen mientras quien delega conserve el permiso y su alcance.
  if (withDelegations) for (const d of db.by('delegations', 'toUserId', user.id)) {
    if (d.status !== 'activa' || d.archivedAt || d.validFrom > today || d.validTo < today) continue;
    const from = db.get('users', d.fromUserId); if (!from || from.status !== 'activo') continue;
    const fa = buildAccess(db, from, { withDelegations: false });
    if (d.workId) { if (fa.can(d.permission, d.workId)) grant(d.permission, 'obra', d.workId, from.id); }
    else { const sc = fa.scope(d.permission); if (sc === 'all') grant(d.permission, 'global', null, from.id); else for (const w of sc) grant(d.permission, 'obra', w, from.id); }
  }
  const audience = roles.some((r) => r.audience === 'interno') ? 'interno' : roles.some((r) => r.audience === 'contratista') ? 'contratista' : roles.some((r) => r.audience === 'cliente') ? 'cliente' : 'ninguno';
  const acc = {
    user, audience, partyId: user.partyId || null, roles: roles.map((r) => ({ code: r.code, name: r.name })),
    roleIds: roles.map((r) => r.id),
    can(p, workId) { const e = perms.get(p); if (!e) return false; if (e.global) return true; return workId ? e.works.has(workId) : e.works.size > 0; },
    canGlobal(p) { return !!perms.get(p)?.global; },
    // 'all' o conjunto de obras donde aplica el permiso (para filtrar ANTES de calcular).
    scope(p) { const e = perms.get(p); if (!e) return new Set(); return e.global ? 'all' : e.works; },
    inScope(p, workId) { const s = this.scope(p); return s === 'all' || s.has(workId); },
    require(p, workId, what) { if (!this.can(p, workId)) throw forbidden(`No tiene permiso para ${what || PERM_LABEL(p)}${workId ? ' en esta obra' : ''}.`, { permission: p }); return true; },
    delegatedBy(p) { return perms.get(p)?.delegatedBy || null; },
    list() { return [...perms.entries()].map(([p, e]) => ({ permission: p, global: e.global, works: [...e.works] })); },
    // Límite de autorización configurable por monto. Sin límite definido no se inventa uno.
    checkLimit(kind, amount) {
      const limits = db.by('authorizationLimits', 'kind', kind).filter((l) => !l.archivedAt && l.maxAmount !== null && (l.userId === user.id || (l.roleId && this.roleIds.includes(l.roleId))));
      if (!limits.length) return { defined: false };
      const best = limits.reduce((m, l) => (gt(l.maxAmount, m) ? l.maxAmount : m), '0');
      if (gt(amount, best)) throw forbidden(`El importe ${amount} supera su límite de autorización (${best}). Solicite la autorización de dirección.`, { limit: best, kind });
      return { defined: true, limit: best };
    },
  };
  return acc;
}
import { PERMISSIONS } from '../domain/permissions.js';
const PERM_LABEL = (p) => (PERMISSIONS[p] ? PERMISSIONS[p].charAt(0).toLowerCase() + PERMISSIONS[p].slice(1) : p);
