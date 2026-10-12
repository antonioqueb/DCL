// Zona de importación: carga, identificación, simulación sin escritura, confirmación idempotente,
// conciliación entre archivos y reversión. Los originales no se modifican: se guardan como evidencia con su hash.
import * as d from '../domain/decimal.js';
import { listResult } from '../core/http.js';
import { sha256 } from '../core/store.js';
import { parseCsv } from '../core/csv.js';
import { invalid, notFound, blocked } from '../core/errors.js';
import { normalizeName as N } from '../domain/schema.js';
import { readWorkbook } from '../importers/xlsx.js';
import { PROFILES, FIELD_SOURCES, identify, parse } from '../importers/profiles.js';
import { setting, label, pick, req, requireReason } from './common.js';
import { saveAttachment } from './attachments.js';

const cache = new Map(); // análisis en memoria por lote (se recalcula desde el original si falta)
const ST = { cargado: 'Cargado', simulado: 'Simulado (sin escritura)', confirmado: 'Confirmado', revertido: 'Revertido' };
const hashData = (x) => sha256(JSON.stringify(x));

async function analysis(c, batch) {
  if (cache.has(batch.id)) return cache.get(batch.id);
  const att = c.db.get('attachments', batch.attachmentId); const buf = c.store.readBlob(att.sha256);
  let out;
  if (batch.profile === 'csv_maestros') out = parseMasters(buf.toString('utf8'), batch);
  else { const sheets = await readWorkbook(buf); out = { ...parse(batch.profile, sheets, batch.fileName), sheets: sheets.map((s) => ({ name: s.name, hidden: s.hidden, rows: s.rows, cols: s.cols })) }; }
  cache.set(batch.id, out); if (cache.size > 3) cache.delete(cache.keys().next().value);
  return out;
}
// CSV de maestros (personas/empresas): encabezados nombre, razon_social, cliente, proveedor, contratista, alias.
function parseMasters(text, batch) {
  const rows = parseCsv(text).map((r) => r.map((x) => x.v.trim())); const head = (rows[0] || []).map(N); const idx = (n) => head.indexOf(n); const records = [], issues = [];
  if (idx('nombre') < 0) issues.push({ kind: 'otro', fileName: batch.fileName, sheet: null, cell: 'A1', detail: 'El CSV de maestros requiere la columna "nombre".', dedupeKey: `${batch.fileName}|encabezado` });
  else rows.slice(1).forEach((r, i) => { const name = r[idx('nombre')]; if (!name) { if (r.some(Boolean)) issues.push({ kind: 'nombre', fileName: batch.fileName, sheet: null, cell: `A${i + 2}`, detail: 'Fila sin nombre: se rechaza.', dedupeKey: `${batch.fileName}|${i}` }); return; } const yes = (k) => /^(si|sí|x|1|true)$/i.test(r[idx(k)] || '');
    records.push({ kind: 'maestro_persona', sheet: null, row: i + 2, cell: `A${i + 2}`, naturalKey: `maestro_persona|${N(name)}`, data: { name, legalName: idx('razon social') >= 0 ? r[idx('razon social')] || null : null, isClient: yes('cliente'), isSupplier: yes('proveedor'), isContractor: yes('contratista'), alias: idx('alias') >= 0 ? r[idx('alias')] || null : null } }); });
  return { records, issues, excluded: [], sheetTotals: [], sheets: [] };
}
// Simulación: altas, coincidencias, cambios y rechazos frente a lo ya confirmado. No escribe registros.
function simulate(db, batch, a) {
  const prior = new Map(); for (const b of db.all('importBatches')) if (b.status === 'confirmado' && b.profile === batch.profile && b.id !== batch.id) for (const r of db.by('sourceRecords', 'batchId', b.id)) prior.set(r.naturalKey, r);
  const own = new Map(db.by('sourceRecords', 'batchId', batch.id).map((r) => [r.naturalKey, r]));
  const counts = { altas: 0, coincidencias: 0, cambios: 0, rechazos: a.issues.filter((i) => ['cantidad', 'nombre'].includes(i.kind) && /se rechaza|sin importe/.test(i.detail)).length, excluidos: a.excluded.length, yaImportados: 0 }; const byKind = {};
  for (const r of a.records) { const k = (byKind[r.kind] = byKind[r.kind] || { altas: 0, coincidencias: 0, cambios: 0 }); if (own.has(r.naturalKey)) { counts.yaImportados++; continue; } const p = prior.get(r.naturalKey); const t = !p ? 'altas' : hashData(p.data) === hashData(r.data) ? 'coincidencias' : 'cambios'; counts[t]++; k[t]++; }
  const issues = {}; for (const i of a.issues) issues[i.kind] = (issues[i.kind] || 0) + 1;
  const totals = a.sheetTotals; const withDiff = totals.filter((t) => !d.isZero(t.diff));
  return { counts, byKind, issues, issueSamples: a.issues.slice(0, 200), totals: { checked: totals.length, withDifference: withDiff.length, differences: withDiff.slice(0, 100) }, sheets: a.sheets, hiddenSheets: a.sheets.filter((s) => s.hidden).map((s) => s.name), excludedSamples: a.excluded.slice(0, 30), simulatedAt: new Date().toISOString() };
}

