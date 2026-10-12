// Sesión, usuarios, roles, delegaciones, avisos, auditoría, configuración y respaldos.
import crypto from 'node:crypto';
import { listResult } from '../core/http.js';
import { AppError, invalid, notFound, forbidden, blocked } from '../core/errors.js';
import { buildAccess } from '../core/auth.js';
import { createBackup, listBackups, readBackup } from '../core/backup.js';
import path from 'node:path';
import { PERMISSIONS, ROLES } from '../domain/permissions.js';
import { ENTITIES } from '../domain/schema.js';
import { localDate } from '../domain/dates.js';
import { label, pick, req, requireReason } from './common.js';
const DEMO_PASSWORD = 'demo-dcl-2026';

export function installRoles(tx) {
  for (const [code, def] of Object.entries(ROLES)) {
    let role = tx.by('roles', 'code', code)[0];
    if (!role) role = tx.insert('roles', { code, name: def.name, description: def.description, audience: def.audience });
    else continue; // los roles existentes conservan los permisos que la administración haya ajustado
    for (const p of def.permissions) tx.insert('rolePermissions', { roleId: role.id, permission: p });
  }
}
const sessionView = (c) => {
  const demo = c.store.dataset === 'demo';
  // En demostración (datos ficticios) la pantalla de acceso muestra las cuentas de ejemplo.
  if (!c.user) return { user: null, dataset: c.store.dataset, demo, demoAccounts: demo ? c.db.one('settings', 'key', 'demo.accounts')?.value?.v || [] : undefined, demoPassword: demo && c.db.one('settings', 'key', 'demo.accounts') ? DEMO_PASSWORD : undefined };
  return { user: { id: c.user.id, name: c.user.name, username: c.user.username, mustChangePassword: !!c.user.mustChangePassword }, audience: c.acc.audience, roles: c.acc.roles, permissions: c.acc.list().map((p) => p.permission), dataset: c.store.dataset, demo: c.store.dataset === 'demo', today: localDate(),
    unread: c.db.by('notifications', 'userId', c.user.id).filter((n) => n.status === 'nueva').length };
};

