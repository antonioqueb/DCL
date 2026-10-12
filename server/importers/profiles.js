// Perfiles de los archivos conocidos de DCL. Cada perfil convierte estructuras horizontales o por
// bloques en registros normalizados con su origen (hoja, fila, celda), excluye subtotales y resúmenes,
// y levanta incidencias de calidad en lugar de corregir en silencio.
import { normalizeName } from '../domain/schema.js';
import { addr, dec, normUnit, parseSpanishDate, addends } from './xlsx.js';

const N = normalizeName;
export const PROFILES = {
  estimaciones: { title: 'Control de obra y estimaciones semanales', example: 'S35_Estimaciones.xlsx', detect: (sh) => sh.filter((s) => /^CONTROL DE OBRA/i.test(s.str(2, 2))).length >= 2 },
  pagos_semanales: { title: 'Pagos semanales', example: '230101_Pagos Semanales.xlsx', detect: (sh) => sh.filter((s) => /^20\d\d$/.test(s.name)).length >= 2 },
  gastos: { title: 'Gastos e ingresos', example: '260113_GastosDCL.xlsx', detect: (sh) => sh.some((s) => s.name === 'Gastos') && sh.some((s) => /^Rem\./.test(s.name)) },
  flujos: { title: 'Flujos y asignaciones por obra', example: '260106_FlujosDCL.xlsx', detect: (sh) => sh.some((s) => s.name === 'GLOBAL') && sh.some((s) => s.name === 'RESIDENCIALES') },
  control_cliente: { title: 'Control de estimaciones del cliente y estado de cuenta', example: '260731_Balcones.xlsx', detect: (sh) => sh.some((s) => /estado de cuenta/i.test(s.name)) && sh.some((s) => /^Control Estimaciones/i.test(s.str(2, 2))) },
};
// Fuente propuesta por campo y política de conflictos (revisable; ningún archivo prevalece de forma absoluta).
export const FIELD_SOURCES = [
  { field: 'Cantidades ejecutadas por semana, ubicación y concepto', source: 'Control de obra y estimaciones', why: 'Es donde el supervisor registra la medición con su ubicación.', conflict: 'Si Pagos semanales agrupa otra cantidad, se propone coincidencia y se revisa; no se sustituye.' },
  { field: 'Tarifa pagada al contratista', source: 'Control de obra y estimaciones (PU) y Pagos semanales (Precio)', why: 'Ambos la contienen; deben coincidir.', conflict: 'Diferencia → incidencia de tarifa; decide dirección.' },
  { field: 'Bruto semanal, nómina bancaria, descuentos y efectivo', source: 'Pagos semanales', why: 'Único archivo con el bloque de cierre por semana.', conflict: 'Se recalcula y se compara con el valor guardado; diferencia → incidencia.' },
  { field: 'Gasto, proveedor, comprobante y medio de pago', source: 'Gastos', why: 'Un renglón por comprobante.', conflict: 'Contra Flujos se proponen coincidencias; nunca se importa como dos gastos.' },
  { field: 'Movimiento de efectivo y banco', source: 'Flujos (hoja GLOBAL)', why: 'Libro de caja con fecha de movimiento.', conflict: 'Importes redondeados frente a Pagos (p. ej. 278,000 vs 277,999.30) quedan como diferencia visible.' },
  { field: 'Asignación de costo por obra', source: 'Flujos (RESIDENCIALES y PROYECTOS)', why: 'Matriz por obra.', conflict: 'Es el mismo hecho que la estimación y el pago: se vincula, no se suma otra vez.' },
  { field: 'Presupuesto y estimaciones del cliente', source: 'Control de estimaciones del cliente', why: 'Cantidades y precios comerciales.', conflict: 'Fechas contra el estado de cuenta y los PDF → conflicto visible.' },
  { field: 'Cobros, anticipos y comisiones', source: 'Gastos (Rem. INSTAL.) y Flujos', why: 'Aparecen en ambos con criterios distintos (neto vs bruto).', conflict: 'Se conservan bruto, comisión y neto por separado; las diferencias se registran con su resolución.' },
];

