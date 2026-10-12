import { h, clear, get, post, state, can, parseHash, toast, showError, buildForm, errorNote, ApiError, instant, dialog, btn } from './core.js';
import * as operacion from './pages/operacion.js';
import * as contratistas from './pages/contratistas.js';
import * as clientes from './pages/clientes.js';
import * as admin from './pages/admin.js';

const app = document.getElementById('app');
const routes = [...operacion.routes, ...contratistas.routes, ...clientes.routes, ...admin.routes];

function navItems() {
  const s = state.session; if (!s?.user) return [];
  if (s.audience === 'contratista') return [['#/', 'Inicio'], ['#/mis-estimaciones', 'Mis estimaciones'], ['#/mis-pagos', 'Mis pagos'], ['#/documentos', 'Documentos']];
  if (s.audience === 'cliente') return [['#/', 'Inicio'], ['#/mis-documentos', 'Estimaciones'], ['#/documentos', 'Documentos']];
  const any = (...p) => p.some(can);
  return [['#/', 'Inicio'], any('works.view') && ['#/obras', 'Obras'], any('progress.view', 'progress.capture') && ['#/avances', 'Avances'], any('cestimates.view') && ['#/estimaciones-contratistas', 'Estimaciones a contratistas'], any('close.view') && ['#/cierre', 'Cierre semanal'], any('payments.view') && ['#/pagos', 'Pagos'],
    any('additionals.report', 'additionals.validate') && ['#/adicionales', 'Adicionales'], any('budgets.view') && ['#/clientes', 'Clientes y presupuestos'], any('kestimates.view', 'receivables.view') && ['#/estimaciones-clientes', 'Estimaciones a clientes'], any('expenses.view', 'supplies.manage') && ['#/gastos', 'Gastos y costos'], any('cash.view', 'pettycash.manage') && ['#/caja', 'Caja y bancos'],
    any('documents.issue', 'audit.view') && ['#/documentos', 'Documentos'], any('reports.view', 'results.view', 'close.view', 'payments.view') && ['#/reportes', 'Reportes'], any('config.manage', 'users.manage', 'catalogs.manage', 'rates.manage', 'import.manage', 'backup.manage', 'audit.view', 'decisions.view', 'catalogs.view') && ['#/configuracion', 'Configuración']].filter(Boolean);
}

function shell() {
  const s = state.session; const side = h('aside', { class: 'side', id: 'menu' });
  const nav = h('nav', { class: 'nav', 'aria-label': 'Principal' }, navItems().map(([href, label]) => h('a', { href, 'data-href': href }, label)));
  side.append(h('div', { class: 'brand' }, h('img', { src: '/icons/icon.svg', alt: '' }), h('div', {}, h('b', {}, 'DCL INSTALACIONES'), h('span', {}, 'Operación de obras'))), nav,
    h('div', { class: 'who' }, h('b', {}, s.user.name), s.roles.map((r) => r.name).join(' · '), h('div', { class: 'row' }, h('a', { class: 'btn small', href: '#/avisos' }, 'Avisos', s.unread ? h('span', { class: 'badge' }, String(s.unread)) : null), btn('Salir', logout, 'small'))));
  const main = h('div', { class: 'main' }); const offline = h('div', { class: 'offline', hidden: true, role: 'alert' }, 'Sin conexión con el servidor. Lo que capture no está guardado; se conserva como borrador en este dispositivo hasta reintentar.');
  const view = h('main', {});
  main.append(h('div', { class: 'topbar' }, h('button', { class: 'btn small', 'aria-controls': 'menu', 'aria-expanded': 'false', onclick: (e) => { const open = side.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(open)); } }, 'Menú'), h('b', {}, 'DCL'), h('a', { class: 'btn small', href: '#/avisos' }, s.unread ? `Avisos (${s.unread})` : 'Avisos')),
    s.demo ? h('div', { class: 'demo' }, 'DEMOSTRACIÓN · Datos ficticios. Nada de lo que ve corresponde a saldos reales de DCL.') : null, offline, view);
  document.addEventListener('dcl:online', () => { offline.hidden = state.online; });
  side.addEventListener('click', (e) => { if (e.target.closest('a')) side.classList.remove('open'); });
  clear(app).append(h('div', { class: 'shell' }, side, main));
  return { view, nav };
}
let ui = null;

