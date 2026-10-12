// Núcleo de la interfaz: llamadas a la API, formato, diálogos, formularios y navegación.
// La interfaz previsualiza; la autoridad de cálculos y permisos es siempre el servidor.

export const state = { session: null, online: navigator.onLine };

// ── Elementos ──
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'html') el.innerHTML = v; else if (k === 'value') el.value = v; else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'required' || k === 'multiple') el[k] = !!v; else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid !== null && kid !== undefined && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
export const clear = (el) => { el.replaceChildren(); return el; };

// ── Formato es-MX (misma regla que servidor, PDF y CSV: decimales exactos como texto) ──
const group = (i) => i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export function money(v, missing = 'No disponible') { if (v === null || v === undefined || v === '') return missing; const s = String(v); const neg = s.startsWith('-'); const [i, f = ''] = (neg ? s.slice(1) : s).split('.'); return `${neg ? '-' : ''}$${group(i)}.${(f + '00').slice(0, 2)}`; }
export function qty(v, dec = 2) { if (v === null || v === undefined || v === '') return '—'; const s = String(v); const neg = s.startsWith('-'); const [i, f = ''] = (neg ? s.slice(1) : s).split('.'); const scaled = roundStr(i, f, dec); return `${neg && /[1-9]/.test(scaled) ? '-' : ''}${scaled}`; }
function roundStr(i, f, dec) { const digits = (i + (f + '0'.repeat(dec + 1)).slice(0, dec + 1)); let n = BigInt(digits); n = (n + 5n) / 10n; const t = n.toString().padStart(dec + 1, '0'); return group(t.slice(0, t.length - dec)) + (dec ? '.' + t.slice(-dec) : ''); }
export const date = (s) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
export const instant = (s) => (s ? new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Monterrey', dateStyle: 'short', timeStyle: 'short' }).format(new Date(s)) : '—');
export const today = () => state.session?.today || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Monterrey' }).format(new Date());
const TONE = { ok: ['validado', 'autorizada', 'autorizado', 'cerrada', 'pagado', 'confirmado', 'aprobada', 'aceptada', 'aceptado', 'acordada', 'activa', 'activo', 'vigente', 'completa', 'conciliada', 'conciliado', 'cobrada', 'facturada', 'aprobado_cliente', 'resuelto', 'resuelta', 'emitido', 'surtida', 'liberada', 'atendida', 'cumplida'], warn: ['reportado', 'pendiente', 'observada', 'conciliacion', 'parcial', 'revision_interna', 'revision_contratista', 'lista_autorizar', 'en_revision', 'enviada', 'enviado', 'corregida', 'preparado', 'pendiente_confirmacion', 'propuesto', 'propuesta', 'en_aclaracion', 'faltante', 'sin_desglose', 'pendiente_informacion', 'revisado', 'diferida', 'sugerido', 'solicitada', 'excedida', 'abierta', 'en_proceso', 'diferencia', 'vencido_1_30', 'por_vencer', 'capturada', 'sin_conciliar', 'en_cierre', 'pendiente_clasificar', 'con_ajuste', 'excepcion'], bad: ['rechazado', 'rechazada', 'cancelada', 'cancelado', 'revertido', 'con_reverso', 'rechazado_cliente', 'vencido_31_60', 'vencido_61_90', 'vencido_90_mas', 'incumplida', 'inactivo', 'sustituido', 'sustituida'], info: ['borrador', 'planeacion', 'sin_pago', 'sin_cobro', 'sin_factura', 'opcional', 'absorbido', 'simulado', 'cargado'] };
export function chip(value, label) { const tone = Object.entries(TONE).find(([, l]) => l.includes(value))?.[0] || ''; return h('span', { class: `chip ${tone}` }, label || String(value ?? '—').replace(/_/g, ' ')); }
export function cell(v, col) {
  const t = col.type || 'text';
  if (t === 'status') return v === null || v === undefined ? '—' : chip(v, col.values?.[v]);
  if (t === 'money') return money(v, '—'); if (t === 'qty') return qty(v, col.decimals ?? 2); if (t === 'date') return date(v); if (t === 'instant') return instant(v); if (t === 'bool') return v === null || v === undefined ? '—' : v ? 'Sí' : 'No';
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

// ── API ──
export class ApiError extends Error { constructor(status, data) { super(data?.message || 'No fue posible completar la operación.'); this.status = status; this.data = data || {}; this.code = data?.error; } }
const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
export async function api(method, url, body, { key, raw } = {}) {
  const headers = { 'x-dcl-solicitud': '1' };
  if (method !== 'GET') headers['idempotency-key'] = key || newKey();
  let payload; if (body instanceof Blob || body instanceof ArrayBuffer) { payload = body; headers['content-type'] = 'application/octet-stream'; } else if (body !== undefined) { payload = JSON.stringify(body); headers['content-type'] = 'application/json'; }
  let res;
  try { res = await fetch(url, { method, headers, body: payload, credentials: 'same-origin' }); }
  catch { setOnline(false); throw new ApiError(0, { error: 'sin_conexion', message: 'Sin conexión con el servidor. Nada se guardó; puede reintentar cuando vuelva la conexión.' }); }
  setOnline(true);
  if (raw) return res;
  const ct = res.headers.get('content-type') || ''; const data = ct.includes('json') ? await res.json() : await res.blob();
  if (res.status === 401 && !url.endsWith('/login') && !url.endsWith('/session')) { state.session = null; location.hash = '#/acceso'; throw new ApiError(401, data); }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
export const get = (u) => api('GET', u), post = (u, b, o) => api('POST', u, b ?? {}, o), patch = (u, b) => api('PATCH', u, b), put = (u, b) => api('PUT', u, b), del = (u) => api('DELETE', u);
export function setOnline(v) { if (state.online === v) return; state.online = v; document.dispatchEvent(new CustomEvent('dcl:online')); }
window.addEventListener('online', () => setOnline(true)); window.addEventListener('offline', () => setOnline(false));
export const can = (p) => !!state.session?.permissions?.includes(p);
export const qs = (o) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, v); const s = p.toString(); return s ? `?${s}` : ''; };

// ── Avisos ──
export function toast(msg, tone = '') { const t = h('div', { class: `toast ${tone}`, role: tone === 'bad' ? 'alert' : 'status' }, msg); document.getElementById('toasts').append(t); setTimeout(() => t.remove(), tone === 'bad' ? 9000 : 4200); }
export function errorNote(e) {
  const dta = e.data || {}; const box = h('div', { class: 'note bad', role: 'alert' }, h('b', {}, e.message));
  if (dta.reasons?.length) box.append(h('ul', {}, dta.reasons.map((r) => h('li', {}, r))));
  if (dta.fix) box.append(h('div', { class: 'small' }, 'Cómo corregirlo: ', dta.fix));
  return box;
}
export function showError(e) { if (e?.silent) return; toast(e.message + (e.data?.reasons?.length ? ` ${e.data.reasons.slice(0, 2).join(' ')}` : '') + (e.data?.fix ? ` ${e.data.fix}` : ''), 'bad'); }
export const loading = (n = 4) => h('div', { 'aria-busy': 'true', 'aria-label': 'Cargando' }, Array.from({ length: n }, () => h('div', { class: 'skeleton' })));
export const empty = (title, text, action) => h('div', { class: 'state' }, h('b', {}, title), text || '', action ? h('div', { class: 'actions' }, action) : null);
export function stateFor(e, retry) {
  if (e.status === 403) return h('div', { class: 'state' }, h('b', {}, 'Sin permiso'), 'Su perfil no incluye esta información. Si la necesita, solicítela a dirección.');
  if (e.status === 404) return h('div', { class: 'state' }, h('b', {}, 'No disponible'), e.message);
  return h('div', { class: 'state' }, h('b', {}, e.status === 0 ? 'Sin conexión' : 'No se pudo cargar'), e.message, h('div', {}, h('button', { class: 'btn', onclick: retry }, 'Reintentar')));
}
// Carga con estados de espera, error y sin permiso.
export async function load(el, fn, render) { clear(el).append(loading()); try { const data = await fn(); clear(el); await render(data); } catch (e) { if (e instanceof ApiError) clear(el).append(stateFor(e, () => load(el, fn, render))); else { console.error(e); clear(el).append(h('div', { class: 'state' }, h('b', {}, 'Error inesperado'), String(e.message || e))); } } }

// ── Diálogos y formularios ──
export function dialog({ title, text, body, actions, wide }) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: wide ? 'wide' : '', 'aria-labelledby': 'dlg-t' }); let done = false;
    const close = (v) => { if (done) return; done = true; dlg.close(); dlg.remove(); resolve(v); };
    dlg.append(h('div', { class: 'dbody' }, h('header', {}, h('h2', { id: 'dlg-t' }, title), text ? h('p', {}, text) : null), h('div', { class: 'content' }, body || null),
      h('footer', {}, (actions || [{ label: 'Cerrar', value: null }]).map((a) => h('button', { class: `btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''}`, type: 'button', onclick: async () => { if (a.run) { try { const r = await a.run(); if (r !== false) close(r ?? true); } catch (e) { showError(e); } } else close(a.value); } }, a.label)))));
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(null); }); document.body.append(dlg); dlg.showModal(); dlg.closeDialog = close;
  });
}
export const confirmDialog = (title, text, label = 'Confirmar') => dialog({ title, text, actions: [{ label: 'Cancelar', value: false }, { label, value: true, primary: true }] });