function ctxFor(file) {
  const records = [], issues = [], excluded = []; const seen = new Map();
  return { records, issues, excluded,
    rec(kind, sheet, row, col, key, data) { let k = `${kind}|${N(sheet)}|${key}`; const n = (seen.get(k) || 0) + 1; seen.set(k, n); if (n > 1) k += `#${n}`; records.push({ kind, sheet, row, cell: col ? addr(row, col) : null, naturalKey: k, data }); },
    issue(kind, sheet, cell, detail) { issues.push({ kind, fileName: file, sheet, cell, detail, dedupeKey: `${file}|${sheet}|${cell}|${kind}|${detail.slice(0, 60)}` }); },
    skip(sheet, row, why) { excluded.push({ sheet, row, why }); } };
}
const TOTAL_RE = /^(ppto de instalacion|total de ptto|total ejecutado|total por ejecutar|total|subtotal)/;

// ───────── Control de obra y estimaciones semanales ─────────
function estimaciones(sheets, c) {
  const stats = { sheetTotals: [] };
  for (const s of sheets) {
    if (s.hidden) c.issue('hoja_oculta', s.name, null, 'Hoja oculta: se lee igual que las visibles. Una hoja oculta no es necesariamente una obra inactiva.');
    if (s.name === 'Otros') { otros(s, c); continue; }
    let hr = 0; for (let r = 1; r <= 15; r++) if (N(s.str(r, 2)) === 'clave') { hr = r; break; }
    if (!hr) { c.issue('otro', s.name, null, 'No se encontró la fila de encabezados (CLAVE); la hoja no se interpretó.'); continue; }
    const work = s.str(2, 2).replace(/^CONTROL DE OBRA\s*-?\s*/i, '').trim() || s.name;
    // Bloques semanales: "Semana NN" en el encabezado, año en la fila superior, rango de fechas en la inferior.
    const blocks = []; let prev = null; const dupe = new Set();
    for (let col = 8; col <= s.cols; col++) {
      const h = s.str(hr, col); if (/^EJECUTADO/i.test(h)) break; const m = /^Semana\s*S?\s*(\d+)/i.exec(h); if (!m) continue;
      const year = s.num(hr - 1, col), week = Number(m[1]); const b = { col, year, week, range: s.str(hr + 1, col) };
      if (!year) c.issue('fecha_ambigua', s.name, addr(hr - 1, col), `La semana ${week} no tiene año en el encabezado.`);
      else if (prev && prev.year && (year < prev.year || (year === prev.year && week < prev.week && prev.week - week < 40))) c.issue('fecha_conflicto', s.name, addr(hr - 1, col), `El encabezado indica ${year} semana ${week} después de ${prev.year} semana ${prev.week}: el año o la semana retroceden. Se conserva lo capturado y se pide revisión.`);
      if (dupe.has(`${year}|${week}`)) c.issue('fecha_conflicto', s.name, addr(hr, col), `La semana ${week} de ${year} aparece más de una vez en la hoja.`); dupe.add(`${year}|${week}`);
      blocks.push(b); prev = b; col++; // el encabezado está combinado sobre las dos columnas del bloque
    }
    let section = null, sub = null; const weekSum = new Map(); const declared = new Map();
    for (let r = hr + 3; r <= s.rows; r++) {
      const B = s.str(r, 2), C = s.str(r, 3), unitRaw = s.str(r, 5);
      if (TOTAL_RE.test(N(C)) || TOTAL_RE.test(N(B))) { c.skip(s.name, r, 'Subtotal o resumen: se excluye de la carga transaccional.'); if (/^total de ptto/.test(N(C))) for (const b of blocks) { const v = s.num(r, b.col + 1); if (v !== null) declared.set(b.col, v); } continue; }
      if (!unitRaw) { if (B) { section = B; sub = null; } else if (C) sub = C; continue; }
      if (!C) continue;
      const unit = normUnit(unitRaw); if (!unit) c.issue('unidad', s.name, addr(r, 5), `Unidad no reconocida "${unitRaw}" en "${C}". No se convierte automáticamente.`);
      const pu = s.num(r, 6), qty = s.num(r, 4); const key = [N(work), N(section), N(sub), N(C)].join('/');
      c.rec('partida_contratacion', s.name, r, 3, key, { work, section, location: sub, concept: C, unit: unit || unitRaw, unitRaw, budgetQty: qty === null ? null : dec(qty, 4), unitPrice: pu === null ? null : dec(pu, 4), budgetAmount: qty !== null && pu !== null ? dec(qty * pu) : null });
      if (pu === null && blocks.some((b) => s.num(r, b.col))) c.issue('tarifa', s.name, addr(r, 6), `"${C}" tiene cantidades ejecutadas sin precio unitario: queda pendiente de valorar, no en cero.`);
      for (const b of blocks) {
        const q = s.cell(r, b.col); if (q.err) { c.issue('error_formula', s.name, addr(r, b.col), `${q.err} en la cantidad de "${C}" (semana ${b.week}). No se convierte en cero.`); continue; }
        const n = s.num(r, b.col); if (!n) continue;
        const amount = pu === null ? null : dec(n * pu); const cached = s.num(r, b.col + 1);
        if (amount !== null && cached !== null && Math.abs(cached - Number(amount)) > 0.005) c.issue('diferencia_importe', s.name, addr(r, b.col + 1), `El importe guardado (${dec(cached)}) difiere de cantidad × precio (${amount}) en "${C}", semana ${b.week}.`);
        c.rec('avance_semanal', s.name, r, b.col, `${key}/${b.year}-${b.week}`, { work, section, location: sub, concept: C, unit: unit || unitRaw, year: b.year, week: b.week, weekRange: b.range, qty: dec(n, 4), unitPrice: pu === null ? null : dec(pu, 4), amount, qtyFormula: q.f || null });
        if (amount !== null) weekSum.set(b.col, (weekSum.get(b.col) || 0) + Number(amount));
      }
    }
    for (const b of blocks) { const got = weekSum.get(b.col) || 0, dcl = declared.get(b.col); if (dcl === undefined) continue; const diff = Math.round((got - dcl) * 100) / 100; stats.sheetTotals.push({ sheet: s.name, group: `${b.year}-S${String(b.week).padStart(2, '0')}`, parsed: dec(got), declared: dec(dcl), diff: dec(diff) }); if (Math.abs(diff) > 0.005) c.issue('subtotal', s.name, addr(hr, b.col), `Semana ${b.week}/${b.year}: la suma de partidas leídas (${dec(got)}) difiere del total de la hoja (${dec(dcl)}).`); }
    const errs = s.errors(); const outside = errs.length; if (outside) c.issue('error_formula', s.name, errs[0].cell, `${outside} celda(s) con error de fórmula en la hoja (p. ej. ${errs.slice(0, 3).map((e) => `${e.cell} ${e.err}`).join(', ')}). Corresponden a columnas de resumen o porcentajes y no se importan como cero.`);
  }
  return stats;
}
function otros(s, c) {
  let mode = null;
  for (let r = 6; r <= Math.min(s.rows, 91); r++) {
    const C = s.str(r, 3); if (/^RAYAS$/i.test(C)) { mode = 'rayas'; continue; } if (/^OTROS CONCEPTOS/i.test(C) || /^TOTAL/i.test(C) || /^TOTAL/i.test(s.str(r, 6))) { if (/^OTROS/i.test(C)) mode = 'otros'; else c.skip(s.name, r, 'Total: se excluye.'); continue; }
    const days = s.num(r, 5), rate = s.num(r, 6); if (mode !== 'rayas' || !C || !days) continue;
    c.rec('raya', s.name, r, 3, `${N(C)}/${N(s.str(2, 4))}`, { worker: C, unit: 'jornada', days: dec(days, 4), rate: rate === null ? null : dec(rate, 4), amount: rate === null ? null : dec(days * rate), allocationTag: s.str(r, 8) || null, weekTitle: s.str(2, 4) });
  }
}

