// Componentes de interfaz al estilo shadcn/ui, sin marco de trabajo: iconos, capas flotantes,
// selector con búsqueda, calendario, menús y descripciones emergentes.
// Los controles nativos permanecen (ocultos) como fuente de verdad, así los formularios no cambian.
import { createElement as lucide, LayoutDashboard, Building2, Ruler, HardHat, CalendarCheck2, Banknote, CirclePlus, FileSpreadsheet, FileText, Receipt, Landmark, Files, ChartColumn, Settings, PanelLeft, Bell, Sun, Moon, LogOut, ChevronsUpDown, ChevronDown, ChevronLeft, ChevronRight, Check, Search, Calendar, ArrowUp, ArrowDown, ArrowUpDown, Download, SlidersHorizontal, Columns3, X, CircleCheck, CircleAlert, Info, Inbox, Plus, ListFilter, Camera, Paperclip, Wallet, ClipboardList, ShieldCheck, ExternalLink, WifiOff, KeyRound } from 'lucide';

const ICONS = { dashboard: LayoutDashboard, building: Building2, ruler: Ruler, hardhat: HardHat, calendarCheck: CalendarCheck2, banknote: Banknote, plusCircle: CirclePlus, sheet: FileSpreadsheet, fileText: FileText, receipt: Receipt, landmark: Landmark, files: Files, chart: ChartColumn, settings: Settings, panel: PanelLeft, bell: Bell, sun: Sun, moon: Moon, logout: LogOut, chevronsUpDown: ChevronsUpDown, chevronDown: ChevronDown, chevronLeft: ChevronLeft, chevronRight: ChevronRight, check: Check, search: Search, calendar: Calendar, arrowUp: ArrowUp, arrowDown: ArrowDown, arrowUpDown: ArrowUpDown, download: Download, sliders: SlidersHorizontal, columns: Columns3, x: X, ok: CircleCheck, alert: CircleAlert, info: Info, inbox: Inbox, plus: Plus, filter: ListFilter, camera: Camera, clip: Paperclip, wallet: Wallet, clipboard: ClipboardList, shield: ShieldCheck, external: ExternalLink, offline: WifiOff, key: KeyRound };
export function icon(name, cls = '') { const el = lucide(ICONS[name] || Info); el.setAttribute('class', `ico ${cls}`.trim()); el.setAttribute('aria-hidden', 'true'); return el; }

