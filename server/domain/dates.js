// Fechas de operación como texto local YYYY-MM-DD (sin conversiones que cambien el día).
// Instantes en UTC ISO-8601. Zona operativa: America/Monterrey.

export const TZ = 'America/Monterrey';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const nowInstant = () => new Date().toISOString();
export const isDate = (s) => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(toUTC(s).getTime()) && fromUTC(toUTC(s)) === s;
export const isInstant = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s) && !Number.isNaN(Date.parse(s));

function toUTC(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function fromUTC(d) { return d.toISOString().slice(0, 10); }

// Fecha local de operación para un instante (hoy por omisión).
export function localDate(instant = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
export const addDays = (s, n) => { const d = toUTC(s); d.setUTCDate(d.getUTCDate() + n); return fromUTC(d); };
export const diffDays = (a, b) => Math.round((toUTC(a) - toUTC(b)) / 86400000);
export const weekday = (s) => (toUTC(s).getUTCDay() + 6) % 7; // 0 = lunes … 6 = domingo

// Semana operativa: numeración ISO (lunes a domingo), con inicio y fin explícitos.
// El fin operativo por omisión es sábado (lunes + 5); es configurable sin cambiar la numeración.
export function weekOf(dateStr, endOffsetDays = 5) {
  const monday = addDays(dateStr, -weekday(dateStr));
  const thursday = toUTC(addDays(monday, 3));
  const year = thursday.getUTCFullYear();
  const jan4 = `${year}-01-04`;
  const week1Monday = addDays(jan4, -weekday(jan4));
  const week = Math.floor(diffDays(monday, week1Monday) / 7) + 1;
  return { year, week, start: monday, end: addDays(monday, endOffsetDays), code: `${year}-S${String(week).padStart(2, '0')}` };
}
export function weekByNumber(year, week, endOffsetDays = 5) {
  const jan4 = `${year}-01-04`;
  const monday = addDays(addDays(jan4, -weekday(jan4)), (week - 1) * 7);
  return weekOf(monday, endOffsetDays);
}
export const fmtDate = (s) => { if (!s) return '—'; const [y, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
export function fmtInstant(i) {
  if (!i) return '—';
  return new Intl.DateTimeFormat('es-MX', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(i));
}