// ───────── Pagos semanales (2023 en adelante; formatos anteriores quedan identificados como pendientes) ─────────
function pagos(sheets, c) {
  const stats = { sheetTotals: [] };
  for (const s of sheets) {
    const y = /^20\d\d$/.test(s.name) ? Number(s.name) : null;
    if (!y) { c.issue('otro', s.name, null, 'Hoja sin perfil de importación (tabla independiente). Se adjunta como evidencia.'); continue; }
    if (y < 2023) { c.issue('otro', s.name, null, `El año ${y} usa un formato anterior (columnas y bloques distintos). Su perfil está pendiente; no se interpretó para no inventar montos.`); continue; }
    let wk = null, contractor = null, payroll = false; let lines = [], comps = [], sums = [], payees = []; let startRow = 0;
    const flush = () => {
      if (!wk) return; const gross = lines.reduce((a, l) => a + Number(l.total), 0);
      const bank = comps.find((x) => /nomina dcl/.test(N(x.label))); const cashLbl = comps.find((x) => /nomina efectivo/.test(N(x.label))); const deds = comps.filter((x) => x !== bank && x !== cashLbl && x.amount < 0);
      const cash = gross - (bank ? bank.amount : 0) + deds.reduce((a, x) => a + x.amount, 0);
      const declaredGross = sums[0]?.v ?? null, declaredNet = sums.length > 1 ? sums[sums.length - 1].v : null;
      if (lines.length || comps.length) c.rec('cierre_semanal', s.name, startRow, 2, `${y}-${wk.week}-${N(wk.region)}`, { year: y, week: wk.week, title: wk.title, region: wk.region, gross: dec(gross), declaredGross: declaredGross === null ? null : dec(declaredGross), bankPayroll: bank ? dec(bank.amount) : null, deductions: deds.map((x) => ({ label: x.label, amount: dec(-x.amount) })), cash: dec(cash), declaredCash: declaredNet === null ? null : dec(declaredNet) });
      if (declaredGross !== null) { const diff = Math.round((gross - declaredGross) * 100) / 100; stats.sheetTotals.push({ sheet: s.name, group: `${y}-S${String(wk.week).padStart(2, '0')}`, parsed: dec(gross), declared: dec(declaredGross), diff: dec(diff) }); if (Math.abs(diff) > 0.005) c.issue('subtotal', s.name, sums[0].cell, `Semana ${wk.week}: las partidas leídas suman ${dec(gross)} y la hoja indica ${dec(declaredGross)}.`); }
      if (declaredNet !== null && Math.abs(cash - declaredNet) > 0.005) c.issue('diferencia_importe', s.name, sums[sums.length - 1].cell, `Semana ${wk.week}: efectivo recalculado ${dec(cash)} frente a ${dec(declaredNet)} en la hoja.`);
      lines = []; comps = []; sums = []; payees = [];
    };
    for (let r = 1; r <= s.rows; r++) {
      const B = s.str(r, 2), C = s.str(r, 3), D = s.str(r, 4), H = s.str(r, 8); const I = s.cell(r, 9);
      const m = /^Semana\s+(\d+)/i.exec(B);
      if (m) { flush(); wk = { week: Number(m[1]), title: B, region: s.str(r, 6) || 'MONTERREY' }; contractor = null; payroll = false; startRow = r; continue; }
      if (!wk) continue;
      if (/^Semana\s+\d+/i.test(C)) { payroll = true; continue; }
      if (payroll) { if (/^BANORTE/i.test(B)) { c.skip(s.name, r, 'Total de nómina bancaria: se excluye (es la suma de los beneficiarios).'); continue; } const amt = s.num(r, 3); if (D && amt) c.rec('nomina_bancaria', s.name, r, 3, `${y}-${wk.week}/${N(D)}`, { year: y, week: wk.week, worker: D, amount: dec(amt), note: s.str(r, 5) || null }); else if (D && C) c.rec('aviso_personal', s.name, r, 3, `${y}-${wk.week}/${N(D)}`, { year: y, week: wk.week, worker: D, status: C, note: s.str(r, 5) || null }); continue; }
      if (C && !D && !s.str(r, 6) && typeof s.cell(r, 3).v === 'string' && !H) { contractor = C; continue; }
      if (I.err) { c.issue('error_formula', s.name, addr(r, 9), `${I.err} en el total; no se convierte en cero.`); continue; }
      const total = s.num(r, 9);
      if (D && !/^unidad$/i.test(s.str(r, 6))) {
        const q = s.num(r, 7), p = s.num(r, 8); if (!q || total === 0) continue; // renglones de plantilla sin cantidad
        const cut = D.indexOf('-'); const work = cut > 0 ? D.slice(0, cut).trim() : D, concept = cut > 0 ? D.slice(cut + 1).trim() : '';
        const unit = normUnit(s.str(r, 6)); if (p === null) c.issue('tarifa', s.name, addr(r, 8), `"${D}" tiene cantidad sin precio en la semana ${wk.week}.`);
        const amount = p === null ? null : dec(q * p); if (amount !== null && total !== null && Math.abs(total - Number(amount)) > 0.005) c.issue('diferencia_importe', s.name, addr(r, 9), `"${D}": total guardado ${dec(total)} distinto de cantidad × precio ${amount}.`);
        if (amount !== null) lines.push({ total: amount });
        c.rec('partida_pago', s.name, r, 4, `${y}-${wk.week}/${N(contractor)}/${N(D)}`, { year: y, week: wk.week, contractor, work, concept, unit: unit || s.str(r, 6), qty: dec(q, 4), unitPrice: p === null ? null : dec(p, 4), amount, qtyFormula: s.cell(r, 7).f || null });
        continue;
      }
      if (H && total !== null && typeof s.cell(r, 8).v === 'string') { comps.push({ label: H.replace(/:$/, ''), amount: total, cell: addr(r, 9) }); continue; }
      if (!H && !D && total !== null && I.f) { sums.push({ v: total, cell: addr(r, 9) }); c.skip(s.name, r, 'Suma sin etiqueta: subtotal del bloque.'); }
    }
    flush();
    const errs = s.errors(); if (errs.length) c.issue('error_formula', s.name, errs[0].cell, `${errs.length} celda(s) con error de fórmula (${errs.slice(0, 3).map((e) => `${e.cell} ${e.err}`).join(', ')}).`);
  }
  return stats;
}

