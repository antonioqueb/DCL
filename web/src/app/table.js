// Tabla de datos: búsqueda, filtros plegables, orden, paginación, columnas visibles configurables,
// totales del conjunto filtrado completo (calculados en el servidor) y exportación CSV.
// Las celdas no se doblan: se muestran las columnas prioritarias y lo demás se elige en "Columnas".
import { h, clear, get, cell, qs, parseHash, setQuery, loading, empty, stateFor, options, download, ApiError, icon, peek, GLOSSARY } from './core.js';
import { menu } from './ui.js';

const NUM = (c) => ['money', 'qty', 'int'].includes(c.type);
const LONG = new Set(['question', 'provisional', 'detail', 'basis', 'summary']);
// Columnas visibles de inicio por listado (el resto queda disponible en "Columnas").
const DEFAULTS = {
  '/api/works': ['code', 'name', 'client', 'status', 'supervisors'],
  '/api/progress': ['executionDate', 'work', 'location', 'concept', 'effectiveQty', 'unit', 'status', 'evidenceState'],
  '/api/c-estimates': ['folio', 'period', 'work', 'contractor', 'status', 'grossTotal', 'payStatus'],
  '/api/obligations': ['folio', 'beneficiary', 'work', 'netPayable', 'paid', 'balance', 'payStatus'],
  '/api/disbursements': ['folio', 'date', 'beneficiary', 'method', 'amount', 'status'],
  '/api/additionals': ['folio', 'date', 'work', 'description', 'opStatus', 'costStatus', 'saleStatus', 'exposure'],
  '/api/k-estimates': ['folio', 'work', 'periodTo', 'status', 'total', 'collectStatus', 'balance'],
  '/api/receivables': ['folio', 'work', 'client', 'dueDate', 'total', 'collected', 'balance', 'aging'],
  '/api/expenses': ['folio', 'docDate', 'supplier', 'description', 'total', 'status', 'payStatus'],
  '/api/receipts': ['folio', 'date', 'client', 'kind', 'grossAmount', 'netAmount', 'applied', 'status'],
  '/api/invoices': ['folio', 'date', 'client', 'total', 'linked', 'status'],
  '/api/cash/movements': ['opDate', 'account', 'type', 'counterparty', 'document', 'inflow', 'outflow', 'recon'],
  '/api/audit': ['at', 'actorName', 'action', 'entity', 'reason'],
  '/api/documents': ['issuedAt', 'title', 'folio', 'objectVersion', 'audience', 'status'],
  '/api/workdays': ['date', 'who', 'works', 'qty', 'amount', 'status'],
  '/api/rates': ['circuit', 'concept', 'scope', 'price', 'validFrom', 'status'],
  '/api/change-orders': ['folio', 'work', 'kind', 'reason', 'signedAmount', 'status'],
  '/api/quality-issues': ['kind', 'where', 'detail', 'status'],
  '/api/match-proposals': ['sides', 'basis', 'amount', 'status'],
  '/api/users': ['name', 'username', 'roleNames', 'status'],
  '/api/supplies/movements': ['date', 'supply', 'kind', 'qty', 'unit', 'work'],
};
const prefKey = (e) => `dcl.columnas.v2.${e}`;
function visibleKeys(endpoint, columns) {
  try { const saved = JSON.parse(localStorage.getItem(prefKey(endpoint)) || 'null'); if (Array.isArray(saved) && saved.length) return new Set(saved); } catch { /* preferencia ilegible */ }
  const d = DEFAULTS[endpoint]; const keys = columns.map((c) => c.key);
  return new Set(d ? d.filter((k) => keys.includes(k)) : keys.slice(0, 8));
}

