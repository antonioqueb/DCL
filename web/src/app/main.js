import { h, clear, get, post, state, can, parseHash, toast, showError, buildForm, errorNote, ApiError, instant, dialog, btn, icon, empty, router, sheet, GLOSSARY } from './core.js';
import { menu, toggleTheme, isDark, popover } from './ui.js';
import * as operacion from './pages/operacion.js';
import * as contratistas from './pages/contratistas.js';
import * as clientes from './pages/clientes.js';
import * as reportes from './pages/reportes.js';
import * as admin from './pages/admin.js';

const app = document.getElementById('app');
// Resuelve una dirección interna a su pantalla (para abrirla en el panel lateral).
router.resolve = (hash) => { const raw = hash.replace(/^#/, ''); const [path, q = ''] = raw.split('?'); for (const [re, fn] of routes) { const m = re.exec(path); if (m) return { fn, params: m.slice(1), query: Object.fromEntries(new URLSearchParams(q)) }; } return null; };
const routes = [...operacion.routes, ...contratistas.routes, ...clientes.routes, ...reportes.routes, ...admin.routes];

// Navegación agrupada según permisos: [grupo, [ruta, rótulo, icono]…]
function navGroups() {
  const s = state.session; if (!s?.user) return [];
  if (s.audience === 'contratista') return [[null, [['#/', 'Inicio', 'dashboard'], ['#/mis-estimaciones', 'Mis estimaciones', 'hardhat'], ['#/mis-pagos', 'Mis pagos', 'banknote'], ['#/documentos', 'Documentos', 'files']]]];
  if (s.audience === 'cliente') return [[null, [['#/', 'Inicio', 'dashboard'], ['#/mis-documentos', 'Estimaciones', 'sheet'], ['#/documentos', 'Documentos', 'files']]]];
  const any = (...p) => p.some(can);
  return [
    [null, [['#/', 'Inicio', 'dashboard']]],
    ['Operación', [any('works.view') && ['#/obras', 'Obras', 'building'], any('progress.view', 'progress.capture') && ['#/avances', 'Avances', 'ruler'], any('cestimates.view') && ['#/estimaciones-contratistas', 'Estimaciones a contratistas', 'hardhat'], any('close.view') && ['#/cierre', 'Cierre semanal', 'calendarCheck'], any('payments.view') && ['#/pagos', 'Pagos', 'banknote'], any('additionals.report', 'additionals.validate') && ['#/adicionales', 'Adicionales', 'plusCircle']]],
    ['Clientes', [any('budgets.view') && ['#/clientes', 'Clientes y presupuestos', 'clipboard'], any('kestimates.view', 'receivables.view') && ['#/estimaciones-clientes', 'Estimaciones a clientes', 'sheet']]],
    ['Administración', [any('expenses.view', 'supplies.manage') && ['#/gastos', 'Gastos y costos', 'receipt'], any('cash.view', 'pettycash.manage') && ['#/caja', 'Caja y bancos', 'landmark'], any('documents.issue', 'audit.view') && ['#/documentos', 'Documentos', 'files'], any('reports.view', 'results.view', 'close.view', 'payments.view') && ['#/reportes', 'Reportes', 'chart']]],
    ['Sistema', [any('config.manage', 'users.manage', 'catalogs.manage', 'rates.manage', 'import.manage', 'backup.manage', 'audit.view', 'decisions.view', 'catalogs.view') && ['#/configuracion', 'Configuración', 'settings']]],
  ].map(([g, items]) => [g, items.filter(Boolean)]).filter(([, items]) => items.length);
}
const ALIASES = { '/cobranza': '/estimaciones-clientes', '/presupuestos': '/clientes', '/modificaciones': '/clientes', '/auditoria': '/configuracion', '/mis-documentos': '/mis-documentos' };

function shell() {
  const s = state.session; const collapsed = localStorage.getItem('dcl.barra') === '1';
  const root = h('div', { class: `shell ${collapsed ? 'collapsed' : ''}` });
  const toggle = () => { if (window.matchMedia('(max-width: 900px)').matches) root.classList.toggle('mobile-open'); else { const c = root.classList.toggle('collapsed'); localStorage.setItem('dcl.barra', c ? '1' : '0'); } };
  const initials = s.user.name.replace(/\(.*?\)|·.*$/g, '').replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const links = [];
  const body = h('nav', { class: 'sb-body', 'aria-label': 'Principal' }, navGroups().map(([g, items]) => h('div', { class: g ? 'sb-group' : '' }, g ? h('div', { class: 'sb-label' }, g) : null, items.map(([href, label, ic]) => { const a = h('a', { class: 'sb-item', href, 'data-href': href, 'data-tip': label }, icon(ic), h('span', {}, label)); links.push(a); return a; }))));
  const userBtn = h('button', { class: 'sb-user', type: 'button', 'aria-haspopup': 'menu', 'aria-label': 'Cuenta', onclick: () => menu(userBtn, [{ heading: s.user.name }, { label: 'Avisos', icon: 'bell', href: '#/avisos' }, s.audience === 'interno' ? { label: 'Delegaciones', icon: 'key', href: '#/configuracion/delegaciones' } : null, { label: isDark() ? 'Tema claro' : 'Tema oscuro', icon: isDark() ? 'sun' : 'moon', onSelect: toggleTheme }, 'sep', { label: 'Cerrar sesión', icon: 'logout', onSelect: logout }], { align: 'start' }) },
    h('span', { class: 'avatar' }, initials), h('span', { class: 'who' }, h('b', {}, s.user.name), h('span', {}, s.roles.map((r) => r.name).join(' · '))), icon('chevronsUpDown'));
  const side = h('aside', { class: 'sb', id: 'menu' }, h('div', { class: 'sb-head' }, h('img', { class: 'sb-logo', src: '/icons/icon.svg', alt: '' }), h('div', { class: 'sb-brand' }, h('b', {}, 'DCL Instalaciones'), h('span', {}, 'Operación de obras'))), body, h('div', { class: 'sb-foot' }, userBtn));
  const crumbs = h('div', { class: 'crumbs' }); const offline = h('div', { class: 'offline', hidden: true, role: 'alert' }, 'Sin conexión con el servidor. Lo que capture no está guardado; se conserva como borrador en este dispositivo hasta reintentar.');
  const themeBtn = h('button', { class: 'btn ghost icon small', type: 'button', 'aria-label': 'Cambiar tema', 'data-tip': 'Cambiar tema', onclick: () => { toggleTheme(); themeBtn.replaceChildren(icon(isDark() ? 'sun' : 'moon')); } }, icon(isDark() ? 'sun' : 'moon'));
  const view = h('main', {});
  // Avisos en un panel desplegable: se abre el registro sin salir de la pantalla actual.
  const bell = h('button', { class: 'btn ghost small', type: 'button', 'aria-haspopup': 'dialog', 'aria-label': `Avisos${s.unread ? `: ${s.unread} sin leer` : ''}`, onclick: async () => {
    const list = h('div', { class: 'nlist' }, h('div', { class: 'empty' }, 'Cargando…')); const p = popover(bell, h('div', {}, h('div', { class: 'nhead' }, 'Avisos', h('a', { class: 'btn ghost small', href: '#/avisos', onclick: () => p.close() }, 'Ver todos')), list), { align: 'end', cls: 'notif' });
    try { const { items } = await get('/api/notifications'); const portal = s.audience !== 'interno';
      list.replaceChildren(...(items.length ? items.slice(0, 30).map((n) => { const href = portal ? (n.objectType === 'cEstimate' ? `#/mis-estimaciones/${n.objectId}` : n.objectType === 'kEstimate' ? `#/mis-documentos/${n.objectId}` : '#/') : (TARGET[n.objectType]?.(n) || '#/');
        const row = h('div', { class: `n ${n.status === 'nueva' ? 'new' : ''} ${n.priority === 'alta' ? 'high' : ''}` }, h('span', { class: 'mark' }), h('a', { href, onclick: () => { p.close(); post(`/api/notifications/${n.id}/read`).catch(() => {}); } }, n.title, h('small', {}, [n.work, instant(n.createdAt)].filter(Boolean).join(' · '))), h('button', { class: 'btn ghost icon small', type: 'button', 'aria-label': 'Marcar como resuelto', 'data-tip': 'Marcar como resuelto', onclick: async () => { try { await post(`/api/notifications/${n.id}/resolve`); row.remove(); } catch (e) { showError(e); } } }, icon('check'))); return row; }) : [h('div', { class: 'empty' }, 'Sin avisos pendientes.')])); p.place(); } catch (e) { list.replaceChildren(h('div', { class: 'empty' }, e.message)); }
  } }, icon('bell'), s.unread ? h('span', { class: 'count' }, String(s.unread)) : null);
  const main = h('div', { class: 'main' }, h('header', { class: 'topbar' }, h('button', { class: 'btn ghost icon small', type: 'button', 'aria-label': 'Mostrar u ocultar el menú', 'aria-controls': 'menu', 'data-tip': 'Menú (Ctrl+B)', onclick: toggle }, icon('panel')), h('span', { class: 'sep' }), crumbs,
    h('button', { class: 'cmd-btn', type: 'button', 'aria-label': 'Buscar o ir a una pantalla', onclick: palette }, icon('search'), h('span', {}, 'Buscar o ir a…'), h('kbd', { class: 'kbd' }, 'Ctrl K')),
    s.demo ? h('span', { class: 'demo-pill', 'data-tip': 'Datos ficticios: nada corresponde a saldos reales de DCL' }, 'Demostración') : null, h('button', { class: 'btn ghost icon small', type: 'button', 'aria-label': 'Ayuda de esta pantalla', 'data-tip': 'Ayuda de esta pantalla', onclick: help }, icon('info')), themeBtn, bell), offline, view);
  root.append(side, h('div', { class: 'sb-overlay', onclick: () => root.classList.remove('mobile-open') }), main);
  side.addEventListener('click', (e) => { if (e.target.closest('a')) root.classList.remove('mobile-open'); });
  document.addEventListener('dcl:online', () => { offline.hidden = state.online; });
  clear(app).append(root);
  return { view, links, crumbs, toggle };
}
// Ayuda en contexto: qué se hace en la pantalla actual y qué significan sus términos.
const GUIDE = {
  '/': ['Inicio', ['La bandeja "Mi trabajo" reúne lo que espera una acción suya; lo urgente va primero.', 'Los botones de la derecha ejecutan la acción directa (autorizar, revisar, confirmar). El título abre el registro.', 'Las tarjetas muestran el estado de la semana y abren su detalle.']],
  '/obras': ['Obras', ['Cada obra reúne su expediente: ubicaciones, presupuesto, avances, estimaciones, pagos, cobros, costos y planos.', 'Registre primero las ubicaciones (nivel, zona, habitación): se usan en cada captura.', 'Asigne supervisores y contratistas con su fecha; al sustituirlos se conserva quién midió qué.']],
  '/avances': ['Avances', ['El supervisor captura obra, ubicación, concepto y cantidad, con fotografías cuando el concepto las exige.', '"Revisar pendientes" permite validar varios avances a la vez.', 'Un avance validado no se edita: se corrige con un ajuste que requiere autorización.', 'Cada avance se paga al contratista y se cobra al cliente por separado; aquí se ve en qué documento está cada parte.']],
  '/estimaciones-contratistas': ['Estimaciones a contratistas', ['Una por obra, contratista y semana. "Incorporar avances validados" trae lo que aún no está en otro documento.', 'La guía de pasos indica en qué etapa está y a quién le toca.', 'El contratista acepta u observa; al resolver una observación se crea una versión nueva que debe aceptar otra vez.', 'Autorizar congela cantidades y tarifas y crea la obligación de pago.']],
  '/cierre': ['Cierre semanal', ['Siga los cuatro pasos: captura completa, documentos revisados, liquidación y confirmación.', 'En la liquidación se reparte el bruto entre banco, descuentos, anticipos y efectivo. El efectivo se calcula solo.', 'Confirmar emite el cierre con folio y genera instrucciones para tesorería; no mueve dinero.', 'Lo que llegue después entra como complemento, con su motivo.']],
  '/pagos': ['Pagos', ['La obligación nace al autorizar. Se paga preparando un desembolso, que dirección autoriza y tesorería confirma.', 'Solo un pago confirmado (con recibo o referencia) reduce el saldo.', 'Un pago equivocado se revierte; no se borra.']],
  '/adicionales': ['Adicionales', ['Tres decisiones separadas: que el trabajo existe, cuánto se paga al contratista y si se cobra al cliente.', '"Expuesto" es lo autorizado a pagar sin cobro asegurado.', 'Las incidencias llevan responsable, fecha compromiso y cierre con evidencia.']],
  '/clientes': ['Clientes y presupuestos', ['El presupuesto se maneja por versiones; solo una está vigente.', 'Aditivas y deductivas modifican el contrato únicamente cuando se aprueban.', 'Las condiciones (anticipo, amortización, retención, impuesto) son de cada contrato.']],
  '/estimaciones-clientes': ['Estimaciones a clientes', ['Periodo libre, independiente del cierre semanal.', 'Use la vista previa para ver exactamente lo que verá el cliente antes de publicar.', 'El cliente puede aceptar todo o por partida; lo no aceptado vuelve a quedar disponible.', 'En Cuentas por cobrar se registran facturas, cobros y gestión de cobranza.']],
  '/gastos': ['Gastos y costos', ['Capture el comprobante una vez y distribúyalo entre obras, administración o stock.', 'Al autorizar se reconoce el costo y nace la obligación con el proveedor; el pago es otro paso.', 'Las alertas de duplicado son para revisar: no eliminan nada.']],
  '/caja': ['Caja y bancos', ['Los saldos se calculan del saldo inicial más los movimientos confirmados.', 'Una transferencia entre cuentas propias no es ingreso ni gasto.', 'En conciliación, una coincidencia sugerida debe aceptarse; no confirma nada por sí sola.']],
  '/documentos': ['Documentos', ['Aquí quedan las copias emitidas, con su versión. Emitir no es enviar.', 'Para compartir, publique en el portal del destinatario o cree un enlace restringido y cópielo.']],
  '/reportes': ['Reportes', ['El tablero resume; la biblioteca tiene reportes listos; el explorador permite armar el suyo.', 'En el explorador elija qué medir, cómo agruparlo y el periodo. Pulse una barra para ver sus registros.', '"Guardar" lo deja en Mis reportes.']],
  '/configuracion': ['Configuración', ['Catálogos, tarifas, usuarios, roles, delegaciones y parámetros.', 'Las tarifas no se editan: se crea una versión nueva con su vigencia.', 'En "Decisiones pendientes" está lo que dirección debe validar.']],
};
function help() {
  const top = `/${parseHash().path.split('/')[1] || ''}`; const key = GUIDE[top] ? top : ALIASES[top] && GUIDE[ALIASES[top]] ? ALIASES[top] : '/'; const [title, tips] = GUIDE[key];
  sheet(h('div', { class: 'page guide' }, h('h1', {}, `Ayuda: ${title}`), h('h3', {}, 'Cómo se usa'), h('ol', {}, tips.map((t) => h('li', {}, t))), h('h3', {}, 'Atajos'), h('ul', {}, h('li', {}, 'Ctrl + K: buscar un registro o ir a una pantalla.'), h('li', {}, 'Ctrl + B: mostrar u ocultar el menú.'), h('li', {}, 'En un listado, un clic abre el detalle en un panel; Ctrl + clic lo abre en página completa.')), h('h3', {}, 'Qué significa cada término'), h('dl', {}, Object.entries(GLOSSARY).map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))))), { label: 'Ayuda' });
}
let ui = null;
document.addEventListener('keydown', (e) => { if (!(e.ctrlKey || e.metaKey) || !ui) return; const k = e.key.toLowerCase(); if (k === 'b') { e.preventDefault(); ui.toggle(); } else if (k === 'k') { e.preventDefault(); palette(); } });