// Campo: { key, label, type: text|textarea|decimal|date|select|check|file|static, options, required, help, value, wide, onchange }
export function field(f, values) {
  const id = `f-${f.key}-${Math.random().toString(36).slice(2, 7)}`; let input; const v = values[f.key] ?? f.value ?? '';
  if (f.type === 'select') { input = h('select', { id }, f.placeholder === false ? null : h('option', { value: '' }, f.placeholder || 'Seleccione…'), (f.options || []).map((o) => h('option', { value: o.id ?? o.value, selected: String(o.id ?? o.value) === String(v) }, o.label))); }
  else if (f.type === 'textarea') input = h('textarea', { id, rows: f.rows || 3 }, v);
  else if (f.type === 'check') input = h('input', { id, type: 'checkbox', checked: !!v });
  else if (f.type === 'static') input = h('div', { id }, f.render ? f.render(values) : String(v));
  else input = h('input', { id, type: f.type === 'date' ? 'date' : f.type === 'password' ? 'password' : 'text', value: v, inputmode: f.type === 'decimal' ? 'decimal' : null, autocomplete: f.autocomplete || 'off', placeholder: f.placeholderText || null, max: f.max || null });
  if (f.required) input.setAttribute('aria-required', 'true'); if (f.disabled) input.disabled = true;
  input.dataset.key = f.key; if (f.onchange) input.addEventListener(f.type === 'select' || f.type === 'check' || f.type === 'date' ? 'change' : 'input', () => f.onchange(read(input, f), input));
  const errEl = h('span', { class: 'err', id: `${id}-e` });
  const lab = f.type === 'check' ? h('label', { class: `f check ${f.wide ? 'wide' : ''}` }, input, h('span', {}, f.label, f.help ? h('span', { class: 'help' }, ` · ${f.help}`) : null)) : h('label', { class: `f ${f.wide || f.type === 'textarea' ? 'wide' : ''}`, for: id }, h('span', {}, f.label, f.required ? ' *' : ''), input, f.help ? h('span', { class: 'help' }, f.help) : null, errEl);
  lab.input = input; lab.errEl = errEl; lab.def = f; return lab;
}
const read = (input, f) => (f.type === 'check' ? input.checked : f.type === 'decimal' ? input.value.trim().replace(/,/g, '') : input.value.trim());
export function buildForm(fields, values = {}) {
  const labs = fields.filter(Boolean).map((f) => (f.node ? f.node : field(f, values))); const el = h('div', { class: 'grid' }, labs);
  return { el, labs,
    values() { const out = {}; for (const l of labs) if (l.def && l.def.type !== 'static') out[l.def.key] = read(l.input, l.def); return out; },
    validate() { let ok = true; for (const l of labs) { if (!l.def) continue; const v = read(l.input, l.def); let msg = ''; if (l.def.required && (v === '' || v === false)) msg = 'Dato obligatorio.'; else if (l.def.type === 'decimal' && v !== '' && !/^-?\d+(\.\d+)?$/.test(v)) msg = 'Use un número con punto decimal.'; l.errEl.textContent = msg; l.input.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg && ok) { l.input.focus(); ok = false; } } return ok; },
    setError(key, msg) { const l = labs.find((x) => x.def?.key === key); if (l) { l.errEl.textContent = msg; l.input.setAttribute('aria-invalid', 'true'); l.input.focus(); } },
    dirty: false };
}
// Diálogo con formulario. submit(values) guarda en el servidor; maneja validación y conflictos de edición.
export function formDialog({ title, text, fields, values = {}, submit, submitLabel = 'Guardar', wide, extra, recordVersion }) {
  return new Promise((resolve) => {
    const form = buildForm(fields, values); const dlg = h('dialog', { class: wide ? 'wide' : '' }); const msg = h('div', {}); let version = recordVersion; let busy = false;
    const close = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    const btn = h('button', { class: 'btn primary', type: 'submit' }, submitLabel);
    const f = h('form', { novalidate: true, onsubmit: async (ev) => {
      ev.preventDefault(); if (busy || !form.validate()) return; busy = true; btn.disabled = true; btn.textContent = 'Guardando…'; clear(msg);
      const vals = form.values(); if (version !== undefined) vals.recordVersion = version;
      try { const r = await submit(vals, form); toast('Guardado.', 'ok'); close(r ?? true); }
      catch (e) {
        if (e.code === 'conflicto') { const choice = await conflictDialog(e.data, vals); if (choice === 'reapply') { version = e.data.current.recordVersion; toast('Se tomó la versión actual. Revise y vuelva a guardar.'); } else if (choice === 'reload') close('reload'); }
        else { if (e.data?.field) form.setError(e.data.field, e.message); msg.append(e instanceof ApiError ? errorNote(e) : h('div', { class: 'note bad' }, String(e.message || e))); }
      } finally { busy = false; btn.disabled = false; btn.textContent = submitLabel; }
    } }, h('header', {}, h('h2', {}, title), text ? h('p', {}, text) : null), h('div', { class: 'content' }, form.el, extra ? extra(form) : null, msg), h('footer', {}, h('button', { class: 'btn ghost', type: 'button', onclick: () => confirmLeave(f) && close(null) }, 'Cancelar'), btn));
    f.addEventListener('input', () => { f.dataset.dirty = '1'; });
    dlg.append(f); dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); if (confirmLeave(f)) close(null); }); document.body.append(dlg); dlg.showModal();
  });
}
const confirmLeave = (f) => !f.dataset.dirty || window.confirm('Hay cambios sin guardar. ¿Descartarlos?');
// Conflicto: otra persona guardó antes. Se muestran ambas versiones; nada se sobrescribe en silencio.
function conflictDialog(data, mine) {
  const cur = data.current || {}; const keys = Object.keys(mine).filter((k) => k !== 'recordVersion' && k !== 'reason' && typeof mine[k] !== 'object' && String(mine[k] ?? '') !== String(cur[k] ?? ''));
  return dialog({ title: 'Otra persona modificó este registro', text: 'Compare su captura con la versión guardada antes de decidir. No se perdió nada.', wide: true,
    body: h('div', { class: 'tablewrap' }, h('table', { class: 'cmp' }, h('thead', {}, h('tr', {}, h('th', {}, 'Dato'), h('th', {}, 'Lo que usted capturó'), h('th', {}, 'Versión guardada'))), h('tbody', {}, keys.length ? keys.map((k) => h('tr', {}, h('td', {}, k), h('td', {}, String(mine[k] ?? '—')), h('td', {}, String(cur[k] ?? '—')))) : h('tr', {}, h('td', { colspan: 3 }, 'Los datos que capturó coinciden con la versión guardada.'))))),
    actions: [{ label: 'Descartar lo mío y ver la versión guardada', value: 'reload' }, { label: 'Conservar mi captura y aplicarla sobre la versión guardada', value: 'reapply', primary: true }] });
}
// Pide un motivo y ejecuta la acción.
export async function withReason(title, text, run, { label = 'Motivo', extraFields = [], submitLabel = 'Confirmar' } = {}) {
  return formDialog({ title, text, submitLabel, fields: [...extraFields, { key: 'reason', label, type: 'textarea', required: true, help: 'Queda registrado en el historial.' }], submit: run });
}
export async function act(fn, okMsg) { try { const r = await fn(); if (okMsg) toast(okMsg, 'ok'); return r; } catch (e) { showError(e); throw Object.assign(e, { silent: true }); } }

