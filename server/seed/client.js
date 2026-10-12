// Cliente HTTP mínimo para pruebas y para construir la demostración por medio de la API real.
import crypto from 'node:crypto';
export function client(base) {
  let cookie = '';
  const call = async (method, url, body, { raw = false, key } = {}) => {
    const headers = { 'x-dcl-solicitud': '1', cookie };
    if (method !== 'GET') headers['idempotency-key'] = key || crypto.randomUUID();
    let payload;
    if (Buffer.isBuffer(body)) { payload = body; headers['content-type'] = 'application/octet-stream'; }
    else if (body !== undefined) { payload = JSON.stringify(body); headers['content-type'] = 'application/json'; }
    const res = await fetch(base + url, { method, headers, body: payload });
    const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    if (raw) return res;
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data, headers: res.headers };
  };
  const ok = async (method, url, body, opts) => { const r = await call(method, url, body, opts); if (r.status >= 400) { const e = new Error(`${method} ${url} → ${r.status}: ${r.data?.message || ''} ${JSON.stringify(r.data?.reasons || '')}`); e.status = r.status; e.data = r.data; throw e; } return r.data; };
  return {
    call, get: (u) => ok('GET', u), post: (u, b, o) => ok('POST', u, b ?? {}, o), patch: (u, b) => ok('PATCH', u, b), put: (u, b) => ok('PUT', u, b), del: (u) => ok('DELETE', u),
    try: (method, u, b, o) => call(method, u, b, o),
    login: (username, password) => ok('POST', '/api/login', { username, password }),
    upload: (name, buf, q = {}) => ok('POST', `/api/attachments?${new URLSearchParams({ name, ...q })}`, buf),
  };
}
export function createUser(store, auth, { username, name, role, scope = 'global', workId = null, partyId = null, password }) {
  const id = store.tx({ action: 'alta_usuario' }, (tx) => {
    const u = tx.insert('users', { username, name, status: 'activo', partyId, mustChangePassword: false, sessionEpoch: 0 });
    for (const r of [].concat(role)) tx.insert('roleAssignments', { userId: u.id, roleId: tx.by('roles', 'code', r)[0].id, scope, workId });
    return u.id;
  });
  auth.setPassword(id, password);
  return id;
}
// PNG de 1×1 y PDF mínimo, para evidencias de ejemplo y pruebas.
export const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
export const TINY_JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=', 'base64');