// Paleta de comandos: ir a cualquier pantalla o encontrar un registro por folio, obra o nombre.
function palette() {
  if (document.querySelector('dialog.cmd')) return;
  const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const screens = navGroups().flatMap(([g, items]) => items.map(([href, label, ic]) => ({ type: g || 'Pantalla', label, href, ic })));
  const quick = [can('progress.capture') && { type: 'Acción', label: 'Capturar avance', href: '#/avances/capturar', ic: 'plus' }, can('progress.validate') && { type: 'Acción', label: 'Revisar avances pendientes', href: '#/avances/revision', ic: 'ok' }, can('expenses.capture') && { type: 'Acción', label: 'Capturar gasto', href: '#/gastos', ic: 'plus' }, state.session.audience === 'interno' && { type: 'Acción', label: 'Nuevo análisis de reportes', href: '#/reportes/explorar', ic: 'chart' }, state.session.audience === 'interno' && { type: 'Acción', label: 'Biblioteca de reportes', href: '#/reportes/biblioteca', ic: 'chart' }, { type: 'Acción', label: 'Avisos', href: '#/avisos', ic: 'bell' }].filter(Boolean);
  const input = h('input', { type: 'text', placeholder: 'Escriba un folio, una obra, un nombre o una pantalla…', 'aria-label': 'Buscar' }); const list = h('div', { class: 'list', role: 'listbox' });
  const dlg = h('dialog', { class: 'cmd' }, h('div', { class: 'search' }, icon('search'), input), list, h('div', { class: 'foot' }, h('span', {}, '↑ ↓ para moverse'), h('span', {}, 'Enter para abrir'), h('span', {}, 'Esc para cerrar')));
  let items = [], active = 0, timer, seq = 0; const close = () => { dlg.close(); dlg.remove(); };
  const paint = () => { list.replaceChildren(...(items.length ? items.map((it, i) => h('a', { class: 'opt', href: it.href, role: 'option', 'data-active': i === active ? '' : null, onclick: close, onmousemove: () => { if (active !== i) { active = i; paint(); } } }, icon(it.ic || 'fileText'), h('span', {}, it.label, it.sub ? h('span', { class: 'sub' }, ` · ${it.sub}`) : null), h('small', {}, it.type))) : [h('div', { class: 'empty' }, 'Sin resultados. Pruebe con el folio o parte del nombre.')])); list.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' }); };
  const search = () => { const q = norm(input.value).trim(); const local = [...quick, ...screens].filter((x) => !q || norm(x.label).includes(q)); items = local; active = 0; paint();
    if (q.length >= 2) { const my = ++seq; clearTimeout(timer); timer = setTimeout(async () => { try { const r = await get(`/api/search?q=${encodeURIComponent(input.value)}`); if (my !== seq) return; items = [...local, ...r.items]; paint(); } catch { /* sin conexión: quedan las pantallas */ } }, 180); } };
  input.addEventListener('input', search);
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { active = Math.min(items.length - 1, active + 1); paint(); e.preventDefault(); } else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); paint(); e.preventDefault(); } else if (e.key === 'Enter' && items[active]) { e.preventDefault(); location.hash = items[active].href; close(); } });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg); dlg.showModal(); search(); input.focus();
}