// ───────── Gastos e ingresos ─────────
function gastos(sheets, c) {
  const stats = { sheetTotals: [] };
  for (const s of sheets) {
    if (s.hidden) { c.issue('hoja_oculta', s.name, null, 'Hoja oculta de resumen (tabla dinámica o inversiones): se excluye de la carga transaccional y se conserva como evidencia.'); continue; }
    if (s.name === 'Gastos') {
      let hr = 0; for (let r = 1; r <= 10; r++) if (N(s.str(r, 4)) === 'partida') { hr = r; break; }
      if (!hr) { c.issue('otro', s.name, null, 'No se encontró el encabezado de la tabla de gastos.'); continue; }
      let nameErr = 0, sum = 0, declared = null;
      for (let r = hr + 1; r <= s.rows; r++) {
        const G = s.cell(r, 7); if (s.cell(r, 6).err) nameErr++;
        if (!G.date) { const any = s.num(r, 11) !== null || s.num(r, 16) !== null; if (any && (s.cell(r, 16).f || s.cell(r, 11).f)) { declared = (s.num(r, 11) || 0) + (s.num(r, 16) || 0); c.skip(s.name, r, 'Fila de totales de la tabla.'); } else if (any || s.str(r, 3)) c.skip(s.name, r, 'Bloque de resumen fuera de la tabla.'); continue; }
        const cash = s.num(r, 11), sub = s.num(r, 14), tax = s.num(r, 15), tot = s.num(r, 16);
        if (cash === null && tot === null) { c.issue('cantidad', s.name, addr(r, 16), `Gasto del ${G.v} sin importe ("${s.str(r, 8)}").`); continue; }
        const total = (cash || 0) + (tot || 0); sum += total; const T = s.cell(r, 20);
        if (T.v !== null && !T.date && typeof T.v === 'string' && /\d/.test(T.v)) c.issue('fecha_ambigua', s.name, addr(r, 20), `Fecha de cheque o transferencia como texto: "${T.v}". No se interpreta automáticamente.`);
        if (total < 0) c.issue('cantidad', s.name, addr(r, cash ? 11 : 16), `Importe negativo (${dec(total)}) en "${s.str(r, 8)}": requiere identificar si es devolución, reclasificación, reverso o traslado.`);
        c.rec('gasto', s.name, r, 7, `${G.v}/${N(s.str(r, 9))}/${N(s.str(r, 8))}/${dec(total)}`, { date: G.v, category: s.str(r, 4), work: s.str(r, 2) || null, description: s.str(r, 8), supplier: s.str(r, 9) || null, cashAmount: cash === null ? null : dec(cash), voucher: s.str(r, 12) || null, subtotal: sub === null ? null : dec(sub), tax: tax === null ? null : dec(tax), bankTotal: tot === null ? null : dec(tot), total: dec(total), invoice: s.str(r, 17) || null, payMethod: cash ? 'efectivo' : s.str(r, 18) || null, checkNumber: s.str(r, 19) || null, checkDate: T.date ? T.v : null, flag: s.str(r, 1) || null });
      }
      if (nameErr) c.issue('error_formula', s.name, 'F', `${nameErr} celda(s) con #NAME? en la columna "Mes" (oculta). El periodo se toma de la fecha, no de esa columna.`);
      if (declared !== null) stats.sheetTotals.push({ sheet: s.name, group: 'Total de la tabla', parsed: dec(sum), declared: dec(declared), diff: dec(sum - declared) });
    } else if (/^Rem\./.test(s.name)) {
      let hr = 0; for (let r = 1; r <= 8; r++) if (/^cliente$/i.test(s.str(r, 3))) { hr = r; break; }
      for (let r = hr + 1; hr && r <= s.rows; r++) {
        const amt = s.cell(r, 6), client = s.str(r, 3); if (!client) { if (amt.v !== null) c.skip(s.name, r, 'Fila de totales o resumen.'); continue; }
        if (amt.err) { c.issue('error_formula', s.name, addr(r, 6), `${amt.err} en el monto; no se convierte en cero.`); continue; } const n = s.num(r, 6); if (n === null) continue;
        c.rec('ingreso', s.name, r, 6, `${N(s.str(r, 2))}/${N(client)}/${N(s.str(r, 4))}/${N(s.str(r, 5))}/${dec(n)}`, { projectNo: s.str(r, 2), client, work: s.str(r, 4), concept: s.str(r, 5), amount: dec(n), amountFormula: amt.f || null, payStatus: s.str(r, 7), payMode: s.str(r, 8), invoiceDate: s.cell(r, 9).date ? s.cell(r, 9).v : null, payDate: s.cell(r, 10).date ? s.cell(r, 10).v : null, invoice: s.str(r, 19) || null, comments: s.str(r, 21) || null });
      }
    } else c.skip(s.name, 0, 'Hoja de listas: solo sirve como catálogo de referencia.');
  }
  return stats;
}