export function register(app) {
  const { auth, store } = app;
  app.get('/api/health', () => ({ ok: true, dataset: store.dataset, generation: store.manifest.generation }), { public: true });
  app.get('/api/session', (c) => sessionView(c), { public: true });
  app.post('/api/login', (c) => {
    const username = String(c.body.username || '').trim().toLowerCase(); const key = `${username}|${c.ip}`;
    auth.checkThrottle(key);
    const user = c.db.by('users', 'username', username)[0];
    const ok = auth.verify(user?.id || 'x', c.body.password || '') && user && user.status === 'activo' && !user.archivedAt;
    if (!ok) { auth.noteFail(key); throw new AppError(401, 'credenciales', 'Usuario o contraseña incorrectos.'); }
    auth.clearFail(key);
    app.setSession(c.res, auth.createSession(user));
    store.tx({ actor: { id: user.id, name: user.name }, action: 'inicio_sesion' }, (tx) => tx.event('inicio_sesion', { collection: 'users', objectId: user.id }));
    return { ok: true, mustChangePassword: !!user.mustChangePassword };
  }, { public: true });
  app.post('/api/logout', (c) => { auth.destroy(c.token); app.setSession(c.res, null); return { ok: true }; }, { public: true });
  app.post('/api/password', (c) => {
    if (!auth.verify(c.user.id, c.body.current || '')) throw invalid('La contraseña actual no coincide.', 'current');
    auth.setPassword(c.user.id, c.body.next);
    c.tx('cambio_contrasena', (tx) => { tx.update('users', c.user.id, { mustChangePassword: false }); tx.event('cambio_contrasena', { collection: 'users', objectId: c.user.id }); });
    return { ok: true };
  });

  // Búsqueda global (paleta de comandos): solo devuelve lo que la persona puede abrir.
  app.get('/api/search', (c) => {
    const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); const q = norm(c.query.q).trim(); if (q.length < 2) return { items: [] };
    const db = c.db, acc = c.acc, out = []; const hit = (...t) => t.some((x) => norm(x).includes(q)); const add = (type, labelText, sub, href) => { if (out.length < 24) out.push({ type, label: labelText, sub, href }); };
    const internal = acc.audience === 'interno'; const W = (id) => label(db, 'works', id);
    if (internal) for (const w of db.all('works')) if (acc.inScope('works.view', w.id) && hit(w.name, w.code)) add('Obra', w.name, w.code, `#/obras/${w.id}`);
    for (const e of db.all('cEstimates')) { const mine = internal ? acc.inScope('cestimates.view', e.workId) : acc.audience === 'contratista' && e.contractorId === acc.partyId && !['borrador', 'revision_interna', 'cancelada'].includes(e.status); if (mine && hit(e.folio, W(e.workId), label(db, 'parties', e.contractorId))) add('Estimación de contratista', e.folio, `${W(e.workId)} · ${label(db, 'parties', e.contractorId)}`, internal ? `#/estimaciones-contratistas/${e.id}` : `#/mis-estimaciones/${e.id}`); }
    for (const k of db.all('kEstimates')) { const mine = internal ? acc.inScope('kestimates.view', k.workId) : acc.audience === 'cliente' && k.clientId === acc.partyId && k.publishedVersion !== null; if (mine && hit(k.folio, W(k.workId))) add('Estimación al cliente', k.folio, W(k.workId), internal ? `#/estimaciones-clientes/${k.id}` : `#/mis-documentos/${k.id}`); }
    if (internal) {
      if (acc.can('payments.view')) { for (const o of db.all('obligations')) if ((o.workId ? acc.inScope('payments.view', o.workId) : acc.canGlobal('payments.view')) && hit(o.folio, label(db, 'parties', o.beneficiaryId))) add('Obligación de pago', o.folio, label(db, 'parties', o.beneficiaryId), `#/pagos/obligacion/${o.id}`);
        for (const x of db.all('disbursements')) if (acc.canGlobal('payments.view') && hit(x.folio, x.reference)) add('Pago', x.folio, `${label(db, 'parties', x.beneficiaryId)}${x.reference ? ` · ${x.reference}` : ''}`, `#/pagos/desembolso/${x.id}`); }
      if (acc.canGlobal('expenses.view')) for (const e of db.all('expenses')) if (hit(e.folio, e.description, e.reference, label(db, 'parties', e.supplierId))) add('Gasto', `${e.folio} · ${e.description}`, label(db, 'parties', e.supplierId), `#/gastos/${e.id}`);
      for (const a of db.all('additionals')) if (acc.inScope('works.view', a.workId) && (acc.can('additionals.report', a.workId) || acc.can('additionals.validate', a.workId)) && hit(a.folio, a.description)) add('Adicional', `${a.folio} · ${a.description}`, W(a.workId), `#/adicionales/${a.id}`);
      if (acc.can('receivables.view')) for (const r of db.all('receipts')) if (hit(r.folio, r.reference)) add('Cobro', r.folio, label(db, 'parties', r.clientId), `#/cobranza/cobros/${r.id}`);
      if (acc.can('close.view')) for (const x of db.all('weeklyCloses')) if (hit(x.folio)) add('Cierre semanal', x.folio, null, `#/cierre/emitido/${x.id}`);
    }
    return { items: out };
  });

  // ── Usuarios y roles ──
  const userRow = (db, u) => ({ ...pick(u, ['id', 'recordVersion', 'username', 'name', 'email', 'status', 'partyId', 'mustChangePassword']), party: label(db, 'parties', u.partyId), hasPassword: auth.hasPassword(u.id),
    roles: db.by('roleAssignments', 'userId', u.id).filter((a) => !a.archivedAt).map((a) => ({ id: a.id, roleId: a.roleId, role: label(db, 'roles', a.roleId), scope: a.scope, workId: a.workId, work: label(db, 'works', a.workId), validFrom: a.validFrom, validTo: a.validTo })) });
  app.get('/api/users', (c) => listResult(c, c.db.all('users').filter((u) => !u.archivedAt).map((u) => { const r = userRow(c.db, u); return { ...r, roleNames: r.roles.map((x) => x.role + (x.scope === 'obra' ? ` (${x.work})` : x.scope === 'asignadas' ? ' (obras asignadas)' : '')).join(', ') }; }),
    [{ key: 'name', label: 'Nombre' }, { key: 'username', label: 'Usuario' }, { key: 'roleNames', label: 'Roles y alcance' }, { key: 'party', label: 'Empresa vinculada' }, { key: 'status', label: 'Estado', type: 'status', values: { activo: 'Activo', inactivo: 'Inactivo' } }], { defaultSort: 'name', name: 'usuarios' }), { perm: 'users.manage' });
  app.post('/api/users', (c) => {
    const b = req(c.body, ['username', 'name']); const username = b.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw invalid('El usuario admite letras, números, punto y guion (3 a 40 caracteres).', 'username');
    const temp = b.password || crypto.randomBytes(9).toString('base64url');
    const id = c.tx('alta_usuario', (tx) => tx.insert('users', { username, name: b.name, email: b.email || null, status: 'activo', partyId: b.partyId || null, mustChangePassword: true, sessionEpoch: 0 }).id);
    auth.setPassword(id, temp);
    // La contraseña temporal se muestra una sola vez a quien administra; nunca se guarda en claro.
    return { id, temporaryPassword: b.password ? undefined : temp };
  }, { perm: 'users.manage' });
  app.patch('/api/users/:id', (c) => c.tx('edicion_usuario', (tx) => {
    const u = tx.must('users', c.params.id); const patch = pick(c.body, ['name', 'email', 'status', 'partyId']);
    // Revocar a un usuario invalida de inmediato sus sesiones.
    if (patch.status === 'inactivo' && u.status !== 'inactivo') { patch.sessionEpoch = (u.sessionEpoch || 0) + 1; auth.destroyUser(u.id); }
    const r = tx.update('users', u.id, patch, { expectedVersion: c.body.recordVersion }); return { id: r.id, recordVersion: r.recordVersion };
  }), { perm: 'users.manage' });
  app.post('/api/users/:id/reset-password', (c) => {
    const u = c.db.get('users', c.params.id); if (!u) throw notFound('El usuario');
    const temp = crypto.randomBytes(9).toString('base64url'); auth.setPassword(u.id, temp); auth.destroyUser(u.id);
    c.tx('restablecer_contrasena', (tx) => { tx.update('users', u.id, { mustChangePassword: true, sessionEpoch: (u.sessionEpoch || 0) + 1 }); tx.event('restablecer_contrasena', { collection: 'users', objectId: u.id }); });
    return { temporaryPassword: temp };
  }, { perm: 'users.manage' });
  app.post('/api/users/:id/roles', (c) => c.tx('asignacion_rol', (tx) => {
    const b = req(c.body, ['roleId', 'scope']); tx.must('users', c.params.id); const role = tx.must('roles', b.roleId);
    if (b.scope === 'obra' && !b.workId) throw invalid('Seleccione la obra del alcance.', 'workId');
    if (role.audience !== 'interno' && !tx.get('users', c.params.id).partyId) throw invalid('Un acceso de contratista o cliente requiere vincular al usuario con su empresa.', 'partyId');
    return { id: tx.insert('roleAssignments', { userId: c.params.id, roleId: b.roleId, scope: b.scope, workId: b.scope === 'obra' ? b.workId : null, validFrom: b.validFrom || null, validTo: b.validTo || null }).id };
  }), { perm: 'users.manage' });
  app.del('/api/role-assignments/:id', (c) => c.tx('retiro_rol', (tx) => { tx.remove('roleAssignments', c.params.id); return { ok: true }; }), { perm: 'users.manage' });
  app.get('/api/roles', (c) => ({ permissions: PERMISSIONS, roles: c.db.all('roles').map((r) => ({ ...pick(r, ['id', 'code', 'name', 'description', 'audience']), permissions: c.db.by('rolePermissions', 'roleId', r.id).map((p) => p.permission) })) }), { perm: 'users.manage' });
  app.put('/api/roles/:id/permissions', (c) => c.tx('permisos_rol', (tx) => {
    const role = tx.must('roles', c.params.id); const want = new Set(c.body.permissions || []); requireReason(c.body, 'el cambio de permisos');
    for (const p of want) if (!PERMISSIONS[p]) throw invalid(`Permiso desconocido: ${p}`, 'permissions');
    if (role.audience !== 'interno' && [...want].some((p) => !['cestimates.respond', 'kestimates.respond'].includes(p))) throw blocked('Los accesos de contratista y cliente no admiten permisos internos.');
    const cur = tx.by('rolePermissions', 'roleId', role.id);
    for (const rp of cur) if (!want.has(rp.permission)) tx.remove('rolePermissions', rp.id);
    for (const p of want) if (!cur.some((rp) => rp.permission === p)) tx.insert('rolePermissions', { roleId: role.id, permission: p });
    return { ok: true };
  }), { perm: 'users.manage' });

  // Delegaciones con vigencia: quien delega debe tener el permiso; se puede revocar en cualquier momento.
  app.get('/api/delegations', (c) => {
    const all = c.acc.can('users.manage'); if (c.acc.audience !== 'interno') throw notFound();
    return { items: c.db.all('delegations').filter((x) => all || x.fromUserId === c.user.id || x.toUserId === c.user.id).map((x) => ({ ...pick(x, ['id', 'permission', 'validFrom', 'validTo', 'reason', 'status', 'workId']), permissionLabel: PERMISSIONS[x.permission], from: label(c.db, 'users', x.fromUserId), to: label(c.db, 'users', x.toUserId), work: label(c.db, 'works', x.workId), mine: x.fromUserId === c.user.id })), delegable: c.acc.list().map((p) => ({ permission: p.permission, label: PERMISSIONS[p.permission] })) };
  });
  app.post('/api/delegations', (c) => c.tx('delegacion', (tx) => {
    if (c.acc.audience !== 'interno') throw notFound(); const b = req(c.body, ['toUserId', 'permission', 'validFrom', 'validTo']); const reason = requireReason(b, 'la delegación');
    if (!buildAccess(tx, c.user, { withDelegations: false }).can(b.permission, b.workId || undefined)) throw forbidden('Solo puede delegar facultades que usted tiene de origen.');
    if (b.toUserId === c.user.id) throw invalid('No puede delegarse a usted mismo.', 'toUserId'); if (b.validTo < b.validFrom) throw invalid('La vigencia termina antes de empezar.', 'validTo');
    const to = tx.must('users', b.toUserId); if (buildAccess(tx, to).audience !== 'interno') throw blocked('Solo se delega a personal interno.');
    return { id: tx.insert('delegations', { fromUserId: c.user.id, toUserId: b.toUserId, permission: b.permission, workId: b.workId || null, validFrom: b.validFrom, validTo: b.validTo, reason, status: 'activa' }).id };
  }));
  app.post('/api/delegations/:id/revoke', (c) => c.tx('revocar_delegacion', (tx) => { const x = tx.must('delegations', c.params.id); if (x.fromUserId !== c.user.id) c.acc.require('users.manage'); tx.update('delegations', x.id, { status: 'revocada' }); return { ok: true }; }));

  // ── Avisos internos: enlazan al objeto de negocio, no a una pantalla general ──
  app.get('/api/notifications', (c) => ({ items: c.db.by('notifications', 'userId', c.user.id).filter((n) => c.query.all === '1' || n.status !== 'resuelta').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 200).map((n) => ({ ...pick(n, ['id', 'event', 'objectType', 'objectId', 'title', 'priority', 'dueDate', 'status', 'createdAt', 'workId']), work: label(c.db, 'works', n.workId) })) }));
  app.post('/api/notifications/:id/:action', (c) => c.tx('aviso', (tx) => { const n = tx.must('notifications', c.params.id); if (n.userId !== c.user.id) throw notFound(); tx.update('notifications', n.id, { status: c.params.action === 'resolve' ? 'resuelta' : 'leida' }); return { ok: true }; }));

  // ── Auditoría (solo lectura) ──
  const A_COLS = [{ key: 'at', label: 'Fecha', type: 'instant' }, { key: 'actorName', label: 'Quién' }, { key: 'action', label: 'Acción' }, { key: 'kindLabel', label: 'Tipo' }, { key: 'entity', label: 'Registro' }, { key: 'objectVersion', label: 'Versión', type: 'int' }, { key: 'reason', label: 'Motivo' }, { key: 'changes', label: 'Cambios' }];
  const KIND = { alta: 'Alta', cambio: 'Cambio', baja: 'Baja', evento: 'Evento' };
  const evRow = (db, e) => ({ id: e.id, seq: e.seq, at: e.at, actorName: e.actorName + (e.onBehalfOf ? ` (por delegación de ${label(db, 'users', e.onBehalfOf) || '—'})` : ''), action: e.action.replace(/_/g, ' '), kind: e.kind, kindLabel: KIND[e.kind], collection: e.collection, entity: e.collection ? ENTITIES[e.collection]?.label || e.collection : null, objectId: e.objectId, objectVersion: e.objectVersion, reason: e.reason, diff: e.diff, changes: e.kind === 'cambio' && e.diff ? Object.keys(e.diff).join(', ') : null });
  app.get('/api/audit', (c) => {
    let evs = c.db.all('auditEvents');
    if (c.query.objectId) evs = evs.filter((e) => e.objectId === c.query.objectId);
    if (c.query.collection) evs = evs.filter((e) => e.collection === c.query.collection);
    return listResult(c, evs.map((e) => evRow(c.db, e)), A_COLS, { defaultSort: '-at', name: 'auditoria', dateField: 'at', search: ['actorName', 'action', 'entity', 'reason', 'changes'] });
  }, { perm: 'audit.view' });
  app.get('/api/audit/verify', (c) => store.verifyAudit(), { perm: 'audit.view' });
  // Historial de un registro para quien puede consultarlo en su módulo.
  app.get('/api/history', (c) => {
    if (c.acc.audience !== 'interno') throw notFound();
    const rec = c.db.get(c.query.collection, c.query.id); if (!rec) throw notFound();
    const workId = c.query.collection === 'works' ? rec.id : rec.workId; if (!c.acc.can('audit.view') && !(workId && c.acc.inScope('works.view', workId))) throw forbidden();
    return { items: c.db.by('auditEvents', 'objectId', rec.id).sort((a, b) => b.seq - a.seq).map((e) => evRow(c.db, e)) };
  });

  // ── Configuración y decisiones ──
  app.get('/api/settings', (c) => ({ items: c.db.all('settings').map((s) => ({ ...pick(s, ['id', 'recordVersion', 'key', 'description', 'requiresDecision']), value: s.value?.v })).sort((a, b) => a.key.localeCompare(b.key)) }), { perm: 'config.manage' });
  app.put('/api/settings/:key', (c) => c.tx('configuracion', (tx) => { const s = tx.by('settings', 'key', c.params.key)[0]; if (!s) throw notFound('El parámetro'); requireReason(c.body, 'el cambio de configuración'); tx.update('settings', s.id, { value: { v: c.body.value } }, { expectedVersion: c.body.recordVersion }); return { ok: true }; }), { perm: 'config.manage' });

  // ── Respaldos (la restauración es una operación administrativa por línea de comandos) ──
  app.get('/api/admin/backups', (c) => ({ items: listBackups(store.dir), audit: store.verifyAudit(), generation: store.manifest.generation, generations: store.generations(), dataset: store.dataset }), { perm: 'backup.manage' });
  app.post('/api/admin/backups', (c) => { const r = createBackup(store, auth, { by: c.user.name, note: c.body.note || null }); return r; }, { perm: 'backup.manage' });
  app.get('/api/admin/backups/:stamp/verify', (c) => { if (!/^[0-9TZ-]+$/.test(c.params.stamp)) throw notFound(); const b = readBackup(path.join(store.dir, 'backups', c.params.stamp)); return { ok: !b.problems.length, problems: b.problems.slice(0, 50), collections: [...b.cols].map(([k, v]) => ({ collection: ENTITIES[k].label, records: v.length })) }; }, { perm: 'backup.manage' });

  // Medición declarada de tiempo de trabajo (línea base del beneficio; no confunde espera con trabajo).
  app.get('/api/activity-logs', (c) => { if (c.acc.audience !== 'interno') throw notFound(); const all = c.acc.can('results.view'); return { items: c.db.all('activityLogs').filter((l) => all || l.userId === c.user.id).map((l) => ({ ...pick(l, ['id', 'activity', 'date', 'minutes', 'source', 'note']), user: label(c.db, 'users', l.userId), period: label(c.db, 'weekPeriods', l.periodId, 'code') })).sort((a, b) => (a.date < b.date ? 1 : -1)) }; });
  app.post('/api/activity-logs', (c) => c.tx('registro_tiempo', (tx) => { if (c.acc.audience !== 'interno') throw notFound(); const b = req(c.body, ['activity', 'date', 'minutes']); const m = parseInt(b.minutes, 10); if (!(m > 0 && m <= 1440)) throw invalid('Los minutos deben estar entre 1 y 1440.', 'minutes'); return { id: tx.insert('activityLogs', { userId: c.user.id, activity: b.activity, periodId: b.periodId || null, date: b.date, minutes: m, source: b.source === 'registro' ? 'registro' : 'declarada', note: b.note || null }).id }; }));
}