const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v === null || v === undefined || v === false) continue; if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v); } for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid))); return n; };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Capa flotante anclada a un elemento (dentro del diálogo abierto si lo hay) ──
let openPop = null;
export function popover(anchor, content, { align = 'start', matchWidth = false, cls = '' } = {}) {
  openPop?.close();
  const host = anchor.closest('dialog') || document.body;
  const pop = el('div', { class: `pop ${cls}`.trim(), role: 'dialog' }, content);
  host.append(pop);
  const place = () => {
    const r = anchor.getBoundingClientRect(); if (matchWidth) pop.style.minWidth = `${r.width}px`;
    const pw = pop.offsetWidth, ph = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    let left = align === 'end' ? r.right - pw : r.left; left = Math.max(8, Math.min(left, vw - pw - 8));
    let top = r.bottom + 4; if (top + ph > vh - 8 && r.top - ph - 4 > 8) top = r.top - ph - 4; top = Math.max(8, Math.min(top, vh - ph - 8));
    // Un diálogo modal desplaza el origen de los elementos fijos: se compensa.
    const off = host !== document.body ? host.getBoundingClientRect() : { left: 0, top: 0 };
    pop.style.left = `${left - off.left}px`; pop.style.top = `${top - off.top}px`;
  };
  if (host !== document.body) pop.style.position = 'absolute';
  place();
  const onDown = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) api.close(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); api.close(); anchor.focus(); } };
  const onScroll = (e) => { if (!pop.contains(e.target)) api.close(); };
  const api = { el: pop, place, close() { if (openPop !== api) return; openPop = null; pop.remove(); document.removeEventListener('mousedown', onDown, true); document.removeEventListener('keydown', onKey, true); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', api.close); anchor.setAttribute('aria-expanded', 'false'); } };
  setTimeout(() => { document.addEventListener('mousedown', onDown, true); document.addEventListener('keydown', onKey, true); window.addEventListener('scroll', onScroll, true); window.addEventListener('resize', api.close); });
  anchor.setAttribute('aria-expanded', 'true'); openPop = api; return api;
}

// ── Menú desplegable ── items: { label, icon, onSelect, href, danger, checked (casilla; no cierra) } | 'sep' | { heading }
export function menu(anchor, items, opts = {}) {
  const list = el('div', { role: 'menu' });
  const p = popover(anchor, list, { align: 'end', ...opts });
  for (const it of items) {
    if (!it) continue;
    if (it === 'sep') { list.append(el('hr')); continue; }
    if (it.heading) { list.append(el('div', { class: 'plabel' }, it.heading)); continue; }
    const check = it.checked !== undefined; const node = el(it.href ? 'a' : 'button', { class: `opt ${it.danger ? 'danger' : ''}`, role: check ? 'menuitemcheckbox' : 'menuitem', type: it.href ? null : 'button', href: it.href || null, 'aria-selected': check ? String(!!it.checked) : null,
      onclick: () => { if (check) { it.checked = !it.checked; node.setAttribute('aria-selected', String(it.checked)); it.onSelect?.(it.checked); } else { p.close(); it.onSelect?.(); } } }, check ? icon('check', 'check') : it.icon ? icon(it.icon) : null, el('span', {}, it.label));
    list.append(node);
  }
  list.querySelector('.opt')?.focus(); return p;
}

// ── Selector con búsqueda (sustituye visualmente a <select>) ──
function enhanceSelect(select) {
  select.dataset.enh = '1'; select.classList.add('native'); select.tabIndex = -1;
  const text = el('span'); const btn = el('button', { type: 'button', class: 'field-btn', role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, text, icon('chevronsUpDown'));
  const wrap = el('div', { class: 'ctl' }); select.before(wrap); wrap.append(select, btn);
  const label = select.getAttribute('aria-label') || select.closest('label')?.firstChild?.textContent?.trim(); if (label) btn.setAttribute('aria-label', label);
  const sync = () => { const o = select.selectedOptions[0]; text.textContent = o ? o.textContent : 'Seleccione…'; btn.classList.toggle('placeholder', !o || o.value === ''); btn.disabled = select.disabled; const inv = select.getAttribute('aria-invalid'); if (inv) btn.setAttribute('aria-invalid', inv); else btn.removeAttribute('aria-invalid'); };
  sync(); select.addEventListener('change', sync); select.addEventListener('focus', () => btn.focus());
  new MutationObserver(sync).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-invalid', 'selected'] });
  btn.addEventListener('click', () => {
    const opts = [...select.options].filter((o) => !(o.value === '' && /^Seleccione/.test(o.textContent))); const list = el('div', { class: 'list', role: 'listbox' }); let active = Math.max(0, opts.findIndex((o) => o.value === select.value)); let shown = [];
    const search = opts.length > 8 ? el('input', { type: 'text', placeholder: 'Buscar…', 'aria-label': 'Buscar opción' }) : null;
    const choose = (o) => { p.close(); if (select.value !== o.value) { select.value = o.value; select.dispatchEvent(new Event('input', { bubbles: true })); select.dispatchEvent(new Event('change', { bubbles: true })); } sync(); btn.focus(); };
    const draw = () => { const q = norm(search?.value); shown = opts.filter((o) => !q || norm(o.textContent).includes(q)); list.replaceChildren(...(shown.length ? shown.map((o, i) => el('div', { class: 'opt', role: 'option', 'aria-selected': String(o.value === select.value), 'data-active': i === active ? '' : null, onclick: () => choose(o), onmousemove: () => { if (active !== i) { active = i; mark(); } } }, el('span', {}, o.textContent), icon('check', 'check'))) : [el('div', { class: 'empty' }, 'Sin resultados')])); list.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' }); };
    const mark = () => [...list.children].forEach((n, i) => { n.toggleAttribute('data-active', i === active); if (i === active) n.scrollIntoView({ block: 'nearest' }); });
    const body = el('div', {}, search ? el('div', { class: 'search' }, icon('search'), search) : null, list);
    const p = popover(btn, body, { matchWidth: true }); p.el.style.maxWidth = '26rem';
    const key = (e) => { if (e.key === 'ArrowDown') { active = Math.min(shown.length - 1, active + 1); mark(); e.preventDefault(); } else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); mark(); e.preventDefault(); } else if (e.key === 'Enter') { if (shown[active]) choose(shown[active]); e.preventDefault(); } else if (e.key === 'Tab') p.close(); };
    p.el.addEventListener('keydown', key); if (search) { search.addEventListener('input', () => { active = 0; draw(); p.place(); }); }
    draw(); p.place(); if (search) search.focus(); else { p.el.tabIndex = -1; p.el.focus(); }
  });
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); btn.click(); } });
}