async function render() {
  if (!state.session?.user) return loginScreen();
  if (state.session.user.mustChangePassword) return passwordScreen();
  if (!ui) ui = shell();
  const { path, query } = parseHash();
  for (const a of ui.nav.querySelectorAll('a')) { const href = a.dataset.href.slice(1); a.toggleAttribute('aria-current', false); if (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`)) a.setAttribute('aria-current', 'page'); }
  for (const [re, fn] of routes) { const m = re.exec(path); if (m) { try { const node = await fn(m.slice(1), query); clear(ui.view).append(node); } catch (e) { console.error(e); clear(ui.view).append(h('div', { class: 'page' }, e instanceof ApiError ? errorNote(e) : h('div', { class: 'note bad' }, String(e.message || e)))); } return; } }
  clear(ui.view).append(h('div', { class: 'page' }, h('div', { class: 'state' }, h('b', {}, 'Página no encontrada'), h('a', { href: '#/' }, 'Volver al inicio'))));
}
let lastPath = null;
window.addEventListener('hashchange', () => { const { path } = parseHash(); if (path !== lastPath) window.scrollTo(0, 0); lastPath = path; render(); });

async function logout() {
  // Política de cierre de sesión: se conservan únicamente los borradores de texto de captura, por usuario y obra.
  const drafts = Object.keys(localStorage).filter((k) => k.startsWith('dcl.borrador.')).length;
  if (drafts && !(await dialog({ title: 'Tiene borradores sin enviar', text: `Hay ${drafts} borrador(es) de captura guardado(s) solo en este dispositivo. Se conservarán para su próxima sesión en este mismo equipo; no están en el servidor.`, actions: [{ label: 'Cancelar', value: false }, { label: 'Salir de todos modos', value: true, primary: true }] }))) return;
  await post('/api/logout').catch(() => {}); state.session = null; ui = null; location.hash = '#/acceso'; render();
}

function loginScreen() {
  ui = null; const s = state.session || {}; const msg = h('div', {});
  const form = buildForm([{ key: 'username', label: 'Usuario', required: true, autocomplete: 'username' }, { key: 'password', label: 'Contraseña', type: 'password', required: true, autocomplete: 'current-password' }]);
  const enter = async (u, p) => { clear(msg); try { await post('/api/login', { username: u, password: p }); await boot(); if (location.hash === '#/acceso' || !location.hash) location.hash = '#/'; else render(); } catch (e) { msg.append(errorNote(e)); } };
  const box = h('div', { class: 'box' }, h('h1', {}, 'DCL INSTALACIONES'), h('p', { class: 'muted' }, 'Operación de obras, estimaciones, pagos y cobranza.'),
    h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); if (form.validate()) { const v = form.values(); enter(v.username, v.password); } } }, form.el, msg, h('button', { class: 'btn primary', type: 'submit' }, 'Entrar')),
    s.demo && s.demoAccounts?.length ? h('div', { class: 'stack' }, h('div', { class: 'note warn' }, h('b', {}, 'Conjunto de demostración.'), ' Datos ficticios; elija un perfil para recorrer los flujos.'), h('div', { class: 'demoacc' }, s.demoAccounts.map((a) => h('button', { class: 'btn ghost', type: 'button', onclick: () => enter(a.username, s.demoPassword) }, a.name)))) : null);
  clear(app).append(h('div', { class: 'login' }, box));
}
function passwordScreen() {
  ui = null; const msg = h('div', {}); const form = buildForm([{ key: 'current', label: 'Contraseña temporal', type: 'password', required: true }, { key: 'next', label: 'Nueva contraseña (mínimo 10 caracteres)', type: 'password', required: true, autocomplete: 'new-password' }]);
  clear(app).append(h('div', { class: 'login' }, h('div', { class: 'box' }, h('h1', {}, 'Defina su contraseña'), h('form', { class: 'stack', onsubmit: async (e) => { e.preventDefault(); clear(msg); if (!form.validate()) return; try { await post('/api/password', form.values()); toast('Contraseña actualizada.', 'ok'); await boot(); render(); } catch (er) { msg.append(errorNote(er)); } } }, form.el, msg, h('button', { class: 'btn primary', type: 'submit' }, 'Guardar')))));
}

// Avisos internos: cada uno abre su objeto de negocio.
const TARGET = { progressEntry: (n) => `#/avances/${n.objectId}`, progressAdjustment: () => '#/avances?f.status=validado', cEstimate: (n) => `#/estimaciones-contratistas/${n.objectId}`, observation: () => '#/estimaciones-contratistas?f.status=conciliacion', obligation: (n) => `#/pagos/obligacion/${n.objectId}`, disbursement: (n) => `#/pagos/desembolso/${n.objectId}`, payComponent: () => '#/cierre', weeklyClose: (n) => `#/cierre/emitido/${n.objectId}`, additional: (n) => `#/adicionales/${n.objectId}`, incident: () => '#/adicionales/incidencias', kEstimate: (n) => `#/estimaciones-clientes/${n.objectId}`, expense: (n) => `#/gastos/${n.objectId}`, supplyRequest: () => '#/gastos/insumos' };
routes.push([/^\/avisos$/, async () => {
  const el = h('div', { class: 'page' }, h('div', { class: 'head' }, h('div', {}, h('h1', {}, 'Avisos'), h('p', {}, 'Pendientes que requieren su atención. Cada aviso abre el registro correspondiente.'))));
  const { items } = await get('/api/notifications'); const s = state.session; const portal = s.audience !== 'interno';
  if (!items.length) el.append(h('div', { class: 'card' }, h('div', { class: 'state' }, h('b', {}, 'Sin avisos pendientes'), 'Cuando algo requiera su revisión aparecerá aquí.')));
  else el.append(h('div', { class: 'stack' }, items.map((n) => { const href = portal ? (n.objectType === 'cEstimate' ? `#/mis-estimaciones/${n.objectId}` : n.objectType === 'kEstimate' ? `#/mis-documentos/${n.objectId}` : '#/') : (TARGET[n.objectType]?.(n) || '#/');
    return h('div', { class: 'card' }, h('div', { class: 'row' }, n.priority === 'alta' ? h('span', { class: 'chip bad' }, 'Prioridad alta') : null, n.status === 'nueva' ? h('span', { class: 'chip info' }, 'Nuevo') : h('span', { class: 'chip' }, 'Leído'), h('span', { class: 'muted small' }, instant(n.createdAt), n.work ? ` · ${n.work}` : '', n.dueDate ? ` · vence ${n.dueDate}` : '')), h('p', {}, h('b', {}, n.title)),
      h('div', { class: 'row' }, h('a', { class: 'btn small primary', href, onclick: () => post(`/api/notifications/${n.id}/read`).catch(() => {}) }, 'Abrir'), btn('Marcar como resuelto', async () => { try { await post(`/api/notifications/${n.id}/resolve`); await boot(); render(); } catch (e) { showError(e); } }, 'small ghost'))); })));
  return el;
}], [/^\/acceso$/, async () => { location.hash = '#/'; return h('div', {}); }]);

async function boot() { state.session = await get('/api/session'); ui = null; }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
boot().then(render).catch((e) => { clear(app).append(h('div', { class: 'state' }, h('b', {}, 'No se pudo conectar con el servidor'), e.message, h('div', {}, btn('Reintentar', () => location.reload())))); });