const workAliases = (db) => setting(db, 'import.workAliases', {}) || {};
const canonWork = (db, name) => { const n = N(name); const al = workAliases(db); return N(al[n] || n); };
// Coincidencias entre archivos: el mismo hecho en estimaciones, pagos y flujos se vincula; no se importa tres veces.
function crossMatch(tx, includeBatchId = null) {
  const groups = { estimaciones: new Map(), pagos: new Map(), flujos: new Map() }; const put = (m, k, amount, ref) => { const g = m.get(k) || { amount: '0.00', refs: 0, sample: ref }; g.amount = d.add(g.amount, amount); g.refs++; m.set(k, g); };
  const confirmed = tx.all('importBatches').filter((b) => b.status === 'confirmado' || b.id === includeBatchId); const ingresos = [], flu = [];
  for (const b of confirmed) for (const r of tx.by('sourceRecords', 'batchId', b.id)) { const x = r.data;
    if (r.kind === 'avance_semanal' && x.amount && x.year) put(groups.estimaciones, `${canonWork(tx, x.work)}|${x.year}|${x.week}`, x.amount, r);
    else if (r.kind === 'partida_pago' && x.amount) put(groups.pagos, `${canonWork(tx, x.work)}|${x.year}|${x.week}`, x.amount, r);
    else if (r.kind === 'asignacion_obra') { flu.push(r); const m = /^(\d+)\s*-/.exec(x.detail || ''); if (N(x.category) === 'mano de obra' && m) put(groups.flujos, `${canonWork(tx, x.work)}|${x.date.slice(0, 4)}|${Number(m[1])}`, d.abs(x.amount), r); }
    else if (r.kind === 'ingreso') ingresos.push(r); }
  const have = new Set(tx.all('matchProposals').map((p) => `${p.aType}|${p.aId}|${p.bType}|${p.bId}`)); const issueKeys = new Set(tx.all('qualityIssues').map((q) => q.dedupeKey)); let proposals = 0, diffs = 0;
  const propose = (aType, aId, bType, bId, basis, amount) => { const k = `${aType}|${aId}|${bType}|${bId}`; if (have.has(k)) return; have.add(k); tx.insert('matchProposals', { aType, aId, bType, bId, basis, amount, status: 'pendiente' }); proposals++; };
  const issue = (kind, detail, key) => { if (issueKeys.has(key)) return; issueKeys.add(key); tx.insert('qualityIssues', { kind, detail, status: 'abierta', dedupeKey: key, fileName: 'Conciliación entre archivos' }); diffs++; };
  const pairs = [['estimaciones', 'pagos', 'Estimaciones', 'Pagos semanales'], ['estimaciones', 'flujos', 'Estimaciones', 'Flujos'], ['pagos', 'flujos', 'Pagos semanales', 'Flujos']];
  for (const [a, b, la, lb] of pairs) for (const [k, ga] of groups[a]) { const gb = groups[b].get(k); if (!gb) continue; const [w, y, wk] = k.split('|');
    // No basta que coincidan los importes: también deben coincidir obra y semana.
    if (d.eq(ga.amount, gb.amount)) propose(`grupo_${a}`, k, `grupo_${b}`, k, `Misma obra (${ga.sample.data.work}), semana ${wk} de ${y} e importe en ${la} y ${lb}. Es un solo hecho económico: vincular, no sumar.`, ga.amount);
    else issue('diferencia_importe', `${ga.sample.data.work}, semana ${wk}/${y}: ${la} suma ${d.fmtMoney(ga.amount)} y ${lb} ${d.fmtMoney(gb.amount)} (diferencia ${d.fmtMoney(d.sub(ga.amount, gb.amount))}). Revisar antes de vincular.`, `cruce|${a}|${b}|${k}`); }
  // Comisiones y anticipos: se conservan bruto, comisión y neto por separado y la diferencia con su resolución.
  for (const f of flu) { const x = f.data; const w = canonWork(tx, x.work);
    if (N(x.category) === 'comision' && x.detail) { const ing = ingresos.find((i) => canonWork(tx, i.data.work) === w && N(i.data.concept) === `comision ${N(x.detail)}`); if (!ing) continue; const A = d.abs(x.amount), B = d.abs(ing.data.amount);
      if (d.eq(A, B)) propose('registro_flujos', f.id, 'registro_ingresos', ing.id, `Comisión ${x.detail} de ${x.work} con el mismo importe en Flujos e Ingresos.`, A);
      else issue('diferencia_importe', `Comisión ${x.detail} de ${x.work}: ${d.fmtMoney(B)} en Ingresos (${ing.sheet}!${ing.cell}${ing.data.amountFormula ? `, fórmula ${ing.data.amountFormula}` : ''}) frente a ${d.fmtMoney(A)} en Flujos (${f.sheet}!${f.cell}). Diferencia de ${d.fmtMoney(d.abs(d.sub(A, B)))}: se conserva y se resuelve aquí; no se ajusta en silencio.`, `comision|${w}|${N(x.detail)}`); }
    if (N(x.category) === 'anticipo' && d.isPos(x.amount)) { const com = flu.find((o) => canonWork(tx, o.data.work) === w && N(o.data.category) === 'comision' && !o.data.detail && d.isNeg(o.data.amount) && o.data.date >= x.date && o.row - f.row <= 3 && o.row > f.row); const ing = ingresos.find((i) => canonWork(tx, i.data.work) === w && N(i.data.concept) === 'anticipo');
      if (com && ing && d.eq(d.add(x.amount, com.data.amount), ing.data.amount)) issue('otro', `Anticipo de ${x.work}: bruto ${d.fmtMoney(x.amount)} (Flujos), comisión ${d.fmtMoney(d.abs(com.data.amount))} y neto ${d.fmtMoney(ing.data.amount)} (Ingresos). Los tres conceptos se conservan por separado; la naturaleza de la comisión debe validarse y la diferencia no es un cobro faltante.`, `anticipo|${w}|${x.date}`); } }
  return { proposals, differences: diffs };
}