async function render() {
  if (!state.session?.user) return loginScreen();
  if (state.session.user.mustChangePassword) return passwordScreen();
  if (!ui) ui = shell();
  const { path, query } = parseHash(); const top = `/${path.split('/')[1] || ''}`; const navPath = ALIASES[top] || top; let current = null;
  for (const a of ui.links) { const href = a.dataset.href.slice(1); const on = href === '/' ? path === '/' : navPath === href; a.toggleAttribute('aria-current', false); if (on) { a.setAttribute('aria-current', 'page'); current = a.dataset.tip; } }
  clear(ui.crumbs).append(h('span', {}, 'DCL'), icon('chevronRight'), h('b', {}, current || (path === '/avisos' ? 'Avisos' : 'Detalle')));
  for (const [re, fn] of routes) { const m = re.exec(path); if (m) { try { const node = await fn(m.slice(1), query); clear(ui.view).append(node); } catch (e) { console.error(e); clear(ui.view).append(h('div', { class: 'page' }, e instanceof ApiError ? errorNote(e) : h('div', { class: 'note bad' }, String(e.message || e)))); } return; } }
  clear(ui.view).append(h('div', { class: 'page' }, empty('Página no encontrada', 'La dirección no corresponde a ninguna pantalla.', h('a', { class: 'btn', href: '#/' }, 'Volver al inicio'))));
}
let lastPath = null;
window.addEventListener('hashchange', () => { const { path } = parseHash(); if (path !== lastPath) window.scrollTo(0, 0); lastPath = path; render(); });

