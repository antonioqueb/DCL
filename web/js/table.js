// Listado genérico: búsqueda, filtros, orden, paginación, columnas configurables, totales del conjunto
// filtrado completo (calculados en el servidor) y exportación CSV con los mismos filtros.
import { h, clear, get, cell, qs, parseHash, setQuery, loading, empty, stateFor, options, btn, download, ApiError } from './core.js';

const NUM = (c) => ['money', 'qty', 'int'].includes(c.type);
const prefs = (key) => { try { return JSON.parse(localStorage.getItem(`dcl.columnas.${key}`) || '[]'); } catch { return []; } };

export function listView({ endpoint, rowHref, onRow, filters = [], workFilter = false, dateFilter = false, extra = {}, emptyTitle = 'Sin registros', emptyText = 'No hay información con los filtros actuales.', emptyAction, rowActions, after, statusFilters = true, prefix = '' }) {
  const el = h('div', {}); const tools = h('div', { class: 'tools' }); const body = h('div', {}); const foot = h('div', {}); el.append(tools, body, foot);
  const P = (k) => prefix + k; let columns = null; let built = false; let timer;
  const q = () => { const { query } = parseHash(); const out = {}; for (const [k, v] of Object.entries(query)) if (!prefix || k.startsWith(prefix)) out[prefix ? k.slice(prefix.length) : k] = v; return out; };
  const set = (patch) => { const p = {}; for (const [k, v] of Object.entries(patch)) p[P(k)] = v; if (!('page' in patch)) p[P('page')] = ''; setQuery(p); refresh(); };

  async function buildTools(cols) {
    built = true; const cur = q(); const nodes = [];
    nodes.push(h('label', { class: 'f grow' }, 'Buscar', h('input', { type: 'search', value: cur.q || '', placeholder: 'Texto a buscar', oninput: (e) => { clearTimeout(timer); timer = setTimeout(() => set({ q: e.target.value.trim() }), 280); } })));
    if (workFilter) { const { works } = await options(['works']); nodes.push(sel('Obra', 'f.workId', works, cur)); }
    for (const f of filters) nodes.push(sel(f.label, f.key, f.options, cur));
    if (statusFilters) for (const c of cols) if (c.type === 'status' && c.values && Object.keys(c.values).length > 1 && !filters.some((f) => f.key === `f.${c.key}`)) nodes.push(sel(c.label, `f.${c.key}`, Object.entries(c.values).map(([id, label]) => ({ id, label })), cur));
    if (dateFilter) { nodes.push(h('label', { class: 'f' }, 'Desde', h('input', { type: 'date', value: cur.from || '', onchange: (e) => set({ from: e.target.value }) }))); nodes.push(h('label', { class: 'f' }, 'Hasta', h('input', { type: 'date', value: cur.to || '', onchange: (e) => set({ to: e.target.value }) }))); }
    nodes.push(btn('Columnas', () => columnsDialog(cols), 'ghost'), btn('Exportar CSV', () => download(`${endpoint}${qs({ ...extra, ...q(), page: undefined, pageSize: undefined, format: 'csv' })}`), 'ghost'));
    if (Object.keys(cur).some((k) => k.startsWith('f.') || ['q', 'from', 'to'].includes(k))) nodes.push(btn('Quitar filtros', () => { const p = {}; for (const k of Object.keys(cur)) p[P(k)] = ''; setQuery(p); built = false; refresh(); }, 'ghost'));
    clear(tools).append(...nodes);
  }
  function sel(label, key, opts, cur) {
    const multi = (cur[key] || '').includes(',');
    return h('label', { class: 'f' }, label, h('select', { onchange: (e) => set({ [key]: e.target.value }) }, h('option', { value: '' }, 'Todos'), multi ? h('option', { value: cur[key], selected: true }, 'Varios seleccionados') : null, opts.map((o) => h('option', { value: o.id, selected: cur[key] === String(o.id) }, o.label))));
  }
  function columnsDialog(cols) {
    const hidden = new Set(prefs(endpoint)); const dlg = h('dialog', {});
    dlg.append(h('div', { class: 'dbody' }, h('header', {}, h('h2', {}, 'Columnas visibles')), h('div', { class: 'content' }, h('div', { class: 'grid' }, cols.map((c) => h('label', { class: 'f check' }, h('input', { type: 'checkbox', checked: !hidden.has(c.key), onchange: (e) => { if (e.target.checked) hidden.delete(c.key); else hidden.add(c.key); } }), c.label)))),
      h('footer', {}, h('button', { class: 'btn primary', type: 'button', onclick: () => { localStorage.setItem(`dcl.columnas.${endpoint}`, JSON.stringify([...hidden])); dlg.close(); dlg.remove(); refresh(); } }, 'Aplicar'))));
    document.body.append(dlg); dlg.showModal();
  }
  async function refresh() {
    const cur = q(); if (!columns) clear(body).append(loading());
    let data; try { data = await get(`${endpoint}${qs({ ...extra, ...cur })}`); } catch (e) { clear(body).append(e instanceof ApiError ? stateFor(e, refresh) : String(e)); return; }
    columns = data.columns; if (!built) await buildTools(columns);
    const hidden = new Set(prefs(endpoint)); const cols = columns.filter((c) => !hidden.has(c.key)); const sort = data.sort || '';
    if (!data.items.length) { clear(body).append(h('div', { class: 'tablewrap' }, empty(emptyTitle, data.total === 0 && !Object.keys(cur).length ? emptyText : 'Ningún registro coincide con la búsqueda o los filtros.', emptyAction))); clear(foot); after?.(data); return; }
    const open = (r) => (onRow ? onRow(r) : rowHref ? (location.hash = rowHref(r)) : null); const clickable = !!(onRow || rowHref);
    const thead = h('thead', {}, h('tr', {}, cols.map((c) => { const dir = sort === c.key ? 'ascending' : sort === `-${c.key}` ? 'descending' : 'none'; return h('th', { class: NUM(c) ? 'num' : '', scope: 'col', 'aria-sort': dir }, h('button', { type: 'button', title: 'Ordenar', onclick: () => set({ sort: sort === c.key ? `-${c.key}` : c.key }) }, c.label, dir === 'ascending' ? ' ▲' : dir === 'descending' ? ' ▼' : '')); }), rowActions ? h('th', {}, '') : null));
    const tbody = h('tbody', {}, data.items.map((r) => h('tr', { class: clickable ? 'link' : '', tabindex: clickable ? '0' : null, onclick: clickable ? (e) => { if (!e.target.closest('button,a,input')) open(r); } : null, onkeydown: clickable ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) open(r); } : null },
      cols.map((c) => h('td', { class: NUM(c) ? 'num' : 'wrap', 'data-l': c.label }, cell(r[c.key], c))), rowActions ? h('td', { 'data-l': 'Acciones' }, h('div', { class: 'row' }, rowActions(r, refresh))) : null)));
    const hasTotals = Object.keys(data.totals || {}).length;
    const tfoot = hasTotals ? h('tfoot', {}, h('tr', {}, cols.map((c, i) => { const t = data.totals[c.key]; return h('td', { class: NUM(c) ? 'num' : '', 'data-l': c.label, title: t?.missing ? `${t.missing} registro(s) sin dato no se suman` : null }, t ? cell(t.value, c) + (t.missing ? ' *' : '') : i === 0 ? `Total de ${data.total} registro(s)` : ''); }), rowActions ? h('td', {}) : null)) : null;
    clear(body).append(h('div', { class: 'tablewrap' }, h('table', { class: 'cards-m' }, thead, tbody, tfoot)));
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    clear(foot).append(h('div', { class: 'pager' }, h('span', {}, `${data.total} registro(s) · página ${data.page} de ${pages}${hasTotals ? ' · los totales consideran todo el conjunto filtrado, no solo esta página' : ''}`),
      h('div', { class: 'row' }, h('button', { class: 'btn small ghost', disabled: data.page <= 1, onclick: () => set({ page: data.page - 1 }) }, 'Anterior'), h('button', { class: 'btn small ghost', disabled: data.page >= pages, onclick: () => set({ page: data.page + 1 }) }, 'Siguiente'))));
    after?.(data);
  }
  refresh(); el.refresh = refresh; return el;
}