export function register(app) {
  const guard = (c) => { if (c.acc.audience !== 'interno' || !c.acc.can('import.manage')) throw notFound(); };
  const row = (db, b) => ({ ...pick(b, ['id', 'recordVersion', 'profile', 'fileName', 'sha256', 'status', 'strategy', 'confirmedAt', 'revertedAt', 'createdAt']), profileTitle: PROFILES[b.profile]?.title || 'CSV de maestros', uploadedBy: label(db, 'users', b.uploadedBy), records: db.by('sourceRecords', 'batchId', b.id).length });
  app.get('/api/imports', (c) => { guard(c); return { items: c.db.all('importBatches').map((b) => row(c.db, b)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), profiles: Object.entries(PROFILES).map(([code, p]) => ({ code, title: p.title, example: p.example })), fieldSources: FIELD_SOURCES, strategy: setting(c.db, 'startup.strategy', 'no_definida'), openingDate: setting(c.db, 'startup.openingDate', null), workAliases: workAliases(c.db),
    opening: c.db.all('accounts').filter((a) => !a.archivedAt).map((a) => { const ms = c.db.by('cashMovements', 'accountId', a.id); const before = ms.filter((m) => m.opDate < a.openingDate).length; return { account: a.name, openingDate: a.openingDate, openingBalance: a.openingBalance, movements: ms.length, movementsBeforeOpening: before, ok: !before }; }) }; });
  // Carga: identifica el tipo de archivo y guarda el original intacto. El mismo archivo no crea otro lote.
  app.post('/api/imports', async (c) => {
    guard(c); const name = c.query.name; if (!name) throw invalid('Falta el nombre del archivo.', 'name'); const hash = sha256(c.body);
    const prev = c.db.by('importBatches', 'sha256', hash).find((b) => b.status !== 'revertido'); if (prev) return { id: prev.id, already: true, message: 'Este archivo ya fue cargado; se abre el lote existente.' };
    let profile, ident;
    if (/\.csv$/i.test(name)) { profile = 'csv_maestros'; ident = { sheets: [] }; }
    else { let sheets; try { sheets = await readWorkbook(c.body); } catch { throw invalid('El archivo no pudo leerse como libro de Excel (.xlsx).', 'file'); } profile = identify(sheets); ident = { sheets: sheets.map((s) => ({ name: s.name, hidden: s.hidden, rows: s.rows, cols: s.cols })) };
      if (!profile) throw invalid('No se reconoce el tipo de archivo. Perfiles disponibles: ' + Object.values(PROFILES).map((p) => p.title).join('; ') + '.', 'file', 'Verifique que sea uno de los libros conocidos o solicite un perfil nuevo.'); }
    const id = c.tx('carga_importacion', (tx) => { const att = saveAttachment(tx, c.store, c.user, c.body, { name, kind: 'importacion', confidentiality: 'interno' }); return tx.insert('importBatches', { profile, fileName: name, sha256: hash, attachmentId: att.id, uploadedBy: c.user.id, status: 'cargado', summary: { identification: ident } }).id; });
    return { id, profile, profileTitle: PROFILES[profile]?.title || 'CSV de maestros', sheets: ident.sheets.length, hiddenSheets: ident.sheets.filter((s) => s.hidden).map((s) => s.name) };
  }, { raw: true });
  app.get('/api/imports/:id', (c) => { guard(c); const b = c.db.get('importBatches', c.params.id); if (!b) throw notFound('El lote'); const recs = c.db.by('sourceRecords', 'batchId', b.id); const kinds = {}; for (const r of recs) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
    return { ...row(c.db, b), summary: b.summary, kinds, issuesOpen: c.db.by('qualityIssues', 'batchId', b.id).filter((q) => q.status === 'abierta').length }; });
  app.post('/api/imports/:id/simulate', async (c) => { guard(c); const b = c.db.get('importBatches', c.params.id); if (!b) throw notFound('El lote'); if (b.status === 'revertido') throw blocked('El lote fue revertido; cargue el archivo de nuevo.');
    const sim = simulate(c.db, b, await analysis(c, b));
    c.tx('simulacion_importacion', (tx) => tx.update('importBatches', b.id, { status: b.status === 'confirmado' ? 'confirmado' : 'simulado', summary: { ...b.summary, simulation: sim } })); return sim; });
  app.get('/api/imports/:id/records', async (c) => { guard(c); const b = c.db.get('importBatches', c.params.id); if (!b) throw notFound(); const stored = c.db.by('sourceRecords', 'batchId', b.id);
    const rows = (stored.length ? stored : (await analysis(c, b)).records).filter((r) => !c.query.kind || r.kind === c.query.kind).map((r) => ({ kind: r.kind, sheet: r.sheet, cell: r.cell, status: r.status || 'simulado', summary: Object.entries(r.data).filter(([, v]) => v !== null && typeof v !== 'object').map(([k, v]) => `${k}: ${v}`).join(' · ').slice(0, 300) }));
    return listResult(c, rows, [{ key: 'kind', label: 'Tipo de registro' }, { key: 'sheet', label: 'Hoja' }, { key: 'cell', label: 'Celda' }, { key: 'status', label: 'Estado' }, { key: 'summary', label: 'Contenido normalizado' }], { name: 'registros-de-origen' }); });
  // Confirmación idempotente: reimportar el mismo lote no duplica registros ni saldos.
  app.post('/api/imports/:id/confirm', async (c) => {
    guard(c); const b = c.db.get('importBatches', c.params.id); if (!b) throw notFound('El lote'); if (b.status === 'confirmado') return { id: b.id, already: true, written: 0 }; if (b.status !== 'simulado') throw blocked('Ejecute primero la simulación y revise sus conteos.');
    const strategy = c.body.strategy || setting(c.db, 'startup.strategy', 'no_definida');
    if (!['historico', 'saldos_iniciales', 'solo_evidencia'].includes(strategy)) throw blocked('Falta elegir la estrategia de arranque.', [], 'Elija: histórico completo, saldos iniciales a una fecha más movimientos posteriores, o conservar el lote solo como evidencia conciliable.');
    const a = await analysis(c, b); const masters = new Set(c.body.masters || []);
    return c.tx('confirmacion_importacion', (tx) => {
      const prior = new Map(); for (const o of tx.all('importBatches')) if (o.status === 'confirmado' && o.profile === b.profile) for (const r of tx.by('sourceRecords', 'batchId', o.id)) prior.set(r.naturalKey, r);
      let written = 0, matched = 0, changed = 0;
      for (const r of a.records) { const p = prior.get(r.naturalKey); if (p && hashData(p.data) === hashData(r.data)) { matched++; continue; } if (p) changed++;
        tx.insert('sourceRecords', { batchId: b.id, sheet: r.sheet, row: r.row, cell: r.cell, kind: r.kind, naturalKey: r.naturalKey, data: r.data, status: p ? 'cambio' : 'importado', note: p ? `Difiere de lo importado antes (${p.sheet || ''} ${p.cell || ''}); ambos se conservan para revisión.` : null }); written++; }
      const keys = new Set(tx.all('qualityIssues').map((q) => q.dedupeKey));
      for (const i of a.issues) { if (keys.has(i.dedupeKey)) continue; keys.add(i.dedupeKey); tx.insert('qualityIssues', { batchId: b.id, fileName: i.fileName, sheet: i.sheet, cell: i.cell, kind: i.kind, detail: i.detail, status: 'abierta', dedupeKey: i.dedupeKey }); }
      // Maestros opcionales: obras y personas/empresas; nunca se crean duplicados por mayúsculas, espacios o acentos.
      const created = { works: 0, parties: 0 };
      if (masters.has('works')) { const names = new Map(); for (const r of a.records) if (r.data.work) names.set(canonWork(tx, r.data.work), r.data.work); const existing = new Set(tx.all('works').map((w) => N(w.name))); let n = tx.count('works');
        for (const [k, name] of names) if (!existing.has(k)) { tx.insert('works', { code: `IMP-${String(++n).padStart(3, '0')}`, name: String(name).trim(), currency: 'MXN', status: 'planeacion', consolidation: 'pendiente_clasificar', consolidationNote: 'Obra creada por importación: clasificación y estado pendientes de validar.', sourceReference: `lote:${b.id}` }); existing.add(k); created.works++; } }
      if (masters.has('parties')) { const want = new Map(); const add = (name, flag) => { if (!name) return; const k = N(name); if (!k) return; const e = want.get(k) || { name: String(name).trim(), isClient: false, isSupplier: false, isContractor: false }; e[flag] = true; want.set(k, e); };
        for (const r of a.records) { add(r.data.client, 'isClient'); add(r.data.supplier, 'isSupplier'); add(r.data.contractor, 'isContractor'); if (r.kind === 'maestro_persona') { const k = N(r.data.name); want.set(k, { ...r.data, name: r.data.name }); } }
        let n = tx.count('parties');
        for (const [k, p] of want) { const ex = tx.by('parties', 'normalizedName', k)[0] || (tx.by('partyAliases', 'normalizedAlias', k)[0] && tx.get('parties', tx.by('partyAliases', 'normalizedAlias', k)[0].partyId)); if (ex) { const patch = {}; for (const f of ['isClient', 'isSupplier', 'isContractor']) if (p[f] && !ex[f]) patch[f] = true; if (Object.keys(patch).length) tx.update('parties', ex.id, patch); continue; }
          let code; do { code = `P${String(++n).padStart(3, '0')}`; } while (tx.by('parties', 'code', code).length);
          const rec = tx.insert('parties', { code, name: p.name, legalName: p.legalName || null, normalizedName: k, isClient: !!p.isClient, isSupplier: !!p.isSupplier, isContractor: !!p.isContractor, status: 'activo', sourceReference: `lote:${b.id}` }); created.parties++;
          if (p.alias && !tx.by('partyAliases', 'normalizedAlias', N(p.alias)).length) tx.insert('partyAliases', { partyId: rec.id, alias: p.alias, normalizedAlias: N(p.alias) }); } }
      const cross = crossMatch(tx, b.id);
      tx.update('importBatches', b.id, { status: 'confirmado', strategy, confirmedAt: tx.now, summary: { ...b.summary, confirmation: { written, matched, changed, created, cross, note: strategy === 'solo_evidencia' ? 'Los registros quedan como origen conciliable; no generan saldos ni movimientos.' : 'Los registros normalizados quedan disponibles; su conversión en saldos o movimientos requiere la conciliación de apertura.' } } });
      tx.event('importacion_confirmada', { collection: 'importBatches', objectId: b.id, detail: { written, matched, changed, created, cross, strategy } });
      return { id: b.id, written, matched, changed, created, cross };
    });
  });
  // Reversión: solo si nada posterior depende del lote; en otro caso se generan correcciones trazables.
  app.post('/api/imports/:id/revert', (c) => c.tx('reversion_importacion', (tx) => {
    guard(c); const b = tx.must('importBatches', c.params.id); if (b.status !== 'confirmado') throw blocked('Solo se revierte un lote confirmado.'); const reason = requireReason(c.body, 'la reversión');
    const ref = `lote:${b.id}`; const deps = [];
    for (const w of tx.all('works')) if (w.sourceReference === ref && (w.recordVersion > 1 || tx.by('progressEntries', 'workId', w.id).length || tx.by('locations', 'workId', w.id).length || tx.by('budgets', 'workId', w.id).length || tx.by('workAssignments', 'workId', w.id).length)) deps.push(`La obra ${w.name} ya tiene cambios o movimientos.`);
    for (const p of tx.all('parties')) if (p.sourceReference === ref && (p.recordVersion > 1 || tx.by('works', 'clientId', p.id).length || tx.by('obligations', 'beneficiaryId', p.id).length || tx.by('expenses', 'supplierId', p.id).length)) deps.push(`${p.name} ya se usa en otros registros.`);
    const used = tx.all('matchProposals').filter((m) => m.status === 'aceptada' && tx.by('sourceRecords', 'batchId', b.id).some((r) => r.id === m.aId || r.id === m.bId)).length; if (used) deps.push(`${used} coincidencia(s) aceptada(s) dependen de este lote.`);
    if (deps.length) throw blocked('El lote tiene movimientos posteriores y no puede revertirse por completo.', deps.slice(0, 20), 'Corrija los registros afectados con ajustes trazables; el lote se conserva.');
    for (const r of tx.by('sourceRecords', 'batchId', b.id)) tx.remove('sourceRecords', r.id);
    for (const w of tx.all('works')) if (w.sourceReference === ref) tx.archive('works', w.id); for (const p of tx.all('parties')) if (p.sourceReference === ref) tx.archive('parties', p.id);
    for (const q of tx.by('qualityIssues', 'batchId', b.id)) if (q.status === 'abierta') tx.update('qualityIssues', q.id, { status: 'descartada', resolution: `Lote revertido: ${reason}` });
    tx.update('importBatches', b.id, { status: 'revertido', revertedAt: tx.now }); cache.delete(b.id); return { ok: true };
  }));
  app.put('/api/imports/work-aliases', (c) => c.tx('alias_obras', (tx) => { guard(c); const map = {}; for (const [k, v] of Object.entries(c.body.aliases || {})) if (N(k) && N(v)) map[N(k)] = v; const s = tx.by('settings', 'key', 'import.workAliases')[0]; if (s) tx.update('settings', s.id, { value: { v: map } }); else tx.insert('settings', { key: 'import.workAliases', value: { v: map }, description: 'Nombres alternos de obras en los archivos históricos.', requiresDecision: false }); return { ok: true }; }));
  app.post('/api/imports/cross-match', (c) => c.tx('conciliacion_entre_archivos', (tx) => { guard(c); return crossMatch(tx); }));

  // ── Cola de incidencias de calidad y coincidencias propuestas ──
  const QK = { error_formula: 'Error de fórmula', fecha_ambigua: 'Fecha ambigua', fecha_conflicto: 'Fechas en conflicto', unidad: 'Unidad', categoria: 'Categoría', nombre: 'Nombre', tarifa: 'Tarifa', cantidad: 'Cantidad o importe', saldo: 'Saldo', subtotal: 'Subtotal que no concilia', diferencia_medicion: 'Diferencia de medición', diferencia_importe: 'Diferencia de importe', hoja_oculta: 'Hoja oculta', otro: 'Otro' };
  app.get('/api/quality-issues', (c) => { guard(c); return listResult(c, c.db.all('qualityIssues').map((q) => ({ ...pick(q, ['id', 'recordVersion', 'kind', 'fileName', 'sheet', 'cell', 'detail', 'status', 'resolution', 'batchId']), responsible: label(c.db, 'users', q.responsibleId), where: [q.fileName, q.sheet, q.cell].filter(Boolean).join(' · ') })),
    [{ key: 'kind', label: 'Incidencia', type: 'status', values: QK }, { key: 'where', label: 'Origen (archivo, hoja, celda)' }, { key: 'detail', label: 'Detalle' }, { key: 'responsible', label: 'Responsable' }, { key: 'status', label: 'Estado', type: 'status', values: { abierta: 'Abierta', resuelta: 'Resuelta', descartada: 'Descartada' } }, { key: 'resolution', label: 'Resolución' }], { defaultSort: 'kind', name: 'incidencias-de-calidad' }); });
  app.post('/api/quality-issues/:id', (c) => c.tx('resolucion_incidencia', (tx) => { guard(c); const q = tx.must('qualityIssues', c.params.id); const patch = {}; if (c.body.responsibleId !== undefined) patch.responsibleId = c.body.responsibleId || null;
    if (c.body.status) { if (c.body.status !== 'abierta' && !(c.body.resolution && c.body.resolution.trim().length >= 5)) throw invalid('Describa cómo se resolvió o por qué se descarta.', 'resolution'); patch.status = c.body.status; patch.resolution = c.body.resolution || null; } tx.update('qualityIssues', q.id, patch, { expectedVersion: c.body.recordVersion }); return { ok: true }; }));
  app.get('/api/match-proposals', (c) => { guard(c); return listResult(c, c.db.all('matchProposals').map((m) => ({ ...pick(m, ['id', 'aType', 'aId', 'bType', 'bId', 'basis', 'amount', 'status', 'note']), sides: `${m.aType.replace(/_/g, ' ')} ↔ ${m.bType.replace(/_/g, ' ')}`, decidedBy: label(c.db, 'users', m.decidedBy) })),
    [{ key: 'sides', label: 'Fuentes' }, { key: 'basis', label: 'Por qué se propone' }, { key: 'amount', label: 'Importe', type: 'money' }, { key: 'status', label: 'Estado', type: 'status', values: { pendiente: 'Pendiente de revisión', aceptada: 'Aceptada (un solo hecho)', rechazada: 'Rechazada (hechos distintos)' } }, { key: 'decidedBy', label: 'Decidió' }], { defaultSort: 'status', name: 'coincidencias' }); });
  app.post('/api/match-proposals/:id', (c) => c.tx('decision_coincidencia', (tx) => { guard(c); const m = tx.must('matchProposals', c.params.id); if (!['aceptada', 'rechazada', 'pendiente'].includes(c.body.status)) throw invalid('Decisión no válida.', 'status'); tx.update('matchProposals', m.id, { status: c.body.status, decidedBy: c.user.id, note: c.body.note || null }); return { ok: true }; }));
}
export { ST, req };