async function logout() {
  // Política de cierre de sesión: se conservan únicamente los borradores de texto de captura, por usuario y obra.
  const drafts = Object.keys(localStorage).filter((k) => k.startsWith('dcl.borrador.')).length;
  if (drafts && !(await dialog({ title: 'Tiene borradores sin enviar', text: `Hay ${drafts} borrador(es) de captura guardado(s) solo en este dispositivo. Se conservarán para su próxima sesión en este mismo equipo; no están en el servidor.`, actions: [{ label: 'Cancelar', value: false }, { label: 'Salir de todos modos', value: true, primary: true }] }))) return;
  await post('/api/logout').catch(() => {}); state.session = null; ui = null; location.hash = '#/acceso'; render();
}

function authLayout(box) {
  return h('div', { class: 'login' }, h('div', { class: 'login-art' }, h('div', { class: 'mark' }, h('img', { src: '/icons/icon.svg', alt: '' }), 'DCL Instalaciones'),
    h('blockquote', {}, 'El trabajo en obra se registra una sola vez y se sigue hasta la autorización, el pago al contratista y el cobro al cliente.', h('footer', {}, 'Plataforma operativa'))), h('div', { class: 'login-form' }, box));
}
function loginScreen() {
  ui = null; const s = state.session || {}; const msg = h('div', {});
  const form = buildForm([{ key: 'username', label: 'Usuario', required: true, autocomplete: 'username' }, { key: 'password', label: 'Contraseña', type: 'password', required: true, autocomplete: 'current-password' }]);
  const enter = async (u, p) => { clear(msg); try { await post('/api/login', { username: u, password: p }); await boot(); if (location.hash === '#/acceso' || !location.hash) location.hash = '#/'; else render(); } catch (e) { msg.append(errorNote(e)); } };
  const box = h('div', { class: 'box' }, h('h1', {}, 'Iniciar sesión'), h('p', { class: 'sub' }, 'Entre con su usuario para continuar.'),
    h('form', { onsubmit: (e) => { e.preventDefault(); if (form.validate()) { const v = form.values(); enter(v.username, v.password); } } }, form.el, msg, h('button', { class: 'btn primary', type: 'submit' }, 'Entrar')),
    s.demo && s.demoAccounts?.length ? h('div', {}, h('div', { class: 'divider' }, 'Demostración · datos ficticios'), h('div', { class: 'demoacc' }, s.demoAccounts.map((a) => { const [name, role] = a.name.split(' · '); return h('button', { class: 'btn', type: 'button', onclick: () => enter(a.username, s.demoPassword) }, h('b', {}, name.replace(' (demo)', '')), h('span', {}, role || name.replace(/ \(demo\)/, ''))); }))) : null);
  clear(app).append(authLayout(box));
}
function passwordScreen() {
  ui = null; const msg = h('div', {}); const form = buildForm([{ key: 'current', label: 'Contraseña temporal', type: 'password', required: true }, { key: 'next', label: 'Nueva contraseña', type: 'password', required: true, autocomplete: 'new-password', help: 'Mínimo 10 caracteres.' }]);
  clear(app).append(authLayout(h('div', { class: 'box' }, h('h1', {}, 'Defina su contraseña'), h('p', { class: 'sub' }, 'Por seguridad, cambie la contraseña temporal antes de continuar.'), h('form', { onsubmit: async (e) => { e.preventDefault(); clear(msg); if (!form.validate()) return; try { await post('/api/password', form.values()); toast('Contraseña actualizada.', 'ok'); await boot(); render(); } catch (er) { msg.append(errorNote(er)); } } }, form.el, msg, h('button', { class: 'btn primary', type: 'submit' }, 'Guardar')))));
}