// ── Calendario (sustituye visualmente a <input type="date">) ──
const MONTH = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const iso = (d) => d.toISOString().slice(0, 10); const fmt = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
function enhanceDate(input) {
  input.dataset.enh = '1'; input.classList.add('native'); input.tabIndex = -1;
  const text = el('span'); const btn = el('button', { type: 'button', class: 'field-btn', 'aria-haspopup': 'dialog' }, text, icon('calendar'));
  const wrap = el('div', { class: 'ctl' }); input.before(wrap); wrap.append(input, btn);
  const sync = () => { text.textContent = input.value ? fmt(input.value) : 'Elegir fecha'; btn.classList.toggle('placeholder', !input.value); btn.disabled = input.disabled; const inv = input.getAttribute('aria-invalid'); if (inv) btn.setAttribute('aria-invalid', inv); else btn.removeAttribute('aria-invalid'); };
  sync(); input.addEventListener('change', sync); input.addEventListener('focus', () => btn.focus());
  new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['disabled', 'aria-invalid', 'value'] });
  const set = (v) => { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); sync(); };
  btn.addEventListener('click', () => {
    sync(); const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Monterrey' }).format(new Date()); const max = input.getAttribute('max');
    let view = new Date(`${(input.value || today).slice(0, 7)}-01T00:00:00Z`); const body = el('div', { class: 'cal' });
    const draw = () => { const first = new Date(view); const start = new Date(first); start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7)); const days = [];
      for (let i = 0; i < 42; i++) { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); const s = iso(d); days.push(el('button', { type: 'button', class: `${d.getUTCMonth() !== view.getUTCMonth() ? 'out' : ''} ${s === today ? 'today' : ''}`, 'aria-selected': String(s === input.value), 'aria-label': fmt(s), disabled: !!(max && s > max), onclick: () => { p.close(); set(s); btn.focus(); } }, String(d.getUTCDate()))); }
      const nav = (n) => el('button', { type: 'button', class: 'btn ghost icon small', 'aria-label': n < 0 ? 'Mes anterior' : 'Mes siguiente', onclick: () => { view.setUTCMonth(view.getUTCMonth() + n); draw(); } }, icon(n < 0 ? 'chevronLeft' : 'chevronRight'));
      body.replaceChildren(el('div', { class: 'cal-head' }, nav(-1), el('span', {}, MONTH.format(view)), nav(1)), el('div', { class: 'cal-grid' }, ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map((d) => el('span', {}, d)), days),
        el('div', { class: 'cal-foot' }, el('button', { type: 'button', class: 'btn ghost small', onclick: () => { p.close(); set(''); } }, 'Borrar'), el('button', { type: 'button', class: 'btn ghost small', disabled: !!(max && today > max), onclick: () => { p.close(); set(today); } }, 'Hoy'))); };
    draw(); const p = popover(btn, body);
  });
}
function enhance(root) {
  if (root.nodeType !== 1) return;
  if (root.matches?.('select:not([data-enh])')) enhanceSelect(root); else if (root.matches?.('input[type="date"]:not([data-enh])')) enhanceDate(root);
  root.querySelectorAll?.('select:not([data-enh])').forEach(enhanceSelect); root.querySelectorAll?.('input[type="date"]:not([data-enh])').forEach(enhanceDate);
}
new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) enhance(n); }).observe(document.documentElement, { childList: true, subtree: true });

// ── Descripción emergente: texto completo de celdas recortadas y rótulos de la barra colapsada ──
let tip = null; const hideTip = () => { tip?.remove(); tip = null; };
document.addEventListener('mouseover', (e) => {
  const t = e.target.closest?.('td, th, .kpi .v, [data-tip]'); if (!t) return hideTip();
  const custom = t.dataset?.tip; if (!custom && (t.classList.contains('rich') || t.scrollWidth <= t.clientWidth + 1)) return hideTip();
  if (custom && !document.querySelector('.shell.collapsed') && t.classList.contains('sb-item')) return hideTip();
  const textValue = custom || t.textContent.trim(); if (!textValue) return hideTip();
  hideTip(); tip = el('div', { class: 'tip', role: 'tooltip' }, textValue); (t.closest('dialog') || document.body).append(tip);
  const r = t.getBoundingClientRect(); const side = t.classList.contains('sb-item');
  const off = t.closest('dialog')?.getBoundingClientRect() || { left: 0, top: 0 }; if (t.closest('dialog')) tip.style.position = 'absolute';
  tip.style.left = `${(side ? r.right + 8 : Math.max(8, Math.min(r.left, window.innerWidth - tip.offsetWidth - 8))) - off.left}px`; tip.style.top = `${(side ? r.top + (r.height - tip.offsetHeight) / 2 : r.top - tip.offsetHeight - 6 < 4 ? r.bottom + 6 : r.top - tip.offsetHeight - 6) - off.top}px`;
});
document.addEventListener('mousedown', hideTip, true); window.addEventListener('scroll', hideTip, true);

// ── Tema ──
export const isDark = () => document.documentElement.classList.contains('dark');
export function toggleTheme() { const d = !isDark(); document.documentElement.classList.toggle('dark', d); localStorage.setItem('dcl.tema', d ? 'dark' : 'light'); document.dispatchEvent(new CustomEvent('dcl:tema')); }