// ── Componentes de página ──
export function page(title, { sub, crumb, actions } = {}) {
  const body = h('div', {}); const el = h('div', { class: 'page', id: 'contenido', tabindex: '-1' }, h('div', { class: 'head' }, h('div', {}, crumb ? h('div', { class: 'crumb' }, crumb) : null, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div', { class: 'actions' }, actions || null)), body);
  return { el, body };
}
export const card = (title, ...kids) => h('section', { class: 'card' }, title ? h('h2', {}, title) : null, kids);
export const kv = (pairs) => h('dl', { class: 'kv' }, pairs.filter(Boolean).map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v === null || v === undefined || v === '' ? '—' : v))));
export function miniTable(columns, rows, { totals, emptyText = 'Sin registros.', onRow } = {}) {
  if (!rows.length) return h('p', { class: 'muted small' }, emptyText);
  const num = (c) => ['money', 'qty', 'int'].includes(c.type);
  return h('div', { class: 'tablewrap' }, h('table', { class: 'cards-m' }, h('thead', {}, h('tr', {}, columns.map((c) => h('th', { class: num(c) ? 'num' : '', scope: 'col' }, c.label)))),
    h('tbody', {}, rows.map((r) => h('tr', { class: onRow ? 'link' : '', tabindex: onRow ? '0' : null, onclick: onRow ? () => onRow(r) : null, onkeydown: onRow ? (e) => { if (e.key === 'Enter') onRow(r); } : null }, columns.map((c) => h('td', { class: `${num(c) ? 'num' : 'wrap'}`, 'data-l': c.label }, c.render ? c.render(r) : cell(r[c.key], c)))))),
    totals ? h('tfoot', {}, h('tr', {}, columns.map((c, i) => h('td', { class: num(c) ? 'num' : '', 'data-l': c.label }, totals[c.key] !== undefined ? cell(totals[c.key], c) : i === 0 ? 'Total' : '')))) : null));
}
export function tabs(items, current) { return h('nav', { class: 'tabs', 'aria-label': 'Secciones' }, items.filter(Boolean).map((t) => h('a', { href: t.href, 'aria-current': t.key === current ? 'page' : null }, t.label))); }
export const kpi = (c) => h(c.link ? 'a' : 'div', { class: 'kpi', href: c.link || null }, h('span', { class: 't' }, c.n ? `${c.n}. ` : '', c.title || c.label), c.value === null || c.value === undefined ? h('span', { class: 'na' }, 'No disponible') : h('span', { class: 'v' }, c.kind === 'money' ? money(c.value) : c.value, c.unit ? h('span', { class: 'small muted' }, ` ${c.unit}`) : null), c.period ? h('span', { class: 'p' }, c.period) : null, c.detail?.length ? h('ul', {}, c.detail.map((x) => h('li', {}, x))) : null);
export const linkBtn = (label, href, cls = '') => h('a', { class: `btn ${cls}`, href }, label);
export const btn = (label, onclick, cls = '') => h('button', { class: `btn ${cls}`, type: 'button', onclick }, label);
let optCache = {};
export async function options(sets) { const need = sets.filter((s) => !optCache[s]); if (need.length) Object.assign(optCache, await get(`/api/options?sets=${need.join(',')}`)); return Object.fromEntries(sets.map((s) => [s, optCache[s] || []])); }
export const resetOptions = () => { optCache = {}; };

