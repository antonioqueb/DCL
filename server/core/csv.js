// CSV: UTF-8, separador coma, comillas dobles duplicadas como escape, salto de línea \r\n (RFC 4180).
// Fechas YYYY-MM-DD, instantes ISO con zona, decimales con punto y sin separador de miles,
// booleanos true/false, nulo = campo vacío sin comillas; texto vacío = "" (con comillas).
//
// Protección contra fórmulas en hojas de cálculo: un texto que comienza con = + - @ TAB CR o con '
// se exporta con un apóstrofo ' antepuesto. El importador propio retira exactamente ese apóstrofo,
// de modo que el valor original se recupera. Los importes numéricos (incluidos negativos) no se alteran.
const RISKY = /^[=+\-@\t\r']/;
const NUMERIC = new Set(['money', 'qty', 'price', 'pct', 'int']);

function cell(v, type, human, col) {
  if (v === null || v === undefined) return '';
  if (type === 'json') v = JSON.stringify(v);
  else if (typeof v === 'boolean') return human ? (v ? 'Sí' : 'No') : String(v);
  else if (NUMERIC.has(type)) return String(v);
  else if (human && col?.values && col.values[v]) v = col.values[v];
  let s = String(v);
  if (RISKY.test(s)) s = `'${s}`;
  if (s === '' || /[",\r\n]/.test(s) || /^\s|\s$/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
export function toCsv(rows, columns, { human = false } = {}) {
  const head = columns.map((c) => cell(human ? c.label : c.key, 'text', false)).join(',');
  const lines = rows.map((r) => columns.map((c) => cell(r[c.key], c.type || 'text', human, c)).join(','));
  return [head, ...lines].join('\r\n') + '\r\n';
}
// Analizador tolerante: detecta separador (coma, punto y coma o tabulador) y devuelve celdas con marca de entrecomillado.
export function parseCsv(text, { delimiter } = {}) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!delimiter) { const first = text.split(/\r?\n/, 1)[0]; delimiter = [',', ';', '\t'].map((s) => [s, first.split(s).length]).sort((a, b) => b[1] - a[1])[0][0]; }
  const rows = []; let row = [], cur = '', quoted = false, inQ = false, i = 0;
  const push = () => { row.push({ v: cur, quoted }); cur = ''; quoted = false; };
  while (i < text.length) {
    const ch = text[i];
    if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i += 2; continue; } inQ = false; i++; continue; } cur += ch; i++; continue; }
    if (ch === '"' && cur === '') { inQ = true; quoted = true; i++; continue; }
    if (ch === delimiter) { push(); i++; continue; }
    if (ch === '\r' || ch === '\n') { push(); rows.push(row); row = []; if (ch === '\r' && text[i + 1] === '\n') i++; i++; continue; }
    cur += ch; i++;
  }
  if (cur !== '' || quoted || row.length) { push(); rows.push(row); }
  return rows;
}
// Lectura canónica (paquete portable): revierte el apóstrofo de protección y distingue nulo de texto vacío.
export function fromCsv(text, typeOf) {
  const rows = parseCsv(text, { delimiter: ',' });
  if (!rows.length) return [];
  const keys = rows[0].map((c) => unescape(c.v));
  return rows.slice(1).filter((r) => r.length > 1 || r[0].v !== '' || r[0].quoted).map((r) => {
    const o = {};
    keys.forEach((k, i) => {
      const c = r[i] || { v: '', quoted: false }; const t = typeOf(k);
      if (c.v === '' && !c.quoted) { o[k] = null; return; }
      if (t === 'int') o[k] = Number(c.v);
      else if (t === 'bool') o[k] = c.v === 'true';
      else if (NUMERIC.has(t)) o[k] = c.v;
      else if (t === 'json') o[k] = JSON.parse(unescape(c.v));
      else o[k] = unescape(c.v);
    });
    return o;
  });
}
const unescape = (s) => (s.length > 1 && s[0] === "'" && RISKY.test(s.slice(1)) ? s.slice(1) : s);
export const plainCells = (rows) => rows.map((r) => r.map((c) => c.v));
