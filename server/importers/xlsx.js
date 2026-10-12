// Lectura de libros de Excel sin evaluar nada: se usan únicamente los valores guardados y el texto
// de las fórmulas como evidencia. No se ejecutan macros, enlaces externos ni fórmulas.
import ExcelJS from 'exceljs';
import { normalizeName } from '../domain/schema.js';

export const colName = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
export const addr = (row, col) => `${colName(col)}${row}`;
const ERR = /^#(REF!|NAME\?|DIV\/0!|VALUE!|N\/A|NUM!|NULL!)$/;

function unwrap(raw) {
  if (raw === null || raw === undefined) return { v: null };
  if (raw instanceof Date) return { v: raw.toISOString().slice(0, 10), date: true };
  if (typeof raw === 'number') return { v: raw };
  if (typeof raw === 'boolean') return { v: raw };
  if (typeof raw === 'string') return ERR.test(raw.trim()) ? { v: null, err: raw.trim() } : { v: raw };
  if (typeof raw === 'object') {
    if (raw.error) return { v: null, err: String(raw.error) };
    if (raw.richText) return { v: raw.richText.map((t) => t.text).join('') };
    if (raw.formula !== undefined || raw.sharedFormula !== undefined) { const r = unwrap(raw.result); return { ...r, f: raw.formula || `(compartida con ${raw.sharedFormula})` }; }
    if (raw.text !== undefined) return unwrap(raw.text);
  }
  return { v: String(raw) };
}
export async function readWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer, { ignoreNodes: ['dataValidations', 'conditionalFormatting', 'drawing', 'picture'] });
  return wb.worksheets.map((ws) => {
    const cache = new Map();
    const cell = (r, c) => { const k = r * 100000 + c; let x = cache.get(k); if (!x) { const row = ws.findRow(r); x = row ? unwrap(row.findCell(c)?.value) : { v: null }; cache.set(k, x); } return x; };
    return { name: ws.name, hidden: ws.state !== 'visible', state: ws.state, rows: ws.rowCount, cols: ws.columnCount, cell,
      num: (r, c) => { const x = cell(r, c); return typeof x.v === 'number' ? x.v : typeof x.v === 'string' && /^-?\d+(\.\d+)?$/.test(x.v.trim()) ? Number(x.v) : null; },
      str: (r, c) => { const x = cell(r, c); return x.v === null || x.v === undefined ? '' : String(x.v).trim(); },
      // Errores de fórmula del área leída: nunca se convierten en cero.
      errors(maxRow = ws.rowCount, maxCol = ws.columnCount) { const out = []; ws.eachRow({ includeEmpty: false }, (row, r) => { if (r > maxRow) return; row.eachCell({ includeEmpty: false }, (c, cn) => { if (cn > maxCol) return; const x = unwrap(c.value); if (x.err) out.push({ cell: addr(r, cn), err: x.err }); }); }); return out; } };
  });
}
// Número de Excel a decimal exacto en texto (evita arrastrar ruido binario como 49569.369768).
export const dec = (n, scale = 2) => (n === null || n === undefined ? null : (Math.round(n * 10 ** scale + (n >= 0 ? 1e-7 : -1e-7)) / 10 ** scale).toFixed(scale));
export const UNIT_MAP = { m2: 'm2', ml: 'ml', lote: 'lote', lotes: 'lote', lot: 'lote', loe: 'lote', pza: 'pza', pzas: 'pza', pz: 'pza', pieza: 'pza', piezas: 'pza', dia: 'jornada', dias: 'jornada', jornada: 'jornada', hrs: 'hora', hora: 'hora' };
export const normUnit = (u) => UNIT_MAP[normalizeName(u).replace(/\s/g, '')] || null;
const MONTHS = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
// "14 de abril 2026" → 2026-04-14 (o null si no se puede interpretar sin ambigüedad).
export function parseSpanishDate(text) { const m = /(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de\s+|del\s+)?(\d{4})/i.exec(String(text || '')); if (!m) return null; const mo = MONTHS[normalizeName(m[2])]; return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; }
export const addends = (formula) => { const m = /^=?\s*([\d.]+(?:\s*\+\s*[\d.]+)+)\s*$/.exec(String(formula || '')); return m ? m[1].split('+').map((x) => x.trim()) : null; };