// ── Navegación (hash) con filtros preservados al volver del detalle ──
export function parseHash() { const raw = location.hash.replace(/^#/, '') || '/'; const [path, q = ''] = raw.split('?'); return { path, query: Object.fromEntries(new URLSearchParams(q)) }; }
export function setQuery(patch, { replace = true } = {}) { const { path, query } = parseHash(); const next = { ...query, ...patch }; for (const k of Object.keys(next)) if (next[k] === '' || next[k] === null || next[k] === undefined) delete next[k]; const url = `#${path}${qs(next)}`; if (replace) history.replaceState(null, '', url); else location.hash = url; }
export const go = (hash) => { location.hash = hash; };
export function download(url) { const a = h('a', { href: url, download: '' }); document.body.append(a); a.click(); a.remove(); }

// ── Carga de archivos con progreso, reintento y confirmación del servidor ──
function makeThumb(file) { return new Promise((resolve) => { if (!file.type.startsWith('image/')) return resolve(null); const img = new Image(); const url = URL.createObjectURL(file); img.onload = () => { const s = Math.min(1, 480 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob((b) => resolve(b), 'image/jpeg', 0.72); }; img.onerror = () => { URL.revokeObjectURL(url); resolve(null); }; img.src = url; }); }
export function uploadFile(file, params, onProgress) {
  return new Promise((resolve, reject) => { const x = new XMLHttpRequest(); x.open('POST', `/api/attachments${qs({ name: file.name, ...params })}`); x.setRequestHeader('x-dcl-solicitud', '1'); x.setRequestHeader('content-type', 'application/octet-stream');
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total); x.onerror = () => reject(new ApiError(0, { message: 'Se perdió la conexión durante la carga.' }));
    x.onload = () => { let dta = {}; try { dta = JSON.parse(x.responseText); } catch { /* respuesta no JSON */ } if (x.status >= 400) reject(new ApiError(x.status, dta)); else resolve(dta); }; x.send(file); });
}
// Control de evidencias: una fotografía solo cuenta cuando el servidor confirmó la carga.
export function uploader({ params = {}, accept = 'image/*,application/pdf', capture = true, multiple = true, onDone, label = 'Agregar fotografías o archivos' }) {
  const list = h('div', { class: 'stack' }); const pending = new Set();
  const start = (file) => {
    const bar = h('progress', { max: '1', value: '0' }); const status = h('span', {}, 'Cargando… (todavía no es evidencia)'); const box = h('div', { class: 'up' }, h('b', {}, file.name), bar, status); list.append(box); pending.add(box);
    const run = async () => { box.className = 'up'; status.textContent = 'Cargando… (todavía no es evidencia)';
      try { const r = await uploadFile(file, { ...params, takenAt: params.takenAt || undefined }, (p) => { bar.value = p; }); const th = await makeThumb(file); if (th) await api('POST', `/api/attachments/${r.id}/thumb`, th).catch(() => {});
        box.className = 'up done'; bar.remove(); status.textContent = 'Carga confirmada por el servidor.'; pending.delete(box); await onDone?.(r, file); }
      catch (e) { box.className = 'up fail'; status.textContent = `${e.message} El archivo no se guardó. `; status.append(h('button', { class: 'btn small', type: 'button', onclick: run }, 'Reintentar')); } };
    run();
  };
  const input = h('input', { type: 'file', accept, multiple, class: 'sr', onchange: () => { [...input.files].forEach(start); input.value = ''; } });
  const cam = capture ? h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'sr', onchange: () => { [...cam.files].forEach(start); cam.value = ''; } }) : null;
  input.hidden = true; if (cam) cam.hidden = true;
  const el = h('div', { class: 'stack' }, h('div', { class: 'row' }, cam ? btn('Tomar fotografía', () => cam.click()) : null, btn(label, () => input.click(), 'ghost'), input, cam), h('p', { class: 'small muted' }, 'Las fotografías pendientes no sobreviven si cierra la aplicación: espere la confirmación de cada carga. No se registra ubicación ni fecha de toma que el archivo no declare.'), list);
  el.pendingCount = () => pending.size; return el;
}
export function evidenceGrid(items, { onRemove, toggleClient } = {}) {
  if (!items.length) return h('p', { class: 'muted small' }, 'Sin evidencias cargadas.');
  return h('div', { class: 'thumbs' }, items.map((a) => h('div', { class: 'thumb' }, h('a', { href: `/api/attachments/${a.id}/content`, target: '_blank', rel: 'noopener', title: `${a.name} · se abre en otra pestaña` }, a.isImage ? h('img', { src: `/api/attachments/${a.id}/thumb`, alt: a.caption || a.name, loading: 'lazy' }) : h('div', { class: 'ph' }, 'PDF')), h('span', { title: a.name }, a.caption || a.name),
    toggleClient ? h('label', { class: 'f check small' }, h('input', { type: 'checkbox', checked: !!a.clientVisible, onchange: (e) => toggleClient(a, e.target.checked) }), 'Mostrar al cliente') : null, onRemove ? btn('Quitar', () => onRemove(a), 'small ghost') : null)));
}