// Avisos internos: cada uno abre su objeto de negocio.
const TARGET = { progressEntry: (n) => `#/avances/${n.objectId}`, progressAdjustment: () => '#/avances?f.status=validado', cEstimate: (n) => `#/estimaciones-contratistas/${n.objectId}`, observation: () => '#/estimaciones-contratistas?f.status=conciliacion', obligation: (n) => `#/pagos/obligacion/${n.objectId}`, disbursement: (n) => `#/pagos/desembolso/${n.objectId}`, payComponent: () => '#/cierre', weeklyClose: (n) => `#/cierre/emitido/${n.objectId}`, additional: (n) => `#/adicionales/${n.objectId}`, incident: () => '#/adicionales/incidencias', kEstimate: (n) => `#/estimaciones-clientes/${n.objectId}`, expense: (n) => `#/gastos/${n.objectId}`, supplyRequest: () => '#/gastos/insumos' };
routes.push([/^\/avisos$/, async () => {
  const el = h('div', { class: 'page' }, h('div', { class: 'head' }, h('div', {}, h('h1', {}, 'Avisos'), h('p', {}, 'Pendientes que requieren su atención. Cada aviso abre el registro correspondiente.'))));
  const { items } = await get('/api/notifications'); const s = state.session; const portal = s.audience !== 'interno';
  if (!items.length) el.append(h('div', { class: 'card' }, empty('Sin avisos pendientes', 'Cuando algo requiera su revisión aparecerá aquí.')));
  else el.append(h('div', { class: 'tablewrap' }, h('table', { class: 'cards-m' }, h('thead', {}, h('tr', {}, ['Aviso', 'Obra', 'Recibido', 'Estado', ''].map((x) => h('th', {}, x)))), h('tbody', {}, items.map((n) => { const href = portal ? (n.objectType === 'cEstimate' ? `#/mis-estimaciones/${n.objectId}` : n.objectType === 'kEstimate' ? `#/mis-documentos/${n.objectId}` : '#/') : (TARGET[n.objectType]?.(n) || '#/');
    return h('tr', {}, h('td', { 'data-l': 'Aviso' }, n.title), h('td', { 'data-l': 'Obra' }, n.work || '—'), h('td', { 'data-l': 'Recibido' }, instant(n.createdAt)), h('td', { 'data-l': 'Estado' }, n.priority === 'alta' ? h('span', { class: 'chip bad' }, 'Prioridad alta') : n.status === 'nueva' ? h('span', { class: 'chip info' }, 'Nuevo') : h('span', { class: 'chip' }, 'Leído')),
      h('td', { class: 'rich' }, h('div', { class: 'row' }, h('a', { class: 'btn small', href, onclick: () => post(`/api/notifications/${n.id}/read`).catch(() => {}) }, 'Abrir'), btn('Resuelto', async () => { try { await post(`/api/notifications/${n.id}/resolve`); await boot(); render(); } catch (e) { showError(e); } }, 'small ghost')))); })))));
  return el;
}], [/^\/acceso$/, async () => { location.hash = '#/'; return h('div', {}); }]);

async function boot() { state.session = await get('/api/session'); ui = null; }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
boot().then(render).catch((e) => { clear(app).append(h('div', { class: 'boot' }, h('div', { class: 'state' }, icon('offline'), h('b', {}, 'No se pudo conectar con el servidor'), h('span', {}, e.message), h('div', {}, btn('Reintentar', () => location.reload()))))); });
