// Generación de PDF operativos a partir de un modelo de documento. El mismo modelo alimenta pantalla,
// CSV y PDF, de modo que cantidades e importes coinciden con la misma regla de redondeo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { fmtMoney, fmtQty } from '../domain/decimal.js';
import { fmtDate, fmtInstant } from '../domain/dates.js';

export function fmtCell(v, type, col = {}) {
  if (v === null || v === undefined || v === '') return col.missing || '—';
  switch (type) {
    case 'money': return fmtMoney(v);
    case 'qty': return fmtQty(v, col.decimals ?? 2);
    case 'price': return fmtMoney(v);
    case 'date': return fmtDate(v);
    case 'instant': return fmtInstant(v);
    case 'status': return col.values?.[v] || String(v);
    case 'bool': return v ? 'Sí' : 'No';
    default: return String(v);
  }
}
// Cadenas exactas que se dibujan (también sirve para verificar coincidencia con pantalla y CSV).
export function layout(model) {
  return {
    meta: model.meta.map(([k, v, t]) => [k, fmtCell(v, t)]),
    highlights: (model.highlights || []).map(([k, v, t]) => [k, fmtCell(v, t || 'money', { missing: 'Por definir' })]),
    sections: model.sections.map((s) => ({ title: s.title, note: s.note || null, head: (s.columns || []).map((c) => c.label), rows: (s.rows || []).map((r) => s.columns.map((c) => fmtCell(r[c.key], c.type, c))), totals: (s.totals || []).map(([k, v, t]) => [k, fmtCell(v, t || 'money', { missing: 'Por definir' })]), paragraphs: s.paragraphs || [], signatures: (s.signatures || []).map((x) => x.label), images: s.images || [] })),
  };
}

// Tipografía de la interfaz (Geist), incrustada. Si el paquete no está, se usa Helvetica.
const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'node_modules', '@fontsource', 'geist-sans', 'files');
const FONTS = (() => { try { const f = (w) => fs.readFileSync(path.join(FONT_DIR, `geist-sans-latin-${w}-normal.woff`)); return { R: f(400), M: f(500), S: f(600), B: f(700) }; } catch { return null; } })();
const FALLBACK = { R: 'Helvetica', M: 'Helvetica', S: 'Helvetica-Bold', B: 'Helvetica-Bold' };
const SUB = { '→': '>', '←': '<', '≥': '>=', '≤': '<=', '✓': 'Sí', '✗': 'No', '“': '"', '”': '"', '‘': "'", '’': "'", '…': '...', '\t': ' ', ' ': ' ', '﻿': '' };

const INK = '#0a0a0a', TEXT = '#27272a', MUTED = '#71717a', FAINT = '#a1a1aa', LINE = '#e4e4e7', RULE = '#d4d4d8', SOFT = '#f4f4f5';
const TONES = { ok: { fg: '#166534', bg: '#dcfce7' }, warn: { fg: '#92400e', bg: '#fef3c7' }, bad: { fg: '#991b1b', bg: '#fee2e2' }, neutral: { fg: '#3f3f46', bg: '#f4f4f5' } };
const toneOf = (s) => { const t = String(s || '').toLowerCase(); return /rechaz|revert|cancel|sustitu|vencid|no concilia/.test(t) ? 'bad' : /borrador|pendiente|preparad|revisi|observ|propuesta|sin confirmar|parcial|no pagado|por valorar|por definir|abierta|faltante/.test(t) ? 'warn' : /autoriz|cerrad|confirm|aprob|vigente|emitid|pagad|acept|atendid|cobrad|conciliad|validad|resuelt|inclui/.test(t) ? 'ok' : 'neutral'; };
const SERIES = ['#18181b', '#2563eb', '#0d9488', '#d97706', '#be123c', '#7c3aed', '#71717a', '#a1a1aa'];
const NUM = new Set(['money', 'qty', 'price', 'int']);
const FIXED = new Set(['money', 'qty', 'price', 'int', 'date', 'instant', 'status', 'bool']);
const LOGO = ['M24 104V24h40v20H44v60', 'M34 104V34h20', 'M104 24v80H64V84h20V24', 'M94 24v70H74', 'M54 54h20v20H54z'];
const compact = (n, type) => { const a = Math.abs(n); const s = a >= 1e6 ? `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)} M` : a >= 1e4 ? `${Math.round(n / 1e3)} k` : a >= 1e3 ? `${(n / 1e3).toFixed(1)} k` : String(Math.round(n * 100) / 100); return type === 'money' ? `$${s}` : s; };
const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };

