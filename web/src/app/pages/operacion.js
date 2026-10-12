// Inicio, obras (expediente operativo), captura y revisión de avances, adicionales, incidencias y jornadas.
import { peek } from '../core.js';
import { h, clear, get, post, patch, del, state, can, page, card, kv, kpi, miniTable, tabs, btn, linkBtn, money, qty, date, instant, chip, load, formDialog, withReason, act, toast, showError, errorNote, options, uploader, evidenceGrid, today, go, dialog, empty, qs, parseHash } from '../core.js';
import { listView } from '../table.js';
import { budgetTab, plansTab } from './clientes.js';
import { bars, lines, donut } from '../charts.js';

// ───────── Inicio por rol ─────────
async function home() {
  const ses = state.session; const internal = ses.audience === 'interno'; const first = String(ses.user.name || '').split(/[\s(·]/)[0]; const hr = new Date().getHours();
  const p = page(`${hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches'}${first ? `, ${first}` : ''}`, { sub: internal ? 'Esto es lo que espera una acción suya y cómo va la semana.' : 'Documentos que requieren su revisión.',
    actions: [can('close.view') ? linkBtn('Ir al cierre semanal', '#/cierre', '') : null, can('progress.capture') ? linkBtn('Capturar avance', '#/avances/capturar', 'primary') : null] });
  p.el.classList.add('home'); const week = h('div', { class: 'home-week' }); const stats = h('div', { class: 'stats' }); const inbox = h('div', {}); const side = h('div', { class: 'home-side' }); const lower = h('div', { class: 'chart-grid' }); const foot = h('p', { class: 'small muted' });
  p.body.append(week, stats, h('div', { class: 'home-grid' }, inbox, side), lower, foot);
  let expanded = false; const LIMIT = 6;
  const drawInbox = () => get('/api/home/tasks').then((t) => {
    const total = t.total ?? t.items.length; const head = h('div', { class: 'inbox-head' }, h('h2', {}, 'Mi trabajo'), h('span', { class: 'muted small' }, total ? `${total} pendiente${total === 1 ? '' : 's'}` : 'Al día'));
    if (!t.items.length) { clear(inbox).append(h('div', { class: 'inbox' }, head, empty('Está al día', 'No hay pendientes que esperen una acción suya.'))); return; }
    const shown = expanded ? t.items : t.items.slice(0, LIMIT); const rows = []; let group = null;
    for (const it of shown) { if (it.group !== group) { group = it.group; rows.push(h('div', { class: 'inbox-group' }, `${group} · ${t.items.filter((x) => x.group === group).length}`)); }
      const run = async () => { if (!(await dialog({ title: `${it.action.label}: ${it.title}`, text: `${it.action.confirm}${it.amount ? ` Importe: ${money(it.amount)}.` : ''}`, actions: [{ label: 'Cancelar', value: false }, { label: it.action.label, value: true, primary: true }] }))) return; try { await post(it.action.url, it.action.body); toast(`${it.title}: hecho.`, 'ok'); drawInbox(); } catch (e) { showError(e); if (e.status === 409 || e.status === 422) peek(it.href, drawInbox); } };
      rows.push(h('div', { class: `task ${it.urgent ? 'urgent' : ''}` }, h('span', { class: 'mark', title: it.urgent ? 'Urgente' : '' }), h('div', { class: 'tx' }, h('a', { href: it.href, onclick: (e) => { if (window.matchMedia('(min-width: 901px)').matches && !e.metaKey && !e.ctrlKey && !it.href.includes('/revision') && !it.href.endsWith('incidencias')) { e.preventDefault(); peek(it.href, drawInbox); } } }, it.title), h('span', {}, it.sub || '')), it.amount ? h('span', { class: 'amt' }, money(it.amount)) : null,
        it.action ? btn(it.action.label, run, 'small primary') : h('a', { class: 'btn small', href: it.href }, it.actionLabel || 'Abrir'))); }
    const more = t.items.length > LIMIT ? h('button', { class: 'inbox-more', type: 'button', onclick: () => { expanded = !expanded; drawInbox(); } }, expanded ? 'Mostrar menos' : `Ver los ${t.items.length - LIMIT} pendientes restantes`) : null;
    clear(inbox).append(h('div', { class: 'inbox' }, head, rows, more));
  }).catch(() => clear(inbox));
  drawInbox();
  // Indicador compacto: cifra, una línea de contexto y el resto del detalle al pasar el cursor.
  const stat = (c) => h(c.link ? 'a' : 'div', { class: 'stat', href: c.link || null, 'data-tip': c.detail?.length ? c.detail.join(' · ') : null }, h('span', { class: 't' }, c.title || c.label), c.value === null || c.value === undefined ? h('span', { class: 'na' }, c.missing || 'No disponible') : h('span', { class: 'v' }, c.kind === 'money' ? money(c.value) : c.value, c.unit ? h('small', {}, ` ${c.unit}`) : null), h('span', { class: 'd' }, c.detail?.[0] || c.period || ' '));
  const mini = (title, desc, chart) => { const el = card(title, h('p', { class: 'card-desc' }, desc), chart); el.classList.add('compact'); return el; };
  try {
    const d = await get('/api/home');
    if (d.period) week.append(h('span', { class: `dot ${d.period.status === 'cerrada' ? 'done' : ''}` }), h('b', {}, `Semana ${d.period.code.slice(6)}`), h('span', {}, `${date(d.period.startDate)} al ${date(d.period.endDate)}`), h('span', { class: 'chip-lite' }, d.period.status === 'cerrada' ? 'Cerrada' : 'Abierta'));
    if (d.cards.length) stats.append(...d.cards.map(stat)); else stats.remove();
    if (d.role === 'direccion') foot.textContent = 'Los importes "expuestos" o "pendientes" son montos por resolver; no son pérdidas comprobadas.';
  } catch (e) { stats.replaceWith(errorNote(e)); }
  if (internal) get('/api/home/charts').then((c) => {
    if (c.weeks?.length) side.append(mini('Mano de obra por semana', 'Autorizado, en revisión y pagado.', bars(h('div', {}), { label: 'Mano de obra por semana', categories: c.weeks.map((w) => w.code.replace(/^\d{4}-/, '')), series: [{ name: 'Autorizado', data: c.weeks.map((w) => w.authorized) }, { name: 'En revisión', data: c.weeks.map((w) => w.inReview), color: '--chart-3' }, { name: 'Pagado', data: c.weeks.map((w) => w.paid), color: '--chart-2' }] })));
    if (c.estimatesByStatus?.length) side.append(mini('Estimaciones por estado', 'Documentos de contratistas en cada etapa.', donut(h('div', {}), { label: 'Estimaciones por estado', money: false, data: c.estimatesByStatus })));
    if (c.works?.length) lower.append(mini('Aprobado por el cliente y costos por obra', 'Trabajo aprobado frente a costos registrados. Resultado parcial.', bars(h('div', {}), { label: 'Aprobado y costos por obra', categories: c.works.map((w) => w.name.replace(' (DEMO)', '')), series: [{ name: 'Aprobado por el cliente', data: c.works.map((w) => w.approved) }, { name: 'Mano de obra', data: c.works.map((w) => w.labour), color: '--chart-3' }, { name: 'Otros costos', data: c.works.map((w) => w.other), color: '--chart-4' }] })));
    if (c.aging?.some((a) => Number(a.value))) lower.append(mini('Saldo por cobrar por antigüedad', 'Según fecha de vencimiento.', bars(h('div', {}), { label: 'Antigüedad de saldos', horizontal: true, categories: c.aging.map((a) => a.name), series: [{ name: 'Saldo', data: c.aging.map((a) => a.value) }] })));
    if (!side.children.length) side.parentElement.classList.add('single');
  }).catch(() => side.parentElement.classList.add('single'));
  else side.parentElement.classList.add('single');
  return p.el;
}

// ───────── Obras ─────────
const W_KIND = { edificio: 'Edificio o frente', nivel: 'Nivel', zona: 'Zona', habitacion: 'Habitación', superficie: 'Superficie o elemento' };
const A_KIND = { supervisor: 'Supervisor', coordinador: 'Coordinación', auxiliar: 'Auxiliar', tesoreria: 'Tesorería', contratista: 'Contratista', cuadrilla: 'Cuadrilla', cliente: 'Cliente' };
async function worksList() {
  const p = page('Obras', { sub: 'Cada obra reúne su expediente: ubicaciones, avances, estimaciones, pagos, cobros y costos.', actions: can('works.manage') ? btn('Nueva obra', newWork, 'primary') : null });
  p.body.append(listView({ endpoint: '/api/works', rowHref: (r) => `#/obras/${r.id}`, emptyText: 'Aún no hay obras registradas o asignadas a usted.' }));
  return p.el;
}
async function newWork() {
  const { clients } = await options(['clients']);
  const r = await formDialog({ title: 'Nueva obra', fields: [{ key: 'name', label: 'Nombre de la obra', required: true, wide: true }, { key: 'code', label: 'Folio', help: 'Si lo deja vacío se asigna uno.' }, { key: 'clientId', label: 'Cliente', type: 'select', options: clients }, { key: 'address', label: 'Dirección', wide: true }, { key: 'startDate', label: 'Inicio', type: 'date' }, { key: 'endDate', label: 'Término previsto', type: 'date' }, { key: 'paymentTerms', label: 'Condiciones de pago', type: 'textarea' }], submit: (v) => post('/api/works', v) });
  if (r?.id) go(`#/obras/${r.id}`);
}
async function workFile([id, tab = 'resumen']) {
  const el = h('div', {});
  await load(el, () => get(`/api/works/${id}`), (w) => {
    const internal = state.session.audience === 'interno';
    const p = page(w.name, { crumb: h('span', {}, h('a', { href: '#/obras' }, 'Obras'), ` › ${w.code}`), sub: [w.client, w.address].filter(Boolean).join(' · '), actions: [chip(w.status, { planeacion: 'Planeación', activa: 'Activa', suspendida: 'Suspendida', cierre_operativo: 'Cierre operativo', cierre_financiero: 'Cierre financiero', archivada: 'Archivada' }[w.status]), w.can?.capture ? linkBtn('Capturar avance', `#/avances/capturar?workId=${w.id}`, 'primary') : null] });
    const T = (key, label, perm) => (!perm || can(perm)) && { key, label, href: `#/obras/${id}/${key}` };
    if (internal) p.body.append(tabs([T('resumen', 'Resumen'), T('ubicaciones', 'Ubicaciones'), T('presupuesto', 'Presupuesto', 'budgets.view'), T('avances', 'Avances', 'progress.view'), T('estimaciones', 'Estimaciones de contratistas', 'cestimates.view'), T('adicionales', 'Adicionales e incidencias', 'additionals.report'), T('pagos', 'Pagos', 'payments.view'), T('cliente', 'Estimaciones y cobros', 'kestimates.view'), T('costos', 'Costos', 'expenses.view'), T('planos', 'Planos'), T('historial', 'Historial', 'audit.view')], tab));
    const body = h('div', { class: 'stack' }); p.body.append(body); const reload = () => workFile([id, tab]).then((n) => el.replaceWith(n));
    const filterTab = (endpoint, rowHref, opts = {}) => listView({ endpoint, rowHref, extra: { 'f.workId': id }, ...opts });
    if (tab === 'resumen') summaryTab(body, w, reload);
    else if (tab === 'ubicaciones') locationsTab(body, w, reload);
    else if (tab === 'presupuesto') budgetTab(body, w);
    else if (tab === 'avances') body.append(filterTab('/api/progress', (r) => `#/avances/${r.id}`, { dateFilter: true }));
    else if (tab === 'estimaciones') body.append(filterTab('/api/c-estimates', (r) => `#/estimaciones-contratistas/${r.id}`));
    else if (tab === 'adicionales') body.append(card('Adicionales', filterTab('/api/additionals', (r) => `#/adicionales/${r.id}`, { prefix: 'a.' })), card('Incidencias', filterTab('/api/incidents', null, { prefix: 'i.' })));
    else if (tab === 'pagos') body.append(filterTab('/api/obligations', (r) => `#/pagos/obligacion/${r.id}`));
    else if (tab === 'cliente') body.append(card('Estimaciones al cliente', filterTab('/api/k-estimates', (r) => `#/estimaciones-clientes/${r.id}`, { prefix: 'k.' })), can('receivables.view') ? card('Cobros', filterTab('/api/receipts', (r) => `#/cobranza/cobros/${r.id}`, { prefix: 'c.' })) : null);
    else if (tab === 'costos') body.append(listView({ endpoint: '/api/expenses', extra: { workId: id }, rowHref: (r) => `#/gastos/${r.id}`, dateFilter: true }));
    else if (tab === 'planos') plansTab(body, w);
    else if (tab === 'historial') load(body, () => get(`/api/history${qs({ collection: 'works', id })}`), (d) => body.append(card('Historial de la obra', historyTable(d.items))));
    clear(el).append(p.el);
  });
  return el;
}
export const historyTable = (items) => miniTable([{ key: 'at', label: 'Fecha', type: 'instant' }, { key: 'actorName', label: 'Quién' }, { key: 'action', label: 'Acción' }, { key: 'objectVersion', label: 'Versión' }, { key: 'reason', label: 'Motivo' }, { key: 'changes', label: 'Cambios', render: (r) => (r.diff && r.kind === 'cambio' ? h('div', { class: 'small' }, Object.entries(r.diff).slice(0, 8).map(([k, [a, b]]) => h('div', {}, `${k}: ${fmt(a)} → ${fmt(b)}`))) : r.kindLabel) }], items, { emptyText: 'Sin movimientos registrados.' });
const fmt = (v) => (v === null || v === undefined ? '—' : typeof v === 'object' ? '(detalle)' : String(v).slice(0, 60));

function summaryTab(body, w, reload) {
  const sum = h('div', {}); body.append(sum);
  load(sum, () => get(`/api/works/${w.id}/summary`), (s) => {
    sum.append(h('p', { class: 'muted small' }, `Cifras al ${date(s.asOf)}. Cada total abre su detalle hasta el registro original.`), h('div', { class: 'cards' }, s.cards.map(kpi)));
    const val = (k) => s.cards.find((x) => x.key === k)?.value; const steps = [['presupuesto', 'Presupuesto vigente'], ['ejecutado', 'Ejecución valorizada'], ['aprobado', 'Aprobado por el cliente'], ['facturado', 'Facturado'], ['cobrado', 'Cobrado']].filter(([k]) => val(k) !== undefined);
    if (steps.length >= 3) sum.append(h('div', { class: 'chart-grid' }, card('Del presupuesto al cobro', h('p', { class: 'card-desc' }, 'Cada etapa es un hecho distinto; ninguna se obtiene de la anterior.'), bars(h('div', {}), { label: 'Del presupuesto al cobro', categories: steps.map(([, l]) => l), series: [{ name: 'Importe', data: steps.map(([k]) => val(k)) }] })),
      s.costs?.byCategory.some((x) => Number(x.amount)) ? card('Costos registrados por categoría', h('p', { class: 'card-desc' }, 'Estimaciones autorizadas y gastos autorizados asignados a la obra.'), donut(h('div', {}), { label: 'Costos por categoría', data: s.costs.byCategory.filter((x) => Number(x.amount)).map((x) => ({ name: x.category.replace(' (estimaciones autorizadas)', ''), value: x.amount })) })) : null));
    if (s.margin) sum.append(card('Margen sobre ejecución (resultado parcial)', kv([['Trabajo aprobado por el cliente', money(s.margin.revenue)], ['Costos registrados', money(s.margin.costs)], ['Diferencia', money(s.margin.amount)], ['Porcentaje', s.margin.pct === null ? 'No calculable (sin trabajo aprobado)' : `${qty(s.margin.pct)} %`]]), h('p', { class: 'small muted' }, s.margin.formula), s.margin.caveat ? h('div', { class: 'note warn' }, s.margin.caveat) : null,
      s.consolidation === 'pendiente_clasificar' ? h('div', { class: 'note warn' }, 'Esta obra está pendiente de clasificar: no se incluye ni se excluye de los resultados de la empresa hasta validarlo.') : null));
    if (s.notBilled?.lines) sum.append(h('div', { class: 'note' }, `${s.notBilled.lines} avance(s) validados todavía no forman parte de una estimación al cliente`, s.notBilled.valued !== null ? ` (valor a precio de presupuesto: ${money(s.notBilled.valued)})` : ' (no valorizable: hay avances sin partida de presupuesto)', '. ', h('a', { href: '#/reportes/ejecucion-no-estimada' }, 'Ver detalle')));
  });
  body.append(card('Datos de la obra', kv([['Folio', w.code], ['Cliente', w.client], ['Inicio', date(w.startDate)], ['Término previsto', date(w.endDate)], ['Condiciones de pago', w.paymentTerms], ['Cierre operativo', date(w.operationalCloseDate)], ['Cierre financiero', date(w.financialCloseDate)], ['Consolidación', { incluida: 'Incluida en resultados', excluida: 'Excluida', pendiente_clasificar: 'Pendiente de clasificar' }[w.consolidation]]]),
    w.can?.manage ? h('div', { class: 'actions' }, btn('Editar', async () => { const { clients } = await options(['clients']); const r = await formDialog({ title: 'Editar obra', recordVersion: w.recordVersion, values: w, fields: [{ key: 'name', label: 'Nombre', required: true, wide: true }, { key: 'clientId', label: 'Cliente', type: 'select', options: clients }, { key: 'address', label: 'Dirección', wide: true }, { key: 'startDate', label: 'Inicio', type: 'date' }, { key: 'endDate', label: 'Término previsto', type: 'date' }, { key: 'status', label: 'Estado', type: 'select', placeholder: false, options: [['planeacion', 'Planeación'], ['activa', 'Activa'], ['suspendida', 'Suspendida'], ['archivada', 'Archivada']].map(([id, label]) => ({ id, label })).concat(['cierre_operativo', 'cierre_financiero'].includes(w.status) ? [{ id: w.status, label: 'Sin cambio (en cierre)' }] : []) }, { key: 'consolidation', label: 'Consolidación en resultados', type: 'select', placeholder: false, options: [{ id: 'incluida', label: 'Incluida' }, { id: 'excluida', label: 'Excluida' }, { id: 'pendiente_clasificar', label: 'Pendiente de clasificar' }] }, { key: 'consolidationNote', label: 'Criterio de consolidación', wide: true }, { key: 'paymentTerms', label: 'Condiciones de pago', type: 'textarea' }, { key: 'reason', label: 'Motivo (obligatorio para reactivar una obra cerrada)', wide: true }], submit: (v) => patch(`/api/works/${w.id}`, v) }); if (r) reload(); }),
      w.can.closeOperational && !w.operationalCloseDate ? btn('Cierre operativo', () => closeWork(w, 'operativo', reload)) : null, w.can.closeFinancial && w.operationalCloseDate && !w.financialCloseDate ? btn('Cierre financiero', () => closeWork(w, 'financiero', reload)) : null) : null));
  const as = card('Responsables, contratistas y cuadrillas', miniTable([{ key: 'kind', label: 'Asignación', render: (r) => A_KIND[r.kind] }, { key: 'who', label: 'Quién' }, { key: 'validFrom', label: 'Desde', type: 'date' }, { key: 'validTo', label: 'Hasta', type: 'date' }, { key: 'x', label: '', render: (r) => (w.can?.manage && !r.validTo ? btn('Terminar', async () => { if (await formDialog({ title: 'Terminar asignación', text: 'La persona conserva la autoría de sus mediciones anteriores.', fields: [{ key: 'validTo', label: 'Último día', type: 'date', value: today(), required: true }, { key: 'note', label: 'Nota' }], submit: (v) => post(`/api/assignments/${r.id}/end`, v) })) reload(); }, 'small ghost') : '') }], w.assignments || []),
    w.can?.manage ? h('div', { class: 'actions' }, btn('Agregar asignación', async () => { const o = await options(['users', 'contractors', 'crews', 'clients']); const kindSel = { key: 'kind', label: 'Tipo', type: 'select', required: true, options: Object.entries(A_KIND).map(([id, label]) => ({ id, label })) };
      if (await formDialog({ title: 'Asignar a la obra', fields: [kindSel, { key: 'userId', label: 'Persona (personal interno)', type: 'select', options: o.users }, { key: 'partyId', label: 'Empresa (contratista o cliente)', type: 'select', options: [...o.contractors, ...o.clients] }, { key: 'crewId', label: 'Cuadrilla', type: 'select', options: o.crews }, { key: 'validFrom', label: 'Desde', type: 'date', value: today(), required: true }, { key: 'note', label: 'Nota', wide: true }], submit: (v) => post(`/api/works/${w.id}/assignments`, v) })) reload(); })) : null);
  body.append(as);
  if (w.closures?.length) body.append(card('Cierres de la obra', miniTable([{ key: 'kind', label: 'Cierre' }, { key: 'date', label: 'Fecha', type: 'date' }, { key: 'authorizedBy', label: 'Autorizó' }, { key: 'ex', label: 'Excepciones', render: (r) => (r.exceptions ? `${r.exceptions.items.length} pendiente(s) autorizados: ${r.exceptions.reason}` : 'Sin excepciones') }], w.closures)));
}
async function closeWork(w, kind, reload) {
  const chk = await get(`/api/works/${w.id}/closure-check?kind=${kind}`); const open = chk.items.filter((i) => !i.ok);
  const list = h('ul', {}, chk.items.map((i) => h('li', {}, i.ok ? '✓ ' : '• ', h('b', {}, i.label), `: ${i.count} `, h('span', { class: 'muted' }, `(${i.detail})`))));
  const r = await formDialog({ title: `Cierre ${kind} de la obra`, text: open.length ? 'Hay pendientes. Puede resolverlos o autorizar el cierre con excepciones; quedarán visibles en el expediente.' : 'Revisión sin pendientes.', fields: [{ key: 'date', label: 'Fecha de cierre', type: 'date', value: today(), required: true }, { key: 'reason', label: open.length ? 'Motivo de las excepciones' : 'Nota', type: 'textarea', required: !!open.length }], extra: () => list, submit: (v) => post(`/api/works/${w.id}/close`, { ...v, kind }) });
  if (r) reload();
}
function locationsTab(body, w, reload) {
  const add = async (parent) => { if (await formDialog({ title: parent ? `Nueva ubicación dentro de ${parent.name}` : 'Nueva ubicación', text: 'La jerarquía conserva la ubicación de cada medición aunque una liquidación agrupe sus importes.', fields: [{ key: 'name', label: 'Nombre', required: true, placeholderText: 'Sótano 1, Baño principal, Fachada alberca…' }, { key: 'kind', label: 'Tipo', type: 'select', required: true, options: Object.entries(W_KIND).map(([id, label]) => ({ id, label })), value: parent ? 'zona' : 'nivel' }], submit: (v) => post(`/api/works/${w.id}/locations`, { ...v, parentId: parent?.id }) })) reload(); };
  const canEdit = w.can?.manage || w.can?.capture;
  body.append(card('Ubicaciones', w.locations.length ? h('ul', { class: 'tree' }, w.locations.map((l) => { const li = h('li', {}, h('span', {}, l.name), h('span', { class: 'k' }, W_KIND[l.kind]), canEdit ? btn('Agregar dentro', () => add(l), 'small ghost') : null); li.style.paddingLeft = `${l.depth * 22}px`; return li; })) : empty('Sin ubicaciones', 'Registre edificio, niveles, zonas y habitaciones antes de capturar avances.'), canEdit ? h('div', { class: 'actions' }, btn('Agregar ubicación', () => add(null), 'primary')) : null));
}

// ───────── Avances ─────────
async function progressList() {
  const p = page('Avances', { sub: 'Mediciones de campo: reportadas por supervisión y validadas antes de pagarse o cobrarse.', actions: [can('progress.validate') ? linkBtn('Revisar pendientes', '#/avances/revision') : null, can('progress.capture') ? linkBtn('Capturar avance', '#/avances/capturar', 'primary') : null] });
  p.body.append(listView({ endpoint: '/api/progress', panel: true, rowHref: (r) => `#/avances/${r.id}`, workFilter: true, dateFilter: true, views: [{ label: 'Todos', query: {} }, { label: 'Por validar', query: { 'f.status': 'reportado' } }, { label: 'Borradores', query: { 'f.status': 'borrador' } }, { label: 'Sin evidencia', query: { 'f.evidenceState': 'faltante' } }, { label: 'Rechazados', query: { 'f.status': 'rechazado' } }, { label: 'Validados', query: { 'f.status': 'validado' } }], emptyText: 'Aún no hay avances capturados.', emptyAction: can('progress.capture') ? linkBtn('Capturar el primero', '#/avances/capturar', 'primary') : null }));
  return p.el;
}
const draftKey = (workId) => `dcl.borrador.${state.session.user.id}.${workId || 'sin-obra'}`;
async function capture(_, query) {
  const p = page('Capturar avance', { crumb: h('a', { href: '#/avances' }, 'Avances'), sub: 'Una visita, una o varias partidas. Cada partida conserva su ubicación, su generador y su evidencia.' });
  const o = await options(['works', 'concepts', 'contractors', 'crews']); const works = o.works.filter((w) => ['activa', 'planeacion', 'cierre_operativo'].includes(w.status));
  if (!works.length) { p.body.append(empty('Sin obras disponibles', 'No tiene obras activas asignadas para capturar.')); return p.el; }
  const concepts = o.concepts.filter((c) => c.catalog === 'contratacion');
  const last = JSON.parse(localStorage.getItem(`dcl.ultima.${state.session.user.id}`) || '{}');
  const S = { workId: query.workId || last.workId || works[0].id, locationId: '', contractorId: last.contractorId || '', executionDate: today(), rows: [], key: crypto.randomUUID() };
  // Borrador local: solo texto, por usuario y obra. No contiene fotografías ni datos de otras obras.
  const saved = localStorage.getItem(draftKey(S.workId)); if (saved) { try { Object.assign(S, JSON.parse(saved)); } catch { /* borrador ilegible */ } }
  const saveDraft = () => { localStorage.setItem(draftKey(S.workId), JSON.stringify(S)); status.textContent = 'Borrador guardado solo en este dispositivo (no está en el servidor).'; };
  const status = h('p', { class: 'small muted', role: 'status' }, saved ? 'Se recuperó un borrador guardado en este dispositivo.' : '');
  const head = h('div', { class: 'grid' }); const rowsEl = h('div', { class: 'stack' }); const msg = h('div', {});
  let locs = [];
  const newRow = () => ({ conceptId: '', mode: 'periodo', qty: '', description: '', workType: 'ordinario', reworkKind: '', useGen: false, gen: [] });
  if (!S.rows.length) S.rows.push(newRow());
  async function drawHead() {
    const w = await get(`/api/works/${S.workId}`); locs = w.locations;
    const sel = (label, key, opts, req) => h('label', { class: 'f' }, `${label}${req ? ' *' : ''}`, h('select', { onchange: (e) => { S[key] = e.target.value; saveDraft(); if (key === 'workId') { S.locationId = ''; drawHead(); } drawRows(); } }, h('option', { value: '' }, 'Seleccione…'), opts.map((x) => h('option', { value: x.id, selected: x.id === S[key] }, x.label))));
    clear(head).append(sel('Obra', 'workId', works, true), sel('Ubicación', 'locationId', locs.map((l) => ({ id: l.id, label: l.path })), true), sel('Contratista', 'contractorId', o.contractors, false),
      h('label', { class: 'f' }, 'Fecha real de ejecución *', h('input', { type: 'date', value: S.executionDate, max: today(), onchange: (e) => { S.executionDate = e.target.value; saveDraft(); } })));
    const recent = (JSON.parse(localStorage.getItem(`dcl.recientes.${state.session.user.id}`) || '{}')[S.workId] || []).map((id) => locs.find((l) => l.id === id)).filter(Boolean);
    if (recent.length) head.append(h('div', { class: 'recent wide' }, 'Recientes:', recent.map((l) => h('button', { class: 'btn small', type: 'button', onclick: () => { S.locationId = l.id; saveDraft(); drawHead(); drawRows(); } }, l.path))));
    if (!locs.length) head.append(h('div', { class: 'note warn wide' }, 'Esta obra no tiene ubicaciones. ', h('a', { href: `#/obras/${S.workId}/ubicaciones` }, 'Regístrelas primero.')));
  }
  function drawRows() {
    clear(rowsEl).append(...S.rows.map((r, i) => {
      const c = concepts.find((x) => x.id === r.conceptId); const ctx = h('div', { class: 'small muted' });
      if (c && S.locationId) get(`/api/progress/context${qs({ workId: S.workId, locationId: S.locationId, conceptId: c.id })}`).then((x) => { ctx.textContent = `Acumulado validado anterior en esta ubicación: ${qty(x.previousValidated)} ${x.unit}${x.evidenceRequired ? ' · este concepto requiere evidencia fotográfica' : ''}`; }).catch(() => {});
      const upd = (k, v, redraw) => { r[k] = v; saveDraft(); if (redraw) drawRows(); };
      const inp = (label, k, extra = {}) => h('label', { class: 'f' }, label, h('input', { type: 'text', inputmode: 'decimal', value: r[k] || '', oninput: (e) => upd(k, e.target.value.trim()), ...extra }));
      const area = c?.unitKind === 'area', lin = c?.unitKind === 'longitud';
      const gen = h('div', { class: 'stack' });
      if (r.useGen) {
        const total = () => { let t = 0; for (const g of r.gen) { const L = Number(g.length || 0), W = Number(g.width || 0), P = Number(g.pieces || 1), D = Number(g.deduction || 0); t += area ? L * W * P - D : lin ? L * P - D : P - D; } return Math.round(t * 10000) / 10000; };
        const tot = h('b', {}, `Vista previa: ${total()} ${c?.unit || ''} (el servidor calcula el resultado definitivo)`);
        gen.append(h('p', { class: 'small muted' }, `Fórmula: ${area ? 'largo × ancho × piezas − deducciones' : lin ? 'longitud × piezas − deducciones' : 'piezas − deducciones'}`),
          ...r.gen.map((g, gi) => { const f = (label, k) => h('label', { class: 'f' }, label, h('input', { type: 'text', inputmode: 'decimal', value: g[k] || '', oninput: (e) => { g[k] = e.target.value.trim(); saveDraft(); tot.textContent = `Vista previa: ${total()} ${c?.unit || ''} (el servidor calcula el resultado definitivo)`; } }));
            return h('div', { class: 'grid' }, h('label', { class: 'f' }, 'Renglón', h('input', { type: 'text', value: g.label || '', oninput: (e) => { g.label = e.target.value; saveDraft(); } })), area || lin ? f(lin ? 'Longitud' : 'Largo', 'length') : null, area ? f('Ancho o alto', 'width') : null, f('Piezas', 'pieces'), f('Deducciones', 'deduction'), btn('Quitar renglón', () => { r.gen.splice(gi, 1); saveDraft(); drawRows(); }, 'small ghost')); }),
          h('div', { class: 'row' }, btn('Agregar renglón', () => { r.gen.push({ pieces: '1' }); saveDraft(); drawRows(); }, 'small'), tot));
      }
      return card(`Partida ${i + 1}`, h('div', { class: 'grid' },
        h('label', { class: 'f wide' }, 'Concepto *', h('select', { onchange: (e) => upd('conceptId', e.target.value, true) }, h('option', { value: '' }, 'Seleccione…'), concepts.map((x) => h('option', { value: x.id, selected: x.id === r.conceptId }, `${x.label} (${x.unit})`)))),
        h('label', { class: 'f' }, 'Modalidad', h('select', { onchange: (e) => upd('mode', e.target.value, true) }, h('option', { value: 'periodo', selected: r.mode === 'periodo' }, 'Cantidad ejecutada en el periodo'), h('option', { value: 'acumulado', selected: r.mode === 'acumulado' }, 'Medición acumulada a la fecha'))),
        r.useGen ? null : inp(`${r.mode === 'acumulado' ? 'Acumulado medido' : 'Cantidad'}${c ? ` (${c.unit})` : ''} *`, 'qty'),
        h('label', { class: 'f' }, 'Tipo de trabajo', h('select', { onchange: (e) => upd('workType', e.target.value, true) }, [['ordinario', 'Ordinario'], ['retrabajo', 'Retrabajo'], ['adicional', 'Adicional']].map(([v, l]) => h('option', { value: v, selected: r.workType === v }, l)))),
        r.workType === 'retrabajo' ? h('label', { class: 'f' }, 'El retrabajo corresponde a *', h('select', { onchange: (e) => upd('reworkKind', e.target.value) }, h('option', { value: '' }, 'Seleccione…'), [['error_instalacion', 'Corrección de un error de instalación'], ['cambio_solicitado', 'Cambio solicitado'], ['trabajo_adicional', 'Trabajo adicional']].map(([v, l]) => h('option', { value: v, selected: r.reworkKind === v }, l)))) : null,
        h('label', { class: 'f wide' }, 'Descripción particular', h('input', { type: 'text', value: r.description || '', oninput: (e) => upd('description', e.target.value) })),
        h('label', { class: 'f check wide' }, h('input', { type: 'checkbox', checked: r.useGen, onchange: (e) => { r.useGen = e.target.checked; if (r.useGen && !r.gen.length) r.gen.push({ pieces: '1' }); saveDraft(); drawRows(); } }), 'Usar generador de medición (largo, ancho, piezas, deducciones)')),
        gen, ctx, r.mode === 'acumulado' ? h('p', { class: 'small muted' }, 'El avance del periodo se calcula restando el último acumulado validado comparable (misma obra, ubicación, concepto y alcance).') : null,
        S.rows.length > 1 ? h('div', { class: 'actions' }, btn('Quitar partida', () => { S.rows.splice(i, 1); saveDraft(); drawRows(); }, 'small ghost')) : null);
    }));
  }
  const send = async () => {
    clear(msg); if (!S.workId || !S.locationId || !S.executionDate) { msg.append(h('div', { class: 'note bad' }, 'Seleccione obra, ubicación y fecha de ejecución.')); return; }
    const entries = S.rows.map((r) => ({ workId: S.workId, locationId: S.locationId, contractorId: S.contractorId || null, executionDate: S.executionDate, conceptId: r.conceptId, mode: r.mode, qty: r.useGen ? undefined : r.qty, generator: r.useGen ? r.gen : undefined, description: r.description, workType: r.workType, reworkKind: r.reworkKind || undefined }));
    if (entries.some((e) => !e.conceptId)) { msg.append(h('div', { class: 'note bad' }, 'Cada partida necesita un concepto.')); return; }
    try {
      // La misma clave en cada reintento evita que un avance se duplique.
      const res = await post('/api/progress', { entries, device: navigator.userAgent.slice(0, 120) }, { key: S.key });
      localStorage.removeItem(draftKey(S.workId)); localStorage.setItem(`dcl.ultima.${state.session.user.id}`, JSON.stringify({ workId: S.workId, contractorId: S.contractorId }));
      { const k = `dcl.recientes.${state.session.user.id}`; const all = JSON.parse(localStorage.getItem(k) || '{}'); all[S.workId] = [S.locationId, ...(all[S.workId] || []).filter((x) => x !== S.locationId)].slice(0, 4); localStorage.setItem(k, JSON.stringify(all)); }
      toast('Captura guardada en el servidor.', 'ok'); const warn = res.results.flatMap((x) => x.warnings || []);
      sessionStorage.setItem('dcl.captura', JSON.stringify({ ids: res.results.map((x) => x.id), warn })); go(`#/avances/evidencias`);
    } catch (e) { saveDraft(); msg.append(errorNote(e)); if (e.status === 0) msg.append(h('div', { class: 'note warn' }, 'La captura NO está guardada. Se conserva el borrador en este dispositivo; pulse "Guardar captura" cuando vuelva la conexión.')); }
  };
  await drawHead(); drawRows();
  p.body.append(card('Visita', head), rowsEl, h('div', { class: 'actions' }, btn('Agregar otro concepto en esta visita', () => { S.rows.push(newRow()); saveDraft(); drawRows(); }), btn('Repetir ubicación en una nueva captura', () => { S.rows = [newRow()]; S.key = crypto.randomUUID(); saveDraft(); drawRows(); toast('Se conservaron obra, ubicación y contratista. Las cantidades y fotografías no se copian.'); }, 'ghost')),
    msg, h('div', { class: 'actions savebar' }, btn('Guardar captura', send, 'primary'), btn('Descartar borrador', () => { localStorage.removeItem(draftKey(S.workId)); go('#/avances'); }, 'ghost')), status);
  return p.el;
}
// Segundo paso de la captura: evidencias con carga confirmada y envío a revisión.
async function captureEvidence() {
  const p = page('Evidencias y envío', { crumb: h('a', { href: '#/avances' }, 'Avances'), sub: 'Adjunte las fotografías de cada partida y envíe a revisión. Una fotografía pendiente no cuenta como evidencia.' });
  const d = JSON.parse(sessionStorage.getItem('dcl.captura') || '{"ids":[]}'); if (!d.ids.length) { p.body.append(empty('Sin captura reciente', '', linkBtn('Capturar avance', '#/avances/capturar', 'primary'))); return p.el; }
  for (const w of d.warn || []) p.body.append(h('div', { class: 'note warn' }, w.message));
  const blocks = [];
  for (const id of d.ids) { const e = await get(`/api/progress/${id}`); const grid = h('div', {}); const refresh = async () => clear(grid).append(evidenceGrid((await get(`/api/evidence${qs({ objectType: 'progressEntry', objectId: id })}`)).items));
    const up = uploader({ params: { kind: 'foto', workId: e.workId }, onDone: async (a) => { await post('/api/evidence', { attachmentId: a.id, objectType: 'progressEntry', objectId: id }); refresh(); } }); blocks.push({ e, up });
    p.body.append(card(`${e.concept} · ${e.location}`, h('p', {}, `${qty(e.qty)} ${e.unit} · `, e.evidenceRequired ? chip('faltante', 'Evidencia obligatoria') : chip('opcional', 'Evidencia opcional')), up, grid)); refresh(); }
  p.body.append(h('div', { class: 'actions' }, btn('Enviar a revisión', async () => {
    if (blocks.some((b) => b.up.pendingCount())) { toast('Hay cargas en curso. Espere la confirmación de cada fotografía.', 'bad'); return; }
    const missing = []; for (const b of blocks) { const n = (await get(`/api/evidence${qs({ objectType: 'progressEntry', objectId: b.e.id })}`)).items.length; if (b.e.evidenceRequired && !n) missing.push(b.e.concept); }
    if (missing.length && !(await dialog({ title: 'Falta evidencia obligatoria', text: `Sin fotografía: ${missing.join(', ')}. Puede enviar, pero no podrá validarse hasta cargar la evidencia o autorizar una excepción con motivo.`, actions: [{ label: 'Volver a cargar', value: false }, { label: 'Enviar así', value: true, primary: true }] }))) return;
    try { for (const b of blocks) if (b.e.status === 'borrador') await post(`/api/progress/${b.e.id}/submit`); sessionStorage.removeItem('dcl.captura'); toast('Enviado a revisión.', 'ok'); go('#/avances?mine=1'); } catch (e) { showError(e); }
  }, 'primary'), linkBtn('Dejar como borrador', '#/avances?mine=1', 'ghost')));
  return p.el;
}
// Revisión en lote: valida varios avances de una vez; los que no pueden validarse explican por qué.
async function review() {
  const p = page('Revisar avances pendientes', { crumb: h('a', { href: '#/avances' }, 'Avances'), sub: 'Marque los avances correctos y valídelos juntos. Para rechazar o corregir uno, ábralo.' }); const box = h('div', {}); p.body.append(box);
  const drawAll = () => load(box, () => get('/api/progress?f.status=reportado&pageSize=200&sort=executionDate'), (d) => {
    if (!d.items.length) { box.append(card(null, empty('Nada por validar', 'No hay avances reportados en espera de revisión.', linkBtn('Ver todos los avances', '#/avances')))); return; }
    const picked = new Set(); const mine = state.session.user.id; const blocked = (r) => (r.authorId === mine ? 'Lo capturó usted' : r.evidenceState === 'faltante' ? 'Falta evidencia' : r.overBudget ? 'Sobre presupuesto' : null);
    const bar = h('div', { class: 'bulk', hidden: true }); const rows = d.items.map((r) => ({ r, cb: h('input', { type: 'checkbox', 'aria-label': `Seleccionar ${r.concept} en ${r.location}`, disabled: !!blocked(r), onchange: (e) => { if (e.target.checked) picked.add(r.id); else picked.delete(r.id); sync(); } }) }));
    const all = h('input', { type: 'checkbox', 'aria-label': 'Seleccionar todos los que pueden validarse', onchange: (e) => { for (const x of rows) if (!x.cb.disabled) { x.cb.checked = e.target.checked; if (e.target.checked) picked.add(x.r.id); else picked.delete(x.r.id); } sync(); } });
    const sync = () => { bar.hidden = !picked.size; bar.replaceChildren(h('span', {}, `${picked.size} seleccionado${picked.size === 1 ? '' : 's'}`), btn('Validar seleccionados', run, 'small')); };
    const run = async () => { let ok = 0; const fails = []; for (const id of picked) { try { await post(`/api/progress/${id}/review`, { decision: 'validar' }); ok++; } catch (e) { const r = d.items.find((x) => x.id === id); fails.push(`${r.concept} · ${r.location}: ${e.message} ${(e.data?.reasons || []).join(' ')}`); } }
      if (fails.length) await dialog({ title: `${ok} validado${ok === 1 ? '' : 's'}, ${fails.length} sin validar`, text: 'Estos avances necesitan atención individual:', body: h('ul', {}, fails.map((f) => h('li', {}, f))) }); else toast(`${ok} avance${ok === 1 ? '' : 's'} validado${ok === 1 ? '' : 's'}.`, 'ok'); drawAll(); };
    box.append(h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'sel' }, all), ['Ejecución', 'Obra', 'Ubicación', 'Concepto', 'Cantidad', 'Contratista', 'Capturó', 'Situación', ''].map((x) => h('th', { class: x === 'Cantidad' ? 'num' : '' }, x)))),
      h('tbody', {}, rows.map(({ r, cb }) => h('tr', {}, h('td', { class: 'sel' }, cb), h('td', {}, date(r.executionDate)), h('td', {}, r.work), h('td', {}, r.location), h('td', {}, r.concept), h('td', { class: 'num' }, `${qty(r.effectiveQty)} ${r.unit}`), h('td', {}, r.contractor || '—'), h('td', {}, r.author), h('td', {}, blocked(r) ? chip('pendiente', blocked(r)) : r.duplicateFlag === 'posible' ? chip('pendiente', 'Posible duplicado') : chip('validado', 'Lista')), h('td', { class: 'rich' }, linkBtn('Abrir', `#/avances/${r.id}`, 'small ghost'))))))), bar,
      h('p', { class: 'small muted' }, 'Los avances sin evidencia obligatoria, sobre presupuesto o capturados por usted se revisan uno por uno.'));
  });
  drawAll(); return p.el;
}
async function progressDetail([id]) {
  const el = h('div', {}); const reload = () => progressDetail([id]).then((n) => el.replaceWith(n));
  await load(el, () => get(`/api/progress/${id}`), async (e) => {
    const ST = { borrador: 'Borrador', reportado: 'Reportado', validado: 'Validado', rechazado: 'Rechazado' };
    const p = page(`${e.concept}`, { crumb: h('span', {}, h('a', { href: '#/avances' }, 'Avances'), ` › ${e.work}`), sub: `${e.location} · ejecutado el ${date(e.executionDate)}`, actions: [chip(e.status, ST[e.status]),
      e.status === 'borrador' && e.can.edit ? btn('Enviar a revisión', () => act(() => post(`/api/progress/${id}/submit`), 'Enviado a revisión.').then(reload), 'primary') : null,
      e.can.validate ? btn('Validar', async () => { const over = e.budget.overBudget; if (await formDialog({ title: 'Validar avance', text: over ? 'El acumulado supera el presupuesto. El trabajo se conserva y no modifica el contrato; indique el motivo.' : 'Confirma que la medición es correcta.', submitLabel: 'Validar', fields: over ? [{ key: 'overBudgetNote', label: 'Motivo para aceptar ejecución sobre presupuesto', type: 'textarea', required: true }] : [], submit: (v) => post(`/api/progress/${id}/review`, { decision: 'validar', ...v, recordVersion: e.recordVersion }) })) reload(); }, 'primary') : null,
      e.can.validate ? btn('Rechazar', async () => { if (await withReason('Rechazar avance', 'El supervisor recibirá el motivo para corregir.', (v) => post(`/api/progress/${id}/review`, { decision: 'rechazar', ...v }))) reload(); }, 'danger') : null] });
    const b = e.budget;
    p.body.append(h('div', { class: 'stack' }, e.rejectedReason && e.status === 'rechazado' ? h('div', { class: 'note bad' }, h('b', {}, 'Rechazado: '), e.rejectedReason) : null,
      e.duplicateFlag === 'posible' ? h('div', { class: 'note warn' }, 'Posible duplicado: existe otra captura igual. No se eliminó nada. ', e.can.validate ? btn('Descartar alerta', async () => { if (await withReason('Descartar alerta de duplicado', '', (v) => post(`/api/progress/${id}/dismiss-duplicate`, v))) reload(); }, 'small') : null) : null,
      e.overBudget ? h('div', { class: 'note warn' }, 'El acumulado supera la cantidad presupuestada. ', e.overBudgetNote ? `Aceptado con motivo: ${e.overBudgetNote}` : 'Requiere aprobación para validarse.') : null,
      card('Medición', kv([['Cantidad del periodo', `${qty(e.qty, 4)} ${e.unit}`], ['Cantidad vigente (con ajustes)', `${qty(e.effectiveQty, 4)} ${e.unit}`], ['Modalidad', e.mode === 'acumulado' ? `Acumulada: midió ${qty(e.cumulativeMeasured, 4)}, base validada ${qty(e.baseCumulative, 4)}` : 'Cantidad del periodo'], ['Presupuestado', b.budgetQty === null ? 'Sin partida de presupuesto' : qty(b.budgetQty)], ['Acumulado validado anterior', qty(b.previousValidated)], ['Acumulado resultante', qty(b.resulting)], ['Diferencia contra presupuesto', b.difference === null ? 'No aplica' : qty(b.difference)], ['Contratista', e.contractor], ['Semana', e.period], ['Tipo', e.workType], ['Capturó', `${e.author} · ${instant(e.capturedAt)}`], ['Dispositivo', e.device], ['Validó', e.validatedBy ? `${e.validatedBy} · ${instant(e.validatedAt)}` : null], ['Última revisión', instant(e.lastReviewedAt)]]), e.description ? h('p', {}, e.description) : null),
      e.generator.length ? card('Generador de medición', miniTable([{ key: 'label', label: 'Renglón' }, { key: 'length', label: 'Largo', type: 'qty', decimals: 4 }, { key: 'width', label: 'Ancho', type: 'qty', decimals: 4 }, { key: 'height', label: 'Alto', type: 'qty', decimals: 4 }, { key: 'pieces', label: 'Piezas', type: 'qty' }, { key: 'deduction', label: 'Deducciones', type: 'qty', decimals: 4 }, { key: 'result', label: 'Resultado', type: 'qty', decimals: 4 }, { key: 'formula', label: 'Fórmula' }], e.generator)) : null));
    // Evidencias
    const grid = h('div', {}); const ev = card('Evidencias', e.evidenceRequired ? h('p', {}, chip(e.evidenceState, { completa: 'Evidencia obligatoria completa', faltante: 'Falta evidencia obligatoria', excepcion: 'Excepción autorizada' }[e.evidenceState]), e.evidenceException ? ` ${e.evidenceException.reason} (${e.evidenceException.authorizedByName})` : '') : null, grid);
    const refreshEv = async () => clear(grid).append(evidenceGrid((await get(`/api/evidence${qs({ objectType: 'progressEntry', objectId: id })}`)).items, { toggleClient: can('kestimates.prepare') ? (a, v) => patch(`/api/evidence/${a.linkId}`, { clientVisible: v }).then(() => toast(v ? 'Se mostrará en el expediente del cliente.' : 'Ya no se mostrará al cliente.')).catch(showError) : null, onRemove: e.status !== 'validado' && e.can.edit ? (a) => del(`/api/evidence/${a.linkId}`).then(refreshEv).catch(showError) : null }));
    if (e.can.edit || e.authorId === state.session.user.id || e.can.validate) ev.append(uploader({ params: { kind: 'foto', workId: e.workId }, onDone: async (a) => { await post('/api/evidence', { attachmentId: a.id, objectType: 'progressEntry', objectId: id }); refreshEv(); } }));
    if (e.evidenceState === 'faltante' && e.can.evidenceException) ev.append(h('div', { class: 'actions' }, btn('Autorizar excepción de evidencia', async () => { if (await withReason('Excepción de evidencia', 'Autoriza validar sin fotografía. Queda registrado quién y por qué.', (v) => post(`/api/progress/${id}/evidence-exception`, v))) reload(); })));
    refreshEv(); p.body.append(h('div', { class: 'stack' }, ev,
      card('Ajustes', h('p', { class: 'small muted' }, 'Las correcciones (incluidas las negativas) se registran como ajustes vinculados; la medición original no se borra.'), miniTable([{ key: 'qtyDelta', label: 'Ajuste', type: 'qty', decimals: 4 }, { key: 'reason', label: 'Motivo' }, { key: 'status', label: 'Estado', type: 'status' }, { key: 'proposedByName', label: 'Propuso' }, { key: 'authorizedByName', label: 'Resolvió' }, { key: 'x', label: '', render: (a) => (a.status === 'propuesto' && e.can.authorizeAdjust ? h('div', { class: 'row' }, btn('Autorizar', () => act(() => post(`/api/progress-adjustments/${a.id}/decide`, { decision: 'autorizar' }), 'Ajuste autorizado.').then(reload), 'small'), btn('Rechazar', () => act(() => post(`/api/progress-adjustments/${a.id}/decide`, { decision: 'rechazar' })).then(reload), 'small ghost')) : '') }], e.adjustments, { emptyText: 'Sin ajustes.' }),
        e.can.adjust ? h('div', { class: 'actions' }, btn('Proponer ajuste', async () => { if (await formDialog({ title: 'Proponer ajuste de medición', text: 'Use un número negativo para reducir la medición. Requiere autorización.', fields: [{ key: 'qtyDelta', label: `Ajuste en ${e.unit} (positivo o negativo)`, type: 'decimal', required: true }, { key: 'reason', label: 'Motivo', type: 'textarea', required: true }], submit: (v) => post(`/api/progress/${id}/adjustments`, v) })) reload(); })) : null),
      card('Dónde se ha incluido esta ejecución', h('p', { class: 'small muted' }, `En pago al contratista: ${qty(e.paidQty, 4)} · en cobro al cliente: ${qty(e.billedQty, 4)} · de ${qty(e.effectiveQty, 4)} ${e.unit}. La ejecución física se cuenta una sola vez en cada circuito.`), miniTable([{ key: 'circuit', label: 'Circuito', render: (a) => (a.circuit === 'contratista' ? 'Pago al contratista' : 'Cobro al cliente') }, { key: 'folio', label: 'Documento' }, { key: 'qty', label: 'Cantidad', type: 'qty', decimals: 4 }, { key: 'state', label: 'Estado', type: 'status' }], e.allocations, { emptyText: 'Todavía no forma parte de ninguna estimación.', onRow: (a) => go(a.docType === 'cEstimate' ? `#/estimaciones-contratistas/${a.docId}` : `#/estimaciones-clientes/${a.docId}`) }))));
    clear(el).append(p.el);
  });
  return el;
}