// ───────── Flujos ─────────
function flujos(sheets, c) {
  const stats = { sheetTotals: [] };
  const matrix = (s, hr, clientRow, yearRow) => {
    const works = []; for (let col = 5; col <= s.cols; col++) { const w = s.str(hr, col); if (!w || /^total/i.test(w)) { if (works.length && !w) break; continue; } works.push({ col, work: w, client: clientRow ? s.str(clientRow, col) : null, year: yearRow ? s.num(yearRow, col) : null }); }
    for (let r = hr + 1; r <= s.rows; r++) {
      const D = s.cell(r, 4); if (!D.date) { if (s.str(r, 4) || s.str(r, 2)) c.skip(s.name, r, 'Fila sin fecha: resumen o total de la matriz.'); continue; }
      const cat = s.str(r, 2), det = s.str(r, 3);
      for (const w of works) { const x = s.cell(r, w.col); if (x.err) { c.issue('error_formula', s.name, addr(r, w.col), `${x.err}; no se convierte en cero.`); continue; } const n = s.num(r, w.col); if (!n) continue;
        c.rec('asignacion_obra', s.name, r, w.col, `${D.v}/${N(cat)}/${N(det)}/${N(w.work)}`, { date: D.v, category: cat, detail: det || null, work: w.work, client: w.client, amount: dec(n), amountFormula: x.f || null }); }
    }
  };
  for (const s of sheets) {
    if (s.name === 'GLOBAL') {
      for (let r = 4; r <= s.rows; r++) {
        const B = s.cell(r, 2); const vals = [4, 5, 6, 7].map((col) => s.num(r, col));
        if (!B.date) { if (typeof B.v === 'string' && /\d{1,2}[-/ ][A-Za-z]{3}/.test(B.v) && vals.some((v) => v)) c.issue('fecha_ambigua', s.name, addr(r, 2), `Fecha capturada como texto: "${B.v.trim()}". El movimiento no se importa hasta confirmar la fecha.`); else if (vals.some((v) => v) || s.str(r, 3)) c.skip(s.name, r, 'Fila sin fecha: saldo, proyección o bloque de resumen.'); continue; }
        if (!vals.some((v) => v)) continue;
        c.rec('movimiento_caja', s.name, r, 2, `${B.v}/${N(s.str(r, 3))}/${vals.map((v) => dec(v || 0)).join('/')}`, { date: B.v, concept: s.str(r, 3), cashOut: vals[0] ? dec(vals[0]) : null, cashIn: vals[1] ? dec(vals[1]) : null, bankOut: vals[2] ? dec(vals[2]) : null, bankIn: vals[3] ? dec(vals[3]) : null, flag: s.str(r, 1) || null });
      }
      const errs = s.errors(); if (errs.length) c.issue('error_formula', s.name, errs[0].cell, `${errs.length} celda(s) con error de fórmula (${errs.slice(0, 3).map((e) => `${e.cell} ${e.err}`).join(', ')}).`);
    } else if (s.name === 'RESIDENCIALES') matrix(s, 8, 7, 6);
    else if (s.name === 'PROYECTOS') matrix(s, 5, 4, null);
    else { c.skip(s.name, 0, 'Hoja de resumen o cálculo auxiliar: se excluye de la carga transaccional.'); const errs = s.errors(); if (errs.length) c.issue('error_formula', s.name, errs[0].cell, `${errs.length} celda(s) con error de fórmula en una hoja de resumen (no se importa).`); }
  }
  return stats;
}