export function renderPdf(model, { watermark = null, images = {} } = {}) {
  return new Promise((resolve, reject) => {
    const wide = model.orientation ? model.orientation === 'landscape' : model.sections.some((s) => (s.columns || []).length >= 8);
    const MG = { top: 46, bottom: 58, left: 48, right: 48 }; const TOP2 = 76;
    const doc = new PDFDocument({ size: 'LETTER', layout: wide ? 'landscape' : 'portrait', margins: MG, bufferPages: true, info: { Title: `${model.title} ${model.folio || ''}`.trim(), Author: 'DCL Instalaciones', Subject: model.audienceLabel || 'Documento operativo' } });
    const chunks = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    for (const k of ['R', 'M', 'S', 'B']) doc.registerFont(k, FONTS ? FONTS[k] : FALLBACK[k]);
    doc.options.margins = { ...MG, top: TOP2 }; // las páginas siguientes reservan el encabezado corrido
    const fk = FONTS ? doc.font('R')._font?.font : null;
    const safe = (s) => { const str = String(s ?? ''); if (!fk) return str; let out = ''; for (const ch of str) out += ch === '\n' || fk.hasGlyphForCodePoint(ch.codePointAt(0)) ? ch : (SUB[ch] ?? '?'); return out; };
    const L = layout(model); const X = MG.left; const W = doc.page.width - MG.left - MG.right; const PH = doc.page.height; const bottom = PH - MG.bottom;
    const opt = (o = {}) => ({ width: o.width, align: o.align, lineBreak: o.width !== undefined, features: o.tnum ? ['tnum'] : undefined, characterSpacing: o.spacing, lineGap: o.lineGap ?? 1, height: o.height, ellipsis: o.ellipsis });
    const use = (o = {}) => doc.font(o.font || 'R').fontSize(o.size || 9);
    const T = (s, x, y, o = {}) => { const keep = doc.y; use(o).fillColor(o.color || TEXT).text(safe(s), x, y, opt(o)); doc.y = keep; }; // la posición vertical se lleva a mano
    const TR = (s, right, y, o = {}) => { const w = use(o).widthOfString(safe(s), opt(o)); T(s, right - w, y, o); return w; };
    const wOf = (s, o = {}) => use(o).widthOfString(safe(s), opt(o));
    const hOf = (s, width, o = {}) => use(o).heightOfString(safe(s), opt({ ...o, width }));
    const newPage = () => { doc.addPage(); doc.y = TOP2; };
    const ensure = (h) => { if (doc.y + h > bottom) { newPage(); return true; } return false; };
    const hline = (y, color = LINE, w = 0.6, x0 = X, x1 = X + W) => { doc.moveTo(x0, y).lineTo(x1, y).lineWidth(w).strokeColor(color).stroke(); };
    const logo = (x, y, size) => { doc.save(); doc.translate(x, y).scale(size / 128); doc.roundedRect(0, 0, 128, 128, 26).fill(INK); doc.lineWidth(6).strokeColor('#ffffff').lineJoin('miter'); for (const p of LOGO) doc.path(p).stroke(); doc.restore(); };
    const pill = (label, right, y) => { const tone = TONES[toneOf(`${model.status || ''} ${label}`)]; const w = wOf(label, { font: 'M', size: 8 }) + 18; doc.roundedRect(right - w, y, w, 18, 9).fill(tone.bg); T(label, right - w + 9, y + 4.6, { font: 'M', size: 8, color: tone.fg }); return w; };

    // ── Encabezado de la primera página ──
    logo(X, MG.top, 30);
    T('DCL Instalaciones', X + 40, MG.top + 3, { font: 'S', size: 11.5, color: INK });
    T(model.audienceLabel || 'Documento operativo', X + 40, MG.top + 18, { size: 8, color: MUTED });
    if (model.folio) { TR('FOLIO', X + W, MG.top + 3, { font: 'M', size: 6.5, color: MUTED, spacing: 0.7 }); TR(model.folio, X + W, MG.top + 13, { font: 'S', size: 12, color: INK, tnum: true }); }
    let y = MG.top + 52; const pw = model.statusLabel ? pill(model.statusLabel, X + W, y + 5) : 0;
    const th = hOf(model.title, W - pw - 16, { font: 'B', size: 20, lineGap: 0 }); T(model.title, X, y, { font: 'B', size: 20, color: INK, width: W - pw - 16, lineGap: 0 }); y += th + 3;
    const sub = [model.versionLabel, model.subtitle].filter(Boolean).join('  ·  '); if (sub) { T(sub, X, y, { size: 9, color: MUTED, width: W }); y += hOf(sub, W, { size: 9 }) + 2; }
    y += 9; hline(y, RULE, 0.8); y += 13;
    // Datos generales en rejilla
    const mc = L.meta.length <= 4 ? Math.max(L.meta.length, 2) : wide ? 4 : 3; const mw = W / mc;
    for (let i = 0; i < L.meta.length; i += mc) { const row = L.meta.slice(i, i + mc); const hs = row.map(([, v]) => hOf(v, mw - 16, { size: 9.5 })); const rh = Math.max(...hs) + 22; if (y + rh > bottom) { newPage(); y = doc.y; }
      row.forEach(([k, v], j) => { T(k.toUpperCase(), X + j * mw, y, { font: 'M', size: 6.5, color: MUTED, spacing: 0.6, width: mw - 16, height: 9, ellipsis: true }); T(v, X + j * mw, y + 10.5, { size: 9.5, color: INK, width: mw - 16 }); }); y += rh; }
    if (L.meta.length) { hline(y, LINE); y += 14; }
    // Cifras principales
    if (L.highlights.length) { const hl = L.highlights.slice(0, wide ? 5 : 4); const gap = 10; const cw = (W - gap * (hl.length - 1)) / hl.length; const ch = 54;
      hl.forEach(([k, v], i) => { const x = X + i * (cw + gap); const primary = (model.highlights[i] || [])[3] === 'primary'; doc.roundedRect(x, y, cw, ch, 6); if (primary) doc.fill(INK); else doc.lineWidth(0.8).strokeColor(LINE).stroke();
        T(k.toUpperCase(), x + 12, y + 11, { font: 'M', size: 6.5, color: primary ? '#d4d4d8' : MUTED, spacing: 0.6, width: cw - 24, height: 9, ellipsis: true });
        let size = 16; while (size > 9 && wOf(v, { font: 'S', size, tnum: true }) > cw - 24) size -= 0.5; T(v, x + 12, y + 25 + (16 - size) * 0.6, { font: 'S', size, color: primary ? '#ffffff' : INK, tnum: true }); });
      y += ch + 8; }
    doc.y = y;

    // ── Secciones ──
    for (const [si, s] of L.sections.entries()) {
      const src = model.sections[si]; const hasTable = s.head.length > 0;
      doc.y += si === 0 ? 8 : 20; ensure(hasTable ? 96 : src.chart ? 190 : 54);
      const title = () => { T(s.title, X, doc.y, { font: 'S', size: 11, color: INK, width: W }); doc.y += hOf(s.title, W, { font: 'S', size: 11 }) + 7; }; title();
      for (const p of s.paragraphs) { const h = hOf(p, W, { size: 9, lineGap: 2.5 }); ensure(h + 4); T(p, X, doc.y, { size: 9, width: W, lineGap: 2.5 }); doc.y += h + 5; }
      if (src.chart) drawChart(src.chart);
      if (hasTable) drawTable(s, src);
      if (s.totals.length) drawTotals(s.totals);
      if (s.note) { const h = hOf(s.note, W - 12, { size: 7.5, lineGap: 1.5 }); ensure(h + 12); doc.y += 9; doc.rect(X, doc.y - 1, 2, h + 2).fill(RULE); T(s.note, X + 10, doc.y, { size: 7.5, color: MUTED, width: W - 12, lineGap: 1.5 }); doc.y += h + 2; }
      if (s.signatures.length) { ensure(86); const n = s.signatures.length; const gap = 28; const sw = Math.min(250, (W - gap * (n - 1)) / n); const y0 = doc.y + 52;
        s.signatures.forEach((lbl, i) => { const x = X + i * (sw + gap); hline(y0, '#52525b', 0.7, x, x + sw); T(lbl, x, y0 + 5, { size: 7.5, color: MUTED, width: sw, align: 'center' }); }); doc.y = y0 + 22; }
      if (s.images.length) drawImages(s.images);
    }

    function drawTable(s, src) {
      const cols = src.columns; let fs0 = 8.5; const padX = 6; let ws;
      const fit = () => { const head = cols.map((c) => Math.max(...c.label.toUpperCase().split(/\s+/).map((w) => wOf(w, { font: 'S', size: 6.5, spacing: 0.5 }))) + padX * 2 + 1);
        const nat = cols.map((c, i) => Math.max(head[i], Math.max(0, ...s.rows.map((r) => wOf(r[i], { size: fs0, tnum: NUM.has(c.type) }))) + padX * 2 + (c.type === 'status' ? 10 : 0) + 1));
        const flex = cols.map((c, i) => !FIXED.has(c.type) && nat[i] > 76); const sum = nat.reduce((a, b) => a + b, 0);
        if (sum <= W) { const extra = W - sum; const text = cols.map((c) => !FIXED.has(c.type)); const base = text.some(Boolean) ? nat.map((n, i) => (text[i] ? n : 0)) : nat; const bt = base.reduce((a, b) => a + b, 0); ws = nat.map((n, i) => n + (extra * base[i]) / bt); return true; }
        // No cabe: las columnas de texto largo ceden ancho (y doblan renglón); cifras, fechas y estados nunca se parten.
        const word = cols.map((c, i) => Math.max(head[i], Math.max(0, ...s.rows.map((r) => Math.max(...String(r[i]).split(/[\s/›·-]+/).map((w) => wOf(w, { size: fs0 }))))) + padX * 2 + 2)); let rest = W - nat.reduce((a, n, i) => a + (flex[i] ? 0 : n), 0); const open = new Set(flex.map((f, i) => (f ? i : -1)).filter((i) => i >= 0));
        const MINW = (i) => Math.min(nat[i], Math.max(62, word[i])); if (!open.size || rest < [...open].reduce((a, i) => a + MINW(i), 0)) { ws = nat.map((n) => (n * W) / sum); return false; }
        ws = [...nat]; for (let pass = 0; pass < 4; pass++) { const wt = [...open].reduce((a, i) => a + Math.min(nat[i], 320), 0); let again = false; for (const i of open) { const w = (Math.min(nat[i], 320) * rest) / wt; if (w < MINW(i)) { ws[i] = MINW(i); rest -= MINW(i); open.delete(i); again = true; break; } ws[i] = w; } if (!again) break; }
        return true; };
      if (!fit()) { fs0 = 7.5; if (!fit()) { fs0 = 6.8; fit(); } }
      const right = (i) => NUM.has(cols[i].type);
      const head = () => { const hh = Math.max(...s.head.map((t, i) => hOf(t.toUpperCase(), ws[i] - padX * 2, { font: 'S', size: 6.5, spacing: 0.5 }))) + 11; const y0 = doc.y; doc.rect(X, y0, W, hh).fill(SOFT); let x = X;
        s.head.forEach((t, i) => { T(t.toUpperCase(), x + padX, y0 + 5.5, { font: 'S', size: 6.5, color: '#52525b', spacing: 0.5, width: ws[i] - padX * 2, align: right(i) ? 'right' : 'left' }); x += ws[i]; }); hline(y0 + hh, RULE, 0.8); doc.y = y0 + hh; };
      head();
      if (!s.rows.length) { T('Sin renglones.', X + padX, doc.y + 8, { size: 8.5, color: MUTED }); doc.y += 26; hline(doc.y, LINE); return; }
      s.rows.forEach((r, ri) => {
        const h = Math.max(...r.map((t, i) => hOf(t, ws[i] - padX * 2 - (cols[i].type === 'status' ? 10 : 0), { size: fs0, tnum: right(i) }))) + 9.5;
        if (doc.y + h > bottom) { newPage(); T(`${s.title} (continúa)`, X, doc.y, { size: 7.5, color: MUTED }); doc.y += 14; head(); }
        const y0 = doc.y; let x = X;
        r.forEach((t, i) => { const c = cols[i]; const raw = src.rows[ri]?.[c.key]; const missing = raw === null || raw === undefined || raw === ''; let cx = x + padX; let cw = ws[i] - padX * 2;
          if (c.type === 'status' && !missing) { doc.circle(cx + 2.4, y0 + 5 + fs0 * 0.36, 2.3).fill(TONES[toneOf(`${raw} ${t}`)].fg); cx += 10; cw -= 10; }
          T(t, cx, y0 + 4.5, { size: fs0, color: missing ? FAINT : NUM.has(c.type) && String(raw).startsWith('-') ? '#991b1b' : TEXT, width: cw, align: right(i) ? 'right' : 'left', tnum: right(i) || c.type === 'date' }); x += ws[i]; });
        doc.y = y0 + h; hline(doc.y, LINE, 0.5);
      });
    }
    function drawTotals(totals) {
      const bw = Math.min(W, Math.max(wide ? 320 : 290, ...totals.map(([k, v]) => wOf(k, { size: 8.5 }) + wOf(v, { font: 'M', size: 9, tnum: true }) + 28))); const x0 = X + W - bw; const hs = totals.map(([k]) => (/^total|^saldo/i.test(k) ? 25 : 16.5)); const total = hs.reduce((a, b) => a + b, 0) + 10;
      if (total < bottom - TOP2) ensure(total); doc.y += 9;
      totals.forEach(([k, v], i) => { const strong = hs[i] > 20; if (doc.y + hs[i] > bottom) newPage(); const y0 = doc.y; const missing = v === 'Por definir' || v === '—';
        if (strong) { hline(y0 + 2, '#52525b', 0.8, x0, X + W); T(k, x0, y0 + 9, { font: 'S', size: 9.5, color: INK, width: bw - 120 }); TR(v, X + W, y0 + 7.5, { font: 'B', size: 12, color: missing ? MUTED : INK, tnum: true }); }
        else { T(k, x0, y0 + 2, { size: 8.5, color: MUTED, width: bw - wOf(v, { font: 'M', size: 9, tnum: true }) - 12, height: 11, ellipsis: true }); TR(v, X + W, y0 + 2, { font: 'M', size: 9, color: missing ? FAINT : TEXT, tnum: true }); }
        doc.y = y0 + hs[i]; });
    }
    // Evidencias fotográficas (copias incrustadas; el original permanece intacto en el expediente).
    function drawImages(list) {
      const n = wide ? 3 : 2; const gap = 12; const w = (W - gap * (n - 1)) / n; const h = Math.round(w * 0.68); doc.y += 4;
      list.forEach((im, i) => { const col = i % n; if (col === 0 && i) doc.y += h + 34; if (col === 0) ensure(h + 34); const x = X + col * (w + gap); const y0 = doc.y; const buf = images[im.id];
        doc.save(); doc.roundedRect(x, y0, w, h, 5).clip(); doc.rect(x, y0, w, h).fill(SOFT); let ok = false; if (buf) { try { doc.image(buf, x, y0, { cover: [w, h], align: 'center', valign: 'center' }); ok = true; } catch { ok = false; } } doc.restore();
        if (!ok) T(buf ? 'Vista previa no disponible' : im.isImage ? 'Imagen no disponible' : 'Documento adjunto (consultar en el expediente)', x + 12, y0 + h / 2 - 5, { size: 8, color: MUTED, width: w - 24, align: 'center' });
        doc.roundedRect(x, y0, w, h, 5).lineWidth(0.6).strokeColor(RULE).stroke();
        T([im.caption || im.name, im.location, im.takenAtDeclared ? `Toma declarada: ${fmtInstant(im.takenAtDeclared)}` : 'Fecha de toma no disponible'].filter(Boolean).join(' · '), x, y0 + h + 5, { size: 7.5, color: MUTED, width: w, height: 20, ellipsis: true }); doc.y = y0; });
      doc.y += h + 34;
    }
    // Gráficas vectoriales: barras horizontales (comparaciones), columnas y líneas (series de tiempo).
    function drawChart(ch) {
      const type = ch.type || 'hbar'; const vt = ch.valueType || 'money'; const series = ch.series.map((sr) => ({ name: sr.name, data: sr.data.map((v) => (v === null || v === undefined || v === '' ? null : Number(v))) })); const multi = series.length > 1;
      const fmt = (v) => (v === null ? '—' : vt === 'money' ? fmtMoney(v.toFixed(2)) : vt === 'int' ? String(Math.round(v)) : fmtQty(v.toFixed(4), 2));
      const legend = () => { if (!multi) return; let x = X; let y0 = doc.y; for (const [i, sr] of series.entries()) { const w = wOf(sr.name, { size: 7.5 }) + 22; if (x + w > X + W) { x = X; y0 += 13; } doc.roundedRect(x, y0 + 1, 8, 8, 2).fill(SERIES[i % SERIES.length]); T(sr.name, x + 12, y0, { size: 7.5, color: TEXT }); x += w; } doc.y = y0 + 18; };
      if (type === 'hbar') {
        const n = Math.min(ch.categories.length, 20); const rowH = 17; ensure(Math.min(n, 8) * rowH + (multi ? 30 : 10)); legend();
        const lw = Math.min(W * 0.34, Math.max(60, ...ch.categories.slice(0, n).map((c) => wOf(c, { size: 8 }))) + 10); const tot = (i) => series.reduce((a, sr) => a + Math.max(0, sr.data[i] || 0), 0); const val = (i) => (multi ? tot(i) : series[0].data[i]);
        const vw = Math.max(...Array.from({ length: n }, (_, i) => wOf(fmt(val(i)), { size: 7.5, tnum: true }))) + 8; const bx = X + lw; const bw = W - lw - vw; const hi = Math.max(1e-9, ...Array.from({ length: n }, (_, i) => Math.abs(val(i) || 0)));
        for (let i = 0; i < n; i++) { if (doc.y + rowH > bottom) newPage(); const y0 = doc.y; T(ch.categories[i], X, y0 + 3.5, { size: 8, color: TEXT, width: lw - 10, height: 10, ellipsis: true }); doc.roundedRect(bx, y0 + 3, bw, 10, 2).fill(SOFT); let x = bx;
          series.forEach((sr, k) => { const v = multi ? Math.max(0, sr.data[i] || 0) : Math.abs(sr.data[i] || 0); const w = (v / hi) * bw; if (w > 0.2) { doc.roundedRect(x, y0 + 3, Math.max(w, 1.5), 10, multi ? 0 : 2).fill(!multi && (sr.data[i] || 0) < 0 ? '#b91c1c' : SERIES[k % SERIES.length]); x += w; } });
          TR(fmt(val(i)), X + W, y0 + 4, { size: 7.5, color: TEXT, tnum: true }); doc.y = y0 + rowH; }
        if (ch.categories.length > n) { T(`Se grafican los primeros ${n} de ${ch.categories.length}; la tabla incluye todos.`, X, doc.y + 2, { size: 7, color: MUTED }); doc.y += 12; }
        doc.y += 6; return;
      }
      ensure(multi ? 215 : 195); legend(); const n = ch.categories.length; const y0 = doc.y + 4; const ph = 140; const ax = 44; const px = X + ax; const pw2 = W - ax - 6; const stack = type === 'column' && multi;
      const hi = niceMax(Math.max(1e-9, ...(stack ? ch.categories.map((_, i) => series.reduce((a, sr) => a + Math.max(0, sr.data[i] || 0), 0)) : series.flatMap((sr) => sr.data.map((v) => v || 0))))); const Y = (v) => y0 + ph - (Math.max(0, v) / hi) * ph;
      for (let g = 0; g <= 4; g++) { const v = (hi * g) / 4; hline(Y(v), g ? LINE : RULE, g ? 0.5 : 0.8, px, px + pw2); TR(compact(v, vt), px - 6, Y(v) - 3.5, { size: 7, color: MUTED, tnum: true }); }
      const step = pw2 / Math.max(n, 1); const cx = (i) => px + step * (i + 0.5); const every = Math.max(1, Math.ceil((n * 46) / pw2));
      ch.categories.forEach((c, i) => { if (i % every === 0) T(c, cx(i) - 40, y0 + ph + 5, { size: 7, color: MUTED, width: 80, align: 'center', height: 9, ellipsis: true }); });
      if (type === 'column') { const bw = Math.min(34, step * 0.62); for (let i = 0; i < n; i++) { let base = 0; series.forEach((sr, k) => { const v = Math.max(0, sr.data[i] || 0); if (!v) return; const yb = Y(base), yt = Y(base + v); doc.rect(cx(i) - bw / 2, yt, bw, Math.max(yb - yt, 0.6)).fill(SERIES[k % SERIES.length]); if (stack) base += v; }); } }
      else series.forEach((sr, k) => { const color = SERIES[k % SERIES.length]; let started = false; doc.lineWidth(1.4).strokeColor(color).lineJoin('round'); sr.data.forEach((v, i) => { if (v === null) return; if (started) doc.lineTo(cx(i), Y(v)); else { doc.moveTo(cx(i), Y(v)); started = true; } }); if (started) doc.stroke(); if (n <= 31) sr.data.forEach((v, i) => { if (v !== null) doc.circle(cx(i), Y(v), 1.9).fill(color); }); });
      doc.y = y0 + ph + 24;
    }

    // ── Encabezado corrido, pie y marca de agua en todas las páginas ──
    const range = doc.bufferedPageRange(); const foot = model.footer || 'Documento operativo de DCL Instalaciones. No es un comprobante fiscal ni una constancia de transferencia.';
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i); doc.page.margins.bottom = 0; doc.page.margins.top = 0;
      if (i > range.start) { logo(X, 38, 16); T('DCL Instalaciones', X + 23, 41.5, { font: 'S', size: 8.5, color: INK }); const bw = wOf('DCL Instalaciones', { font: 'S', size: 8.5 }); T(`·  ${model.title}`, X + 23 + bw + 6, 41.5, { size: 8.5, color: MUTED, width: W * 0.5, height: 11, ellipsis: true }); TR([model.folio, model.versionLabel].filter(Boolean).join('  ·  '), X + W, 41.5, { size: 8.5, color: MUTED, tnum: true }); hline(62, LINE); }
      if (watermark) { doc.save(); doc.rotate(-32, { origin: [doc.page.width / 2, PH / 2] }); doc.font('B').fontSize(wide ? 120 : 96).fillColor('#000000').opacity(0.055).text(safe(watermark), 0, PH / 2 - 60, { width: doc.page.width, align: 'center', lineBreak: false, characterSpacing: 6 }); doc.restore(); doc.opacity(1); }
      hline(PH - 42, LINE); T(foot, X, PH - 34, { size: 6.5, color: MUTED, width: W - 110, height: 18, ellipsis: true, lineGap: 1 });
      TR(`Página ${i - range.start + 1} de ${range.count}`, X + W, PH - 34, { font: 'M', size: 7.5, color: MUTED, tnum: true });
    }
    doc.end();
  });
}