// ───────── Adicionales, incidencias y jornadas ─────────
const addTabs = (cur) => tabs([{ key: 'adicionales', label: 'Adicionales', href: '#/adicionales' }, { key: 'incidencias', label: 'Incidencias', href: '#/adicionales/incidencias' }, (can('workdays.capture') || can('workdays.approve')) && { key: 'jornadas', label: 'Jornadas y rayas', href: '#/adicionales/jornadas' }], cur);
async function additionals() {
  const p = page('Adicionales', { sub: 'Trabajos fuera de catálogo o del alcance aprobado. Tres decisiones independientes: que el trabajo existe, cuánto se paga y si se cobra al cliente.', actions: can('additionals.report') ? btn('Reportar adicional', newAdditional, 'primary') : null });
  p.body.append(addTabs('adicionales'), h('div', { class: 'row' }, linkBtn('Solo importes expuestos', '#/adicionales?exposed=1', 'small ghost'), h('span', { class: 'small muted' }, 'Expuesto = costo autorizado cuyo cobro al cliente no está asegurado. No es una pérdida comprobada.')), listView({ endpoint: '/api/additionals', panel: true, extra: parseHash().query.exposed ? { exposed: 1 } : {}, rowHref: (r) => `#/adicionales/${r.id}`, workFilter: true, dateFilter: true, emptyText: 'No hay adicionales reportados.' }));
  return p.el;
}
const ADD_KIND = [['trabajo_nuevo', 'Trabajo nuevo'], ['correccion_medicion', 'Corrección de medición'], ['dano', 'Daño'], ['reposicion', 'Reposición'], ['retrabajo', 'Retrabajo'], ['cambio_solicitado', 'Cambio solicitado']].map(([id, label]) => ({ id, label }));
async function newAdditional() {
  const o = await options(['works', 'contractors', 'units', 'detailLevels']); let locs = [];
  const r = await formDialog({ title: 'Reportar adicional', text: 'Describa el trabajo de forma concreta. La evidencia se adjunta al guardar.', wide: true, fields: [{ key: 'workId', label: 'Obra', type: 'select', required: true, options: o.works, onchange: async (v, input) => { locs = v ? (await get(`/api/works/${v}`)).locations : []; const s = input.closest('.grid').querySelector('[data-key=locationId]'); s.replaceChildren(h('option', { value: '' }, 'Seleccione…'), ...locs.map((l) => h('option', { value: l.id }, l.path))); } }, { key: 'locationId', label: 'Ubicación', type: 'select', options: [] }, { key: 'date', label: 'Fecha', type: 'date', value: today(), required: true }, { key: 'kind', label: 'Tipo', type: 'select', required: true, options: ADD_KIND }, { key: 'description', label: 'Descripción concreta', type: 'textarea', required: true }, { key: 'cause', label: 'Causa', wide: true }, { key: 'requesterName', label: 'Quién lo solicitó' }, { key: 'executorId', label: 'Quién lo ejecuta', type: 'select', options: o.contractors }, { key: 'qty', label: 'Cantidad', type: 'decimal' }, { key: 'unitId', label: 'Unidad', type: 'select', options: o.units }, { key: 'detailLevelId', label: 'Nivel de detalle por lote', type: 'select', options: o.detailLevels, help: 'Simplifica la valorización; no sustituye descripción ni evidencia.' }, { key: 'urgency', label: 'Urgencia', type: 'select', placeholder: false, options: [{ id: 'normal', label: 'Normal' }, { id: 'urgente', label: 'Urgente' }] }, { key: 'executed', label: 'El trabajo ya se ejecutó', type: 'check' }], submit: (v) => post('/api/additionals', { ...v, qty: v.qty || undefined }) });
  if (r?.id) go(`#/adicionales/${r.id}`);
}
async function additionalDetail([id]) {
  const el = h('div', {}); const reload = () => additionalDetail([id]).then((n) => el.replaceWith(n));
  await load(el, () => get(`/api/additionals/${id}`), (a) => {
    const OP = { reportado: 'Reportado', en_aclaracion: 'En aclaración', validado: 'Validado', rechazado: 'Rechazado', resuelto: 'Resuelto' }, CO = { pendiente: 'Pendiente de valorar', autorizado: 'Pago autorizado', rechazado: 'Pago rechazado', no_aplica: 'No aplica' }, SA = { pendiente: 'Pendiente de decidir', propuesto: 'Propuesto al cliente', aprobado_cliente: 'Aprobado por el cliente', rechazado_cliente: 'Rechazado por el cliente', absorbido: 'Absorbido por DCL', no_aplica: 'No aplica' };
    const p = page(`Adicional ${a.folio}`, { crumb: h('span', {}, h('a', { href: '#/adicionales' }, 'Adicionales'), ` › ${a.work}`), sub: a.description });
    const grid = h('div', {}); const refreshEv = async () => clear(grid).append(evidenceGrid((await get(`/api/evidence${qs({ objectType: 'additional', objectId: id })}`)).items));
    const decide = (title, url, fields, text) => async () => { if (await formDialog({ title, text, fields, submit: (v) => post(url, v) })) reload(); };
    p.body.append(h('div', { class: 'stack' }, a.exposure ? h('div', { class: 'note warn' }, h('b', {}, `Importe expuesto: ${money(a.exposure)}. `), 'El pago al contratista está autorizado y el cobro al cliente no está asegurado. No es un ingreso ni una pérdida comprobada.') : null,
      card('Trabajo', kv([['Obra', a.work], ['Ubicación', a.location], ['Fecha', date(a.date)], ['Tipo', ADD_KIND.find((k) => k.id === a.kind)?.label], ['Urgencia', a.urgency], ['Cantidad', a.qty ? `${qty(a.qty)} ${a.unit || ''}` : null], ['Ejecuta', a.executor], ['Solicitó', a.requesterName], ['Reportó', a.reportedBy], ['Ejecutado', a.executed ? 'Sí' : 'Aún no (no es avance ni pago por aceptarse)'], ['Causa', a.cause]])),
      h('div', { class: 'cards' },
        card('1 · ¿El trabajo existe?', h('p', {}, chip(a.opStatus, OP[a.opStatus])), h('p', { class: 'small muted' }, a.opBy ? `${a.opBy} · ${instant(a.opAt)}${a.opNote ? ` · ${a.opNote}` : ''}` : 'Sin decisión'), a.can.validate ? h('div', { class: 'row' }, btn('Validar', decide('Validar adicional', `/api/additionals/${id}/operation`, [{ key: 'status', type: 'select', label: 'Decisión', required: true, placeholder: false, options: [{ id: 'validado', label: 'Validado: el trabajo existe' }, { id: 'en_aclaracion', label: 'En aclaración' }, { id: 'rechazado', label: 'Rechazado' }, { id: 'resuelto', label: 'Resuelto' }] }, { key: 'reason', label: 'Motivo o nota (obligatorio si rechaza, aclara o valida sin evidencia)', type: 'textarea' }]), 'small primary')) : null),
        card('2 · ¿Cuánto se paga al contratista?', h('p', {}, chip(a.costStatus, CO[a.costStatus])), a.costAmount !== undefined ? h('p', { class: 'kpi v' }, a.costAmount ? money(a.costAmount) : 'Sin valorar') : h('p', { class: 'muted small' }, 'Importe no visible para su perfil'), h('p', { class: 'small muted' }, a.costBy ? `${a.costBy} · ${instant(a.costAt)}` : 'Sin decisión'), a.can.cost ? h('div', { class: 'row' }, btn('Autorizar pago', decide('Autorizar pago al contratista', `/api/additionals/${id}/cost`, [{ key: 'amount', label: 'Importe a pagar', type: 'decimal', help: 'Si eligió nivel de detalle y lo deja vacío, se usa el importe del nivel. Nunca se autoriza con cero.' }], 'Autorizar el pago no implica que se cobrará al cliente.'), 'small primary'), btn('Rechazar', decide('Rechazar pago', `/api/additionals/${id}/cost`, [{ key: 'decision', type: 'select', label: 'Decisión', placeholder: false, options: [{ id: 'rechazar', label: 'No se paga' }] }, { key: 'reason', label: 'Motivo', type: 'textarea', required: true }]), 'small ghost')) : null),
        card('3 · ¿Se cobra al cliente?', h('p', {}, chip(a.saleStatus, SA[a.saleStatus])), a.saleAmount !== undefined ? h('p', { class: 'kpi v' }, a.saleAmount ? money(a.saleAmount) : 'Sin precio') : h('p', { class: 'muted small' }, 'Importe no visible para su perfil'), h('p', { class: 'small muted' }, a.saleBy ? `${a.saleBy} · ${instant(a.saleAt)}${a.saleNote ? ` · ${a.saleNote}` : ''}` : 'Sin decisión'), a.can.sale ? h('div', { class: 'row' }, btn('Decidir cobro', decide('Cobro al cliente', `/api/additionals/${id}/sale`, [{ key: 'status', type: 'select', label: 'Decisión', required: true, options: [{ id: 'propuesto', label: 'Proponer al cliente' }, { id: 'aprobado_cliente', label: 'El cliente lo aprobó' }, { id: 'rechazado_cliente', label: 'El cliente lo rechazó' }, { id: 'absorbido', label: 'Lo absorbe DCL' }, { id: 'no_aplica', label: 'No aplica' }] }, { key: 'amount', label: 'Precio al cliente', type: 'decimal', help: 'No se copia del costo.' }, { key: 'reason', label: 'Motivo o cómo se obtuvo la aprobación', type: 'textarea' }], 'La aceptación del cliente no se presume por haber autorizado el pago.'), 'small primary')) : null)),
      card('Evidencia', grid, uploader({ params: { kind: 'foto', workId: a.workId }, onDone: async (x) => { await post('/api/evidence', { attachmentId: x.id, objectType: 'additional', objectId: id }); refreshEv(); } })),
      a.reworkCosts?.length ? card('Costos de retrabajo vinculados', miniTable([{ key: 'folio', label: 'Gasto' }, { key: 'description', label: 'Descripción' }, { key: 'total', label: 'Total', type: 'money' }, { key: 'status', label: 'Estado', type: 'status' }], a.reworkCosts)) : null));
    refreshEv(); clear(el).append(p.el);
  });
  return el;
}
async function incidents() {
  const p = page('Incidencias', { sub: 'Con responsable, fecha compromiso y cierre con evidencia. No generan descuentos automáticos.', actions: can('additionals.report') ? btn('Nueva incidencia', async () => { const o = await options(['works', 'users']); if (await formDialog({ title: 'Nueva incidencia', fields: [{ key: 'workId', label: 'Obra', type: 'select', required: true, options: o.works }, { key: 'title', label: 'Incidencia', required: true, wide: true }, { key: 'description', label: 'Descripción', type: 'textarea' }, { key: 'responsibleId', label: 'Responsable', type: 'select', options: o.users }, { key: 'dueDate', label: 'Fecha compromiso', type: 'date' }], submit: (v) => post('/api/incidents', v) })) list.refresh(); }, 'primary') : null });
  const list = listView({ endpoint: '/api/incidents', workFilter: true, rowActions: (r, refresh) => (r.status === 'cerrada' ? [] : [btn('Comentar', async () => { if (await formDialog({ title: 'Comentario', fields: [{ key: 'text', label: 'Comentario', type: 'textarea', required: true }], submit: (v) => post(`/api/incidents/${r.id}/comment`, v) })) refresh(); }, 'small ghost'), btn('Cerrar', () => closeIncident(r, refresh), 'small')]) });
  p.body.append(addTabs('incidencias'), list); return p.el;
}
function closeIncident(r, refresh) {
  let att = null; const up = uploader({ params: { kind: 'foto', workId: r.workId }, multiple: false, onDone: (a) => { att = a.id; } });
  return formDialog({ title: `Cerrar incidencia: ${r.title}`, text: 'El cierre requiere evidencia.', fields: [{ key: 'note', label: 'Nota de cierre', type: 'textarea' }], extra: () => up, submit: (v) => post(`/api/incidents/${r.id}/close`, { ...v, closeEvidenceId: att }) }).then((x) => x && refresh());
}
async function workdays() {
  const p = page('Jornadas y rayas', { sub: 'Pago por jornada u hora. La distribución entre obras debe conciliar con el total del día.', actions: can('workdays.capture') ? btn('Capturar jornada', async () => {
    const o = await options(['works', 'workers', 'crews']); const allocs = [{ workId: '', qty: '1' }]; const box = h('div', { class: 'stack' });
    const draw = () => clear(box).append(h('b', {}, 'Distribución por obra'), ...allocs.map((a, i) => h('div', { class: 'grid' }, h('label', { class: 'f' }, 'Obra', h('select', { onchange: (e) => { a.workId = e.target.value; } }, h('option', { value: '' }, 'Seleccione…'), o.works.map((w) => h('option', { value: w.id, selected: w.id === a.workId }, w.label)))), h('label', { class: 'f' }, 'Porción', h('input', { type: 'text', inputmode: 'decimal', value: a.qty, oninput: (e) => { a.qty = e.target.value.trim(); } })), allocs.length > 1 ? btn('Quitar', () => { allocs.splice(i, 1); draw(); }, 'small ghost') : null)), btn('Agregar obra', () => { allocs.push({ workId: '', qty: '' }); draw(); }, 'small'));
    draw();
    if (await formDialog({ title: 'Capturar jornada', wide: true, fields: [{ key: 'workerId', label: 'Trabajador', type: 'select', options: o.workers }, { key: 'crewId', label: 'o cuadrilla', type: 'select', options: o.crews }, { key: 'date', label: 'Fecha', type: 'date', value: today(), required: true }, { key: 'timeUnit', label: 'Unidad de tiempo', type: 'select', placeholder: false, options: [{ id: 'jornada', label: 'Jornada' }, { id: 'hora', label: 'Hora' }] }, { key: 'qty', label: 'Cantidad total', type: 'decimal', required: true, value: '1' }, { key: 'rate', label: 'Tarifa', type: 'decimal', help: 'Puede definirla quien aprueba.' }, { key: 'overlapJustification', label: 'Explicación si excede la jornada configurada', wide: true }, { key: 'note', label: 'Nota', wide: true }], extra: () => box, submit: (v) => post('/api/workdays', { ...v, allocations: allocs.filter((a) => a.workId) }) })) list.refresh(); }, 'primary') : null });
  const list = listView({ endpoint: '/api/workdays', dateFilter: true, rowActions: (r, refresh) => (r.status === 'capturada' && can('workdays.approve') ? [btn('Aprobar', async () => { if (await formDialog({ title: 'Aprobar jornada', text: `${r.who} · ${date(r.date)} · ${r.works}`, fields: [{ key: 'rate', label: 'Tarifa por jornada u hora', type: 'decimal', value: r.rate || '', required: true }], submit: (v) => post(`/api/workdays/${r.id}/decide`, { decision: 'aprobar', ...v }) })) refresh(); }, 'small'), btn('Rechazar', async () => { if (await withReason('Rechazar jornada', '', (v) => post(`/api/workdays/${r.id}/decide`, { decision: 'rechazar', ...v }))) refresh(); }, 'small ghost')] : []) });
  p.body.append(addTabs('jornadas'), list); return p.el;
}

export const routes = [
  [/^\/$/, home], [/^\/obras$/, worksList], [/^\/obras\/([^/]+)(?:\/([a-z]+))?$/, workFile],
  [/^\/avances$/, progressList], [/^\/avances\/capturar$/, capture], [/^\/avances\/evidencias$/, captureEvidence], [/^\/avances\/revision$/, review], [/^\/avances\/([^/]+)$/, progressDetail],
  [/^\/adicionales$/, additionals], [/^\/adicionales\/incidencias$/, incidents], [/^\/adicionales\/jornadas$/, workdays], [/^\/adicionales\/([^/]+)$/, additionalDetail],
];