// ───────── Control de estimaciones del cliente y estado de cuenta ─────────
function controlCliente(sheets, c) {
  const stats = { sheetTotals: [] }; const estDates = new Map(); let work = null;
  const main = sheets.find((s) => /^Control Estimaciones/i.test(s.str(2, 2)));
  if (main) {
    const s = main; work = s.str(5, 3) || s.name; const client = s.str(4, 3); let hr = 0; for (let r = 5; r <= 15; r++) if (N(s.str(r, 2)) === 'clave') { hr = r; break; }
    const blocks = []; for (let col = 8; col <= s.cols; col++) { const m = /^Estimaci[oó]n\s+(\d+)/i.exec(s.str(hr, col)); if (m && !blocks.some((x) => x.number === Number(m[1]))) { const b = { col, number: Number(m[1]), dateText: s.str(hr + 1, col), date: parseSpanishDate(s.str(hr + 1, col)) }; blocks.push(b); estDates.set(b.number, b); if (!b.date) c.issue('fecha_ambigua', s.name, addr(hr + 1, col), `La fecha de la estimación ${b.number} está como texto y no pudo interpretarse: "${b.dateText}".`); } }
    let section = null, sub = null; const byEst = new Map();
    for (let r = hr + 3; r <= s.rows; r++) {
      const B = s.str(r, 2), C = s.str(r, 3), unitRaw = s.str(r, 5);
      if (/^(subtotal|total|\d+% )/i.test(s.str(r, 6)) || /^subtotal/i.test(C)) { c.skip(s.name, r, 'Fila de totales, impuestos o amortización: no se importa como partida.'); for (const col of [6, 9, 12, 15, 18]) { const lbl = s.str(r, col); if (/^\d+\s*%/.test(lbl)) c.issue('otro', s.name, addr(r, col), `Etiqueta "${lbl}" en el documento histórico. Es una condición de este contrato que debe importarse con su contexto y validarse; no se convierte en regla general.`); } if (/^total/i.test(s.str(r, 6))) break; continue; }
      if (!unitRaw) { if (B && !/^aditi/i.test(B)) { section = B; sub = null; } else if (C) sub = C; continue; } if (!C) continue;
      const qty = s.num(r, 4), pu = s.num(r, 6); const isAdd = /^aditi/i.test(B); const unit = normUnit(unitRaw);
      const key = [N(work), N(section), N(sub), N(C)].join('/'); const amount = qty !== null && pu !== null ? dec(qty * pu) : null;
      c.rec(isAdd ? 'partida_aditiva' : 'partida_presupuesto', s.name, r, 3, key, { work, client, section, location: sub, concept: C, unit: unit || unitRaw, qty: qty === null ? null : dec(qty, 4), unitPrice: pu === null ? null : dec(pu, 4), amount, areaStatus: s.str(r, 26) || null });
      let any = false;
      for (const b of blocks) { const q = s.cell(r, b.col + 1); if (q.err) { c.issue('error_formula', s.name, addr(r, b.col + 1), `${q.err}; no se convierte en cero.`); continue; } if (q.v !== null || q.f) any = true; const n = s.num(r, b.col + 1); if (!n) continue;
        const rec = { work, estimate: b.number, estimateDate: b.date, dateText: b.dateText, section, location: sub, concept: C, unit: unit || unitRaw, qty: dec(n, 4), unitPrice: pu === null ? null : dec(pu, 4), amount: pu === null ? null : dec(n * pu), qtyFormula: q.f || null };
        c.rec('partida_estimacion_cliente', s.name, r, b.col + 1, `${key}/E${b.number}`, rec); if (!byEst.has(b.number)) byEst.set(b.number, []); byEst.get(b.number).push({ ...rec, cell: addr(r, b.col + 1) }); }
      // Partida presupuestada sin ningún seguimiento: sigue visible como pendiente.
      if (!isAdd && !any && amount && !blocks.some((b) => s.cell(r, b.col).f || s.cell(r, b.col + 2).f)) c.issue('otro', s.name, addr(r, 7), `"${C}" (${sub || section}) está presupuestada por ${amount} y no tiene columnas de seguimiento ni ejecución. Se importa como pendiente; no se clasifica como pérdida.`);
      for (const b of blocks) for (const off of [0, 1, 2]) { const x = s.cell(r, b.col + off); if (x.err && off !== 1) c.issue('error_formula', s.name, addr(r, b.col + off), `${x.err} en una columna derivada (porcentaje o importe).`); }
    }
    // Mediciones casi iguales dentro de la misma estimación: se pide revisión; no se promedia ni se elige la más reciente.
    for (const [n, list] of byEst) { const f = list.map((x) => ({ x, a: addends(x.qtyFormula) })).filter((y) => y.a);
      for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) { const A = f[i].a, Bq = f[j].a; if (A.length !== Bq.length) continue; const diffs = A.map((v, k) => [v, Bq[k]]).filter(([p, q]) => p !== q); if (diffs.length !== 1) continue; const [p, q] = diffs[0].map(Number); if (Math.abs(p - q) / Math.max(p, q) < 0.02) c.issue('diferencia_medicion', main.name, `${f[i].x.cell} / ${f[j].x.cell}`, `Estimación ${n}: "${f[i].x.concept}" usa ${diffs[0][0]} y "${f[j].x.concept}" usa ${diffs[0][1]} para la misma zona (${f[i].x.location || f[i].x.section}). Requiere revisión; no se promedia ni se toma la más reciente.`); } }
  }
  const st = sheets.find((s) => /estado de cuenta/i.test(s.name));
  if (st) { let mode = null;
    for (let r = 1; r <= Math.min(st.rows, 120); r++) {
      const B = st.cell(r, 2), C = st.str(r, 3), lead = `${st.str(r, 2)} ${C}`;
      if (/ESTIMACIONES:/i.test(lead)) { mode = 'est'; continue; } if (/PAGOS:/i.test(lead)) { mode = 'pay'; continue; } if (/AMORTIZACI[OÓ]N DE ANTICIPO/i.test(lead)) { mode = 'amo'; continue; }
      for (const col of [3, 4, 5, 6, 7]) { const lbl = st.str(r, col); if (/^\d+\s*%/.test(lbl) && !B.date) c.issue('otro', st.name, addr(r, col), `Etiqueta "${lbl}" en el estado de cuenta histórico: dato del contrato que debe validarse; no es regla del sistema.`); }
      if (!B.date) { if (mode && st.num(r, 4) !== null && /total|anticipo|estimaciones/i.test(`${C} ${st.str(r, 3)}`)) c.skip(st.name, r, 'Resumen del estado de cuenta.'); continue; }
      if (mode === 'est') { const m = /(\d+)/.exec(C); const n = m ? Number(m[1]) : null; const sub = st.num(r, 4);
        c.rec('estado_cuenta_estimacion', st.name, r, 2, `${N(work)}/E${n}`, { work, estimate: n, date: B.v, concept: C, amount: sub === null ? null : dec(sub), tax: st.num(r, 5) === null ? null : dec(st.num(r, 5)), subtotal: st.num(r, 6) === null ? null : dec(st.num(r, 6)), amortization: st.num(r, 7) === null ? null : dec(st.num(r, 7)), total: st.num(r, 8) === null ? null : dec(st.num(r, 8)) });
        const other = estDates.get(n); if (other?.date && other.date !== B.v) c.issue('fecha_conflicto', st.name, addr(r, 2), `La estimación ${n} tiene fecha ${B.v} en el estado de cuenta y "${other.dateText}" (${other.date}) en el control de estimaciones. Se muestran ambas; no se corrige en silencio.`); }
      else if (mode === 'pay') { const a = st.num(r, 4); if (a !== null) c.rec('estado_cuenta_pago', st.name, r, 2, `${N(work)}/${B.v}/${dec(a)}`, { work, date: B.v, concept: C, amount: dec(a) }); }
      else if (mode === 'amo') { const a = st.num(r, 4) ?? st.num(r, 5); c.rec('estado_cuenta_amortizacion', st.name, r, 2, `${N(work)}/${B.v}/${N(C)}`, { work, date: B.v, concept: C, amount: a === null ? null : dec(a) }); }
    }
  }
  return stats;
}

const PARSERS = { estimaciones, pagos_semanales: pagos, gastos, flujos, control_cliente: controlCliente };
export function identify(sheets) { for (const [k, p] of Object.entries(PROFILES)) if (p.detect(sheets)) return k; return null; }
export function parse(profile, sheets, fileName) {
  const c = ctxFor(fileName); const stats = PARSERS[profile](sheets, c);
  return { records: c.records, issues: c.issues, excluded: c.excluded, sheetTotals: stats.sheetTotals || [] };
}
