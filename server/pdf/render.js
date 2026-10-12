// Generación de PDF operativos a partir de un modelo de documento. El mismo modelo alimenta pantalla,
// CSV y PDF, de modo que cantidades e importes coinciden con la misma regla de redondeo.
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
    sections: model.sections.map((s) => ({ title: s.title, note: s.note || null, head: (s.columns || []).map((c) => c.label), rows: (s.rows || []).map((r) => s.columns.map((c) => fmtCell(r[c.key], c.type, c))), totals: (s.totals || []).map(([k, v, t]) => [k, fmtCell(v, t || 'money', { missing: 'Por definir' })]), paragraphs: s.paragraphs || [], images: s.images || [] })),
  };
}

const NUM = new Set(['money', 'qty', 'price', 'int']);
export function renderPdf(model, { watermark = null, images = {} } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 54, bottom: 54, left: 42, right: 42 }, bufferPages: true, info: { Title: `${model.title} ${model.folio || ''}`.trim(), Author: 'DCL Instalaciones', Subject: 'Documento operativo' } });
    const chunks = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    const L = layout(model); const W = doc.page.width - 84; const bottom = () => doc.page.height - 64;
    const ensure = (h) => { if (doc.y + h > bottom()) doc.addPage(); };
    // Encabezado
    doc.rect(42, 40, W, 46).fill('#111111');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13).text('DCL INSTALACIONES', 54, 50, { characterSpacing: 1.5 });
    doc.font('Helvetica').fontSize(8).text(model.audienceLabel || '', 54, 68);
    doc.font('Helvetica-Bold').fontSize(11).text(model.title, 42, 50, { width: W - 12, align: 'right' });
    doc.font('Helvetica').fontSize(9).text([model.folio, model.versionLabel, model.statusLabel].filter(Boolean).join('  ·  '), 42, 67, { width: W - 12, align: 'right' });
    doc.fillColor('#111111'); doc.y = 100;
    const colW = W / 2;
    L.meta.forEach(([k, v], i) => { const x = 42 + (i % 2) * colW; if (i % 2 === 0) ensure(16); const y = doc.y; doc.font('Helvetica').fontSize(7.5).fillColor('#666666').text(k.toUpperCase(), x, y, { width: colW - 8 }); doc.font('Helvetica').fontSize(9.5).fillColor('#111111').text(v, x, y + 9, { width: colW - 8 }); if (i % 2 === 1 || i === L.meta.length - 1) doc.y = Math.max(doc.y, y + 24) + 4; else doc.y = y; });
    for (const [si, s] of L.sections.entries()) {
      const src = model.sections[si]; ensure(40); doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111').text(s.title, 42, doc.y, { width: W });
      doc.moveTo(42, doc.y + 2).lineTo(42 + W, doc.y + 2).lineWidth(0.8).stroke('#111111'); doc.y += 7;
      for (const p of s.paragraphs) { ensure(24); doc.font('Helvetica').fontSize(8.5).fillColor('#333333').text(p, 42, doc.y, { width: W }); doc.y += 3; }
      if (s.head.length) {
        const cols = src.columns; const weights = cols.map((c) => c.w || (NUM.has(c.type) ? 1.1 : c.type === 'date' ? 1 : 2.4)); const tw = weights.reduce((a, b) => a + b, 0); const ws = weights.map((w) => (w / tw) * W);
        const drawRow = (cells, { bold = false, bg = null, color = '#111111' } = {}) => {
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
          const h = Math.max(...cells.map((t, i) => doc.heightOfString(String(t), { width: ws[i] - 8 }))) + 7;
          if (doc.y + h > bottom()) { doc.addPage(); if (!bold) drawRow(s.head, { bold: true, bg: '#eeeeee' }); doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8); }
          const y = doc.y; if (bg) doc.rect(42, y, W, h).fill(bg);
          let x = 42; cells.forEach((t, i) => { doc.fillColor(color).text(String(t), x + 4, y + 3.5, { width: ws[i] - 8, align: NUM.has(cols[i].type) ? 'right' : 'left' }); x += ws[i]; });
          doc.moveTo(42, y + h).lineTo(42 + W, y + h).lineWidth(0.3).stroke('#bbbbbb'); doc.y = y + h;
        };
        drawRow(s.head, { bold: true, bg: '#eeeeee' });
        if (!s.rows.length) { doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#666666').text('Sin renglones.', 46, doc.y + 4); doc.y += 6; }
        s.rows.forEach((r) => drawRow(r));
      }
      if (s.totals.length) { doc.y += 5; for (const [k, v] of s.totals) { ensure(15); const y = doc.y; const strong = /^total/i.test(k); doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(strong ? 10 : 9).fillColor('#111111').text(k, 42, y, { width: W - 130, align: 'right' }); doc.text(v, 42 + W - 124, y, { width: 124, align: 'right' }); doc.y = y + (strong ? 15 : 13); } }
      if (s.note) { ensure(20); doc.y += 3; doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#555555').text(s.note, 42, doc.y, { width: W }); }
      // Evidencias fotográficas (copias incrustadas; el original permanece intacto en el expediente).
      let x = 42; let rowH = 0;
      for (const im of s.images) { const buf = images[im.id]; const w = (W - 12) / 2, h = 170; if (x + w > 42 + W + 1) { x = 42; doc.y += rowH + 26; rowH = 0; } ensure(h + 30); const y = doc.y;
        if (buf) { try { doc.image(buf, x, y, { fit: [w, h], align: 'center', valign: 'center' }); } catch { doc.rect(x, y, w, h).stroke('#bbbbbb'); doc.fontSize(8).fillColor('#666').text('Vista previa no disponible', x + 6, y + 6); } } else { doc.rect(x, y, w, h).stroke('#bbbbbb'); doc.font('Helvetica').fontSize(8).fillColor('#666666').text(im.isImage ? 'Imagen no disponible' : 'Documento adjunto (consultar en el expediente)', x + 6, y + 6, { width: w - 12 }); }
        doc.font('Helvetica').fontSize(7.5).fillColor('#333333').text([im.caption || im.name, im.location, im.takenAtDeclared ? `Toma declarada: ${fmtInstant(im.takenAtDeclared)}` : 'Fecha de toma no disponible'].filter(Boolean).join(' · '), x, y + h + 3, { width: w }); doc.y = y; rowH = h; x += w + 12; }
      if (s.images.length) doc.y += rowH + 26;
    }
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i); doc.page.margins.bottom = 0;
      if (watermark) { doc.save(); doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] }); doc.font('Helvetica-Bold').fontSize(86).fillColor('#000000').opacity(0.08).text(watermark, 0, doc.page.height / 2 - 50, { width: doc.page.width, align: 'center', lineBreak: false }); doc.restore(); doc.opacity(1); }
      doc.font('Helvetica').fontSize(7).fillColor('#666666').text(`${model.footer || 'Documento operativo de DCL Instalaciones. No es un comprobante fiscal ni una constancia de transferencia.'}`, 42, doc.page.height - 46, { width: W - 70, lineBreak: false });
      doc.text(`Página ${i - range.start + 1} de ${range.count}`, 42, doc.page.height - 46, { width: W, align: 'right', lineBreak: false });
    }
    doc.end();
  });
}