export function listView({ endpoint, rowHref, onRow, filters = [], workFilter = false, dateFilter = false, extra = {}, emptyTitle = 'Sin registros', emptyText = 'No hay información con los filtros actuales.', emptyAction, rowActions, after, statusFilters = true, prefix = '', views = null, panel = false }) {
  const el = h('div', {}); const viewBar = h('div', { class: 'views', hidden: !views }); const tools = h('div', { class: 'tools' }); const filterRow = h('div', { class: 'tools', hidden: true }); const body = h('div', {}); const foot = h('div', {}); el.append(viewBar, tools, filterRow, body, foot); if (views) viewBar.style.marginBottom = '0.75rem';
  const P = (k) => prefix + k; let columns = null; let built = false; let timer;
  const q = () => { const { query } = parseHash(); const out = {}; for (const [k, v] of Object.entries(query)) { if (k === 't') continue; if (prefix ? k.startsWith(prefix) : !/^[a-z]\./.test(k) || k.startsWith('f.')) out[prefix ? k.slice(prefix.length) : k] = v; } return out; };
  const set = (patch) => { const p = {}; for (const [k, v] of Object.entries(patch)) p[P(k)] = v; if (!('page' in patch)) p[P('page')] = ''; setQuery(p); refresh(); };
  const activeFilters = (cur) => Object.keys(cur).filter((k) => k.startsWith('f.') || k === 'from' || k === 'to');

  async function buildTools(cols) {
    built = true; const cur = q(); const fnodes = [];
    if (workFilter) { const { works } = await options(['works']); fnodes.push(sel('Obra', 'f.workId', works, cur)); }
    for (const f of filters) fnodes.push(sel(f.label, f.key, f.options, cur));
    if (statusFilters) for (const c of cols) if (c.type === 'status' && c.values && Object.keys(c.values).length > 1 && !filters.some((f) => f.key === `f.${c.key}`)) fnodes.push(sel(c.label, `f.${c.key}`, Object.entries(c.values).map(([id, label]) => ({ id, label })), cur));
    if (dateFilter) { fnodes.push(h('input', { type: 'date', value: cur.from || '', 'aria-label': 'Desde', onchange: (e) => set({ from: e.target.value }) })); fnodes.push(h('input', { type: 'date', value: cur.to || '', 'aria-label': 'Hasta', onchange: (e) => set({ to: e.target.value }) })); }
    const n = activeFilters(cur).length;
    const clearBtn = n ? h('button', { class: 'btn ghost small', type: 'button', onclick: () => { const p = {}; for (const k of Object.keys(cur)) if (k !== 'sort') p[P(k)] = ''; setQuery(p); built = false; refresh(); } }, icon('x'), 'Limpiar') : null;
    clear(filterRow).append(...fnodes, clearBtn); filterRow.hidden = !n || !fnodes.length;
    const fbtn = fnodes.length ? h('button', { class: 'btn small', type: 'button', 'aria-expanded': String(!filterRow.hidden), onclick: () => { filterRow.hidden = !filterRow.hidden; fbtn.setAttribute('aria-expanded', String(!filterRow.hidden)); } }, icon('filter'), 'Filtros', n ? h('span', { class: 'count' }, String(n)) : null) : null;
    const colBtn = h('button', { class: 'btn small', type: 'button', onclick: () => { const vis = visibleKeys(endpoint, cols); menu(colBtn, [{ heading: 'Columnas visibles' }, ...cols.map((c) => ({ label: c.label, checked: vis.has(c.key), onSelect: (on) => { if (on) vis.add(c.key); else if (vis.size > 1) vis.delete(c.key); localStorage.setItem(prefKey(endpoint), JSON.stringify(cols.map((x) => x.key).filter((k) => vis.has(k)))); refresh(); } })), 'sep', { label: 'Restablecer', onSelect: () => { localStorage.removeItem(prefKey(endpoint)); refresh(); } }]); } }, icon('columns'), 'Columnas');
    clear(tools).append(h('div', { class: 'input-icon grow' }, icon('search'), h('input', { type: 'search', value: cur.q || '', placeholder: 'Buscar…', 'aria-label': 'Buscar', oninput: (e) => { clearTimeout(timer); timer = setTimeout(() => set({ q: e.target.value.trim() }), 280); } })), fbtn, h('span', { class: 'spacer' }), colBtn,
      h('button', { class: 'btn small', type: 'button', 'aria-haspopup': 'menu', 'data-tip': 'Exporta todo el conjunto filtrado', onclick: (e) => { const base = { ...extra, ...q(), page: undefined, pageSize: undefined }; const title = (e.currentTarget.closest('.page') || document).querySelector('h1')?.textContent || '';
        menu(e.currentTarget, [{ label: 'PDF para imprimir o compartir', icon: 'fileText', onSelect: () => window.open(`${endpoint}${qs({ ...base, format: 'pdf', title, cols: [...visibleKeys(endpoint, cols)].join(',') })}`, '_blank', 'noopener') }, { label: 'CSV para hoja de cálculo', icon: 'download', onSelect: () => download(`${endpoint}${qs({ ...base, format: 'csv' })}`) }]); } }, icon('download'), 'Exportar'));
  }
  function sel(label, key, opts, cur) {
    const multi = (cur[key] || '').includes(',');
    return h('select', { 'aria-label': label, onchange: (e) => set({ [key]: e.target.value }) }, h('option', { value: '' }, `${label}: todos`), multi ? h('option', { value: cur[key], selected: true }, `${label}: varios`) : null, opts.map((o) => h('option', { value: o.id, selected: cur[key] === String(o.id) }, o.label)));
  }
  // Vistas rápidas: filtros frecuentes con un clic.
  function drawViews(cur) { if (!views) return; const keys = new Set(views.flatMap((v) => Object.keys(v.query))); const same = (v) => [...keys].every((k) => (cur[k] || '') === (v.query[k] || ''));
    viewBar.replaceChildren(...views.map((v) => h('a', { href: '#', 'aria-current': String(same(v)), onclick: (e) => { e.preventDefault(); const p = {}; for (const k of keys) p[P(k)] = v.query[k] || ''; p[P('page')] = ''; setQuery(p); built = false; refresh(); } }, v.label))); }
  async function refresh() {
    const cur = q(); drawViews(cur); if (!columns) clear(body).append(h('div', { class: 'tablewrap' }, h('div', { class: 'page' }, loading())));
    let data; try { data = await get(`${endpoint}${qs({ ...extra, ...cur })}`); } catch (e) { clear(body).append(e instanceof ApiError ? h('div', { class: 'tablewrap' }, stateFor(e, refresh)) : String(e)); return; }
    columns = data.columns; if (!built) await buildTools(columns);
    const vis = visibleKeys(endpoint, columns); const cols = columns.filter((c) => vis.has(c.key)); const sort = data.sort || '';
    if (!data.items.length) { clear(body).append(h('div', { class: 'tablewrap' }, empty(emptyTitle, data.total === 0 && !Object.keys(cur).filter((k) => k !== 'sort').length ? emptyText : 'Ningún registro coincide con la búsqueda o los filtros.', emptyAction))); clear(foot); after?.(data); return; }
    const open = (r, e) => (onRow ? onRow(r) : !rowHref ? null : panel && !(e && (e.metaKey || e.ctrlKey)) && window.matchMedia('(min-width: 901px)').matches ? peek(rowHref(r), refresh) : (location.hash = rowHref(r))); const clickable = !!(onRow || rowHref);
    const thead = h('thead', {}, h('tr', {}, cols.map((c) => { const dir = sort === c.key ? 'ascending' : sort === `-${c.key}` ? 'descending' : 'none'; return h('th', { class: NUM(c) ? 'num' : '', scope: 'col', 'aria-sort': dir, 'data-tip': GLOSSARY[c.label] || null }, h('button', { type: 'button', 'aria-label': `Ordenar por ${c.label}`, onclick: () => set({ sort: sort === c.key ? `-${c.key}` : c.key }) }, c.label, icon(dir === 'ascending' ? 'arrowUp' : dir === 'descending' ? 'arrowDown' : 'arrowUpDown'))); }), rowActions ? h('th', {}, h('span', { class: 'sr-only' }, 'Acciones')) : null));
    const tbody = h('tbody', {}, data.items.map((r) => h('tr', { class: clickable ? 'link' : '', tabindex: clickable ? '0' : null, onclick: clickable ? (e) => { if (!e.target.closest('button,a,input')) open(r, e); } : null, onkeydown: clickable ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) open(r); } : null },
      cols.map((c) => { const v = cell(r[c.key], c); return h('td', { class: NUM(c) ? 'num' : LONG.has(c.key) ? 'clamp' : '', 'data-l': c.label }, LONG.has(c.key) ? h('span', {}, v) : v); }), rowActions ? h('td', { class: 'rich', 'data-l': 'Acciones' }, h('div', { class: 'row' }, rowActions(r, refresh))) : null)));
    const hasTotals = Object.keys(data.totals || {}).some((k) => vis.has(k));
    const tfoot = hasTotals ? h('tfoot', {}, h('tr', {}, cols.map((c, i) => { const t = data.totals[c.key]; return h('td', { class: NUM(c) ? 'num' : '', 'data-l': c.label, 'data-tip': t?.missing ? `${t.missing} registro(s) sin dato no se suman` : null }, t ? cell(t.value, c) + (t.missing ? ' *' : '') : i === 0 ? 'Total' : ''); }), rowActions ? h('td', {}) : null)) : null;
    clear(body).append(h('div', { class: 'tablewrap' }, h('table', { class: 'cards-m' }, thead, tbody, tfoot)));
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize)); const hiddenCols = columns.length - cols.length;
    clear(foot).append(h('div', { class: 'pager' }, h('span', {}, `${data.total} registro${data.total === 1 ? '' : 's'}${hasTotals ? ' · totales de todo el conjunto filtrado' : ''}${hiddenCols ? ` · ${hiddenCols} columna${hiddenCols === 1 ? '' : 's'} más en "Columnas"` : ''}`),
      h('div', { class: 'row' }, h('span', {}, `Página ${data.page} de ${pages}`), h('button', { class: 'btn icon small', type: 'button', 'aria-label': 'Página anterior', disabled: data.page <= 1, onclick: () => set({ page: data.page - 1 }) }, icon('chevronLeft')), h('button', { class: 'btn icon small', type: 'button', 'aria-label': 'Página siguiente', disabled: data.page >= pages, onclick: () => set({ page: data.page + 1 }) }, icon('chevronRight')))));
    after?.(data);
  }
  refresh(); el.refresh = refresh; return el;
}
