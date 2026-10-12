// Captura de avance, generadores de medición, validación y ajustes.
import * as d from '../domain/decimal.js';
import { localDate } from '../domain/dates.js';
import { listResult } from '../core/http.js';
import { invalid, forbidden, notFound, blocked } from '../core/errors.js';
import { setting, label, periodFor, locationPath, effectiveQty, allocatedQty, validatedCumulative, notify, resolveNotifications, req, requireReason, inWorkScope } from './common.js';

export const STATUS = { borrador: 'Borrador', reportado: 'Reportado', validado: 'Validado', rechazado: 'Rechazado' };

// Fórmula visible del generador según el tipo de unidad. Conserva dimensiones y resultado.
export function computeLine(unitKind, l) {
  const n = (v, def) => (v === undefined || v === null || v === '' ? def : d.norm(v, 4));
  const length = n(l.length, null), width = n(l.width, null), height = n(l.height, null), pieces = n(l.pieces, '1.0000'), deduction = n(l.deduction, '0.0000');
  for (const [k, v] of Object.entries({ largo: length, ancho: width, alto: height, piezas: pieces, deducciones: deduction })) if (v !== null && d.isNeg(v)) throw invalid(`El generador no admite ${k} negativo.`, 'generator', 'Use un ajuste autorizado para corregir una medición.');
  let result, formula;
  if (unitKind === 'area') {
    const second = width ?? height;
    if (length === null || second === null) throw invalid('Para superficie capture largo y ancho (o alto).', 'generator');
    result = d.sub(d.mul(d.mul(length, second, 4), pieces, 4), deduction, 4);
    formula = `largo × ${width !== null ? 'ancho' : 'alto'} × piezas − deducciones`;
  } else if (unitKind === 'longitud') {
    if (length === null) throw invalid('Para metros lineales capture la longitud.', 'generator');
    result = d.sub(d.mul(length, pieces, 4), deduction, 4); formula = 'longitud × piezas − deducciones';
  } else { result = d.sub(pieces, deduction, 4); formula = 'piezas − deducciones'; }
  if (d.isNeg(result)) throw invalid('Las deducciones superan la medición del renglón.', 'generator');
  return { label: l.label || null, length, width, height, pieces, deduction, result, formula };
}

export function budgetContext(db, e) {
  const item = e.budgetItemId ? db.get('budgetItems', e.budgetItemId) : null;
  const prev = validatedCumulative(db, e, e.id);
  const proposed = e.qty;
  const resulting = d.add(prev, proposed, 4);
  return {
    budgetQty: item ? item.qty : null, budgetStatus: item ? item.status : null,
    previousValidated: prev, proposed, resulting,
    difference: item ? d.sub(item.qty, resulting, 4) : null,
    overBudget: item ? d.gt(resulting, item.qty) : false,
  };
}

function prepare(tx, acc, input, existing) {
  const work = tx.must('works', input.workId, 'La obra');
  // Captura quien tiene la obra asignada; quien revisa puede corregir una captura existente.
  if (!(existing && acc.can('progress.validate', work.id))) acc.require('progress.capture', work.id, 'capturar avances');
  if (!['planeacion', 'activa', 'cierre_operativo'].includes(work.status)) throw blocked(`La obra está en estado "${work.status}" y no admite nuevas capturas.`, [], 'Solicite a dirección reactivar la obra.');
  const loc = tx.must('locations', input.locationId, 'La ubicación');
  if (loc.workId !== work.id) throw invalid('La ubicación no pertenece a la obra seleccionada.', 'locationId', 'Elija una ubicación de esta obra.');
  const concept = tx.must('concepts', input.conceptId, 'El concepto');
  if (concept.catalog !== 'contratacion') throw invalid('La ejecución se captura con conceptos del catálogo de contratación.', 'conceptId');
  const unitId = input.unitId || concept.unitId;
  if (unitId !== concept.unitId) throw invalid('La unidad no coincide con la del concepto. No se convierten unidades automáticamente.', 'unitId', 'Use la unidad del concepto o registre una regla de conversión validada.');
  const unit = tx.must('units', unitId);
  const today = localDate();
  if (!input.executionDate || input.executionDate > today) throw invalid('La fecha real de ejecución no puede ser futura.', 'executionDate');
  if (input.contractorId) { const p = tx.must('parties', input.contractorId, 'El contratista'); if (!p.isContractor) throw invalid('La persona seleccionada no está registrada como contratista.', 'contractorId'); }
  if (input.budgetItemId) { const bi = tx.must('budgetItems', input.budgetItemId, 'La partida de presupuesto'); if (bi.workId !== work.id) throw invalid('La partida de presupuesto pertenece a otra obra.', 'budgetItemId'); if (bi.unitId !== unitId) throw invalid('La partida de presupuesto usa otra unidad; no se relacionan cantidades incompatibles.', 'budgetItemId'); }
  const mode = input.mode || 'periodo';
  const lines = (input.generator || []).map((l) => computeLine(unit.kind, l));
  let measured = lines.length ? d.sum(lines.map((l) => l.result), 4) : input.qty;
  if (measured === undefined || measured === null || measured === '') throw invalid('Capture la cantidad o al menos un renglón de generador.', 'qty');
  measured = d.norm(measured, 4);
  if (d.isNeg(measured)) throw invalid('Una captura ordinaria no admite cantidades negativas.', 'qty', 'Registre un ajuste vinculado al avance original, con motivo y autorización.');
  const workType = input.workType || 'ordinario';
  const draft = { workId: work.id, locationId: loc.id, conceptId: concept.id, unitId, budgetItemId: input.budgetItemId || null, workType, id: existing?.id };
  let qty = measured, cumulativeMeasured = null, baseCumulative = null;
  if (mode === 'acumulado') {
    baseCumulative = validatedCumulative(tx, draft, existing?.id);
    cumulativeMeasured = measured; qty = d.sub(measured, baseCumulative, 4);
    if (d.isNeg(qty)) throw invalid(`La medición acumulada (${d.fmtQty(measured)}) es menor al acumulado validado comparable (${d.fmtQty(baseCumulative)}).`, 'qty', 'Si la medición anterior fue incorrecta, registre un ajuste sobre ella.');
  }
  if (d.isZero(qty)) throw invalid('La cantidad del periodo es cero; no hay avance que registrar.', 'qty');
  if (workType === 'retrabajo' && !input.reworkKind) throw invalid('Indique si el retrabajo corrige un error de instalación, un cambio solicitado o es trabajo adicional.', 'reworkKind');
  const period = input.periodId ? tx.must('weekPeriods', input.periodId) : periodFor(tx, input.executionDate);
  if (period.status === 'cerrada') throw blocked(`La semana ${period.code} ya está cerrada.`, [], 'Capture en la semana abierta conservando la fecha real de ejecución; entrará como complemento o en el siguiente corte.');
  const evidenceRequired = concept.evidencePolicy === 'requerida' || !!concept.hiddenWork || workType === 'adicional';
  return {
    lines,
    data: { ...draft, id: undefined, contractorId: input.contractorId || null, crewId: input.crewId || null, executionDate: input.executionDate, periodId: period.id, mode, qty, cumulativeMeasured, baseCumulative, description: input.description || null, notes: input.notes || null, internalNotes: input.internalNotes || null, reworkKind: workType === 'retrabajo' ? input.reworkKind : null, additionalId: input.additionalId || null, evidenceRequired, device: input.device || null },
  };
}

function findDuplicates(tx, e, exceptId) {
  return tx.by('progressEntries', 'locationId', e.locationId).filter((o) => o.id !== exceptId && o.status !== 'rechazado' && o.conceptId === e.conceptId && o.contractorId === e.contractorId && o.executionDate === e.executionDate && d.eq(o.qty, e.qty) && o.duplicateFlag !== 'descartado');
}

export function createEntry(tx, acc, input) {
  req(input, ['workId', 'locationId', 'conceptId', 'executionDate']);
  const { lines, data } = prepare(tx, acc, input, null);
  delete data.id;
  const dups = findDuplicates(tx, data, null);
  const ctxB = budgetContext(tx, data);
  const e = tx.insert('progressEntries', { ...data, captureId: input.captureId || null, status: input.submit ? 'reportado' : 'borrador', authorId: acc.user.id, duplicateFlag: dups.length ? 'posible' : 'ninguno', overBudget: ctxB.overBudget, capturedAt: tx.now });
  lines.forEach((l, i) => tx.insert('generatorLines', { ...l, entryId: e.id, sortOrder: i }));
  if (input.submit) notify(tx, { permission: 'progress.validate', workId: e.workId, event: 'avance_por_validar', objectType: 'progressEntry', objectId: e.id, title: `Avance por validar en ${label(tx, 'works', e.workId)}` });
  const warnings = [];
  if (dups.length) warnings.push({ type: 'posible_duplicado', message: 'Existe un avance igual (misma ubicación, concepto, contratista, fecha y cantidad). Revise antes de continuar; no se eliminó nada.', entryIds: dups.map((x) => x.id) });
  if (ctxB.overBudget) warnings.push({ type: 'sobre_presupuesto', message: `El acumulado resultante (${d.fmtQty(ctxB.resulting)}) supera la cantidad presupuestada (${d.fmtQty(ctxB.budgetQty)}). El trabajo se conserva; su validación requiere aprobación y no modifica el contrato.` });
  return { id: e.id, warnings };
}

export function updateEntry(tx, acc, id, input, expectedVersion) {
  const cur = tx.must('progressEntries', id);
  if (cur.authorId !== acc.user.id && !acc.can('progress.validate', cur.workId)) throw forbidden('Solo quien capturó o quien revisa puede corregir este avance.');
  if (!['borrador', 'reportado', 'rechazado'].includes(cur.status)) throw blocked('Un avance validado no se edita.', [], 'Registre un ajuste vinculado, con motivo y autorización.');
  const merged = { ...cur, ...input, workId: cur.workId };
  if (input.generator === undefined) merged.generator = tx.by('generatorLines', 'entryId', id).sort((a, b) => a.sortOrder - b.sortOrder);
  if (cur.mode === 'acumulado' && input.qty === undefined && input.generator === undefined) merged.qty = cur.cumulativeMeasured;
  const { lines, data } = prepare(tx, acc, merged, cur);
  delete data.id;
  const ctxB = budgetContext(tx, { ...data, id });
  const e = tx.update('progressEntries', id, { ...data, overBudget: ctxB.overBudget, status: cur.status === 'rechazado' ? 'borrador' : cur.status, duplicateFlag: findDuplicates(tx, data, id).length ? 'posible' : cur.duplicateFlag === 'descartado' ? 'descartado' : 'ninguno' }, { expectedVersion });
  if (input.generator !== undefined) { for (const l of tx.by('generatorLines', 'entryId', id)) tx.remove('generatorLines', l.id); lines.forEach((l, i) => tx.insert('generatorLines', { ...l, entryId: id, sortOrder: i })); }
  return { id: e.id, recordVersion: e.recordVersion };
}

export const evidenceCount = (db, id) => db.by('evidenceLinks', 'objectId', id).filter((l) => l.objectType === 'progressEntry').length;

export function submitEntry(tx, acc, id) {
  const e = tx.must('progressEntries', id);
  if (e.authorId !== acc.user.id) acc.require('progress.validate', e.workId);
  if (e.status !== 'borrador') throw blocked('Solo un borrador puede enviarse a revisión.');
  tx.update('progressEntries', id, { status: 'reportado' });
  notify(tx, { permission: 'progress.validate', workId: e.workId, event: 'avance_por_validar', objectType: 'progressEntry', objectId: id, title: `Avance por validar en ${label(tx, 'works', e.workId)}` });
  return { id };
}

export function reviewEntry(tx, acc, id, { decision, reason, overBudgetNote }, expectedVersion) {
  const e = tx.must('progressEntries', id);
  acc.require('progress.validate', e.workId, 'validar avances');
  if (e.status !== 'reportado') throw blocked('Solo un avance reportado puede validarse o rechazarse.');
  if (decision === 'rechazar') {
    const r = requireReason({ reason }, 'el rechazo');
    tx.update('progressEntries', id, { status: 'rechazado', rejectedReason: r, lastReviewedAt: tx.now }, { expectedVersion });
    resolveNotifications(tx, 'progressEntry', id);
    const author = tx.get('users', e.authorId);
    if (author) notify(tx, { users: [author], workId: e.workId, event: 'avance_rechazado', objectType: 'progressEntry', objectId: id, title: `Avance rechazado: ${r}`, priority: 'alta' });
    return { id, status: 'rechazado' };
  }
  if (e.authorId === acc.user.id && !setting(tx, 'policy.selfValidation', false)) throw forbidden('Quien captura un avance no puede validarlo. Pida la revisión a coordinación o dirección.');
  const reasons = [];
  if (e.evidenceRequired && !evidenceCount(tx, id) && !e.evidenceException) reasons.push('Falta la evidencia obligatoria de este concepto (o una excepción autorizada con motivo).');
  let patch = {};
  if (e.mode === 'acumulado') {
    const base = validatedCumulative(tx, e, id);
    const qty = d.sub(e.cumulativeMeasured, base, 4);
    if (!d.isPos(qty)) reasons.push(`El acumulado medido (${d.fmtQty(e.cumulativeMeasured)}) ya no supera el acumulado validado comparable (${d.fmtQty(base)}).`);
    else patch = { baseCumulative: base, qty };
  }
  const ctxB = budgetContext(tx, { ...e, ...patch });
  if (ctxB.overBudget) {
    if (!acc.can('progress.overbudget.approve', e.workId)) reasons.push('El acumulado supera el presupuesto: requiere aprobación de quien tenga esa facultad.');
    else if (!overBudgetNote || overBudgetNote.trim().length < 5) reasons.push('Indique el motivo para aceptar ejecución por encima del presupuesto.');
  }
  if (reasons.length) throw blocked('El avance no puede validarse todavía.', reasons);
  tx.update('progressEntries', id, { ...patch, status: 'validado', validatedBy: acc.user.id, validatedAt: tx.now, lastReviewedAt: tx.now, overBudget: ctxB.overBudget, overBudgetNote: ctxB.overBudget ? overBudgetNote.trim() : null }, { expectedVersion });
  tx.insert('approvals', { objectType: 'progressEntry', objectId: id, objectVersion: e.recordVersion + 1, decision: 'aprobado', actorId: acc.user.id, actorName: acc.user.name, onBehalfOfUserId: acc.delegatedBy('progress.validate'), at: tx.now, scope: ctxB.overBudget ? 'validación con ejecución sobre presupuesto' : 'validación de avance', valid: true, channel: 'sistema', note: overBudgetNote || null });
  resolveNotifications(tx, 'progressEntry', id);
  return { id, status: 'validado' };
}

export function evidenceException(tx, acc, id, body) {
  const e = tx.must('progressEntries', id);
  acc.require('evidence.exception.authorize', e.workId, 'autorizar excepciones de evidencia');
  const reason = requireReason(body, 'la excepción de evidencia');
  tx.update('progressEntries', id, { evidenceException: { reason, authorizedBy: acc.user.id, authorizedByName: acc.user.name, at: tx.now } });
  tx.event('excepcion_evidencia', { collection: 'progressEntries', objectId: id, reason });
  return { id };
}

// Ajustes (incluye negativos): nunca borran la medición original.
export function proposeAdjustment(tx, acc, entryId, body) {
  const e = tx.must('progressEntries', entryId);
  if (!acc.can('progress.capture', e.workId) && !acc.can('progress.validate', e.workId)) throw forbidden();
  if (e.status !== 'validado') throw blocked('Solo se ajustan avances validados; un borrador se corrige directamente.');
  const reason = requireReason(body, 'el ajuste');
  const delta = d.norm(req(body, ['qtyDelta']).qtyDelta, 4);
  if (d.isZero(delta)) throw invalid('El ajuste no puede ser cero.', 'qtyDelta');
  const a = tx.insert('progressAdjustments', { entryId, qtyDelta: delta, reasonId: body.reasonId || null, reason, status: 'propuesto', proposedBy: acc.user.id });
  notify(tx, { permission: 'progress.adjust.authorize', workId: e.workId, event: 'ajuste_por_autorizar', objectType: 'progressAdjustment', objectId: a.id, title: `Ajuste de avance por autorizar (${d.fmtQty(delta)})` });
  return { id: a.id };
}
export function checkAdjustable(tx, entry, delta, { skipCircuit } = {}) {
  const eff = d.add(effectiveQty(tx, entry), delta, 4);
  if (d.isNeg(eff)) throw blocked('El ajuste dejaría la medición en negativo.');
  for (const circuit of ['contratista', 'cliente']) {
    if (circuit === skipCircuit) continue;
    const used = allocatedQty(tx, entry.id, circuit);
    if (d.gt(used, eff)) throw blocked(`El ajuste dejaría la ejecución (${d.fmtQty(eff)}) por debajo de lo ya incluido en documentos de ${circuit === 'contratista' ? 'pago al contratista' : 'cobro al cliente'} (${d.fmtQty(used)}).`, [], 'Reabra o corrija primero el documento que incluye esa cantidad.');
  }
}
export function decideAdjustment(tx, acc, id, body) {
  const a = tx.must('progressAdjustments', id); const e = tx.must('progressEntries', a.entryId);
  acc.require('progress.adjust.authorize', e.workId, 'autorizar ajustes de avance');
  if (a.status !== 'propuesto') throw blocked('Este ajuste ya fue resuelto.');
  if (body.decision === 'autorizar') { checkAdjustable(tx, e, a.qtyDelta); tx.update('progressAdjustments', id, { status: 'autorizado', authorizedBy: acc.user.id, authorizedAt: tx.now }); }
  else tx.update('progressAdjustments', id, { status: 'rechazado', authorizedBy: acc.user.id, authorizedAt: tx.now });
  resolveNotifications(tx, 'progressAdjustment', id);
  return { id };
}

// ── Vistas ──
export function entryRow(db, e) {
  const unit = db.get('units', e.unitId);
  return {
    id: e.id, recordVersion: e.recordVersion, workId: e.workId, work: label(db, 'works', e.workId), locationId: e.locationId, location: locationPath(db, e.locationId), conceptId: e.conceptId, concept: label(db, 'concepts', e.conceptId),
    contractorId: e.contractorId, contractor: label(db, 'parties', e.contractorId), unit: unit?.code, executionDate: e.executionDate, period: label(db, 'weekPeriods', e.periodId, 'code'), periodId: e.periodId,
    mode: e.mode, qty: e.qty, effectiveQty: effectiveQty(db, e), status: e.status, workType: e.workType, author: label(db, 'users', e.authorId), authorId: e.authorId,
    evidence: evidenceCount(db, e.id), evidenceState: !e.evidenceRequired ? 'opcional' : evidenceCount(db, e.id) ? 'completa' : e.evidenceException ? 'excepcion' : 'faltante',
    duplicateFlag: e.duplicateFlag, overBudget: !!e.overBudget, description: e.description, capturedAt: e.capturedAt,
    paidQty: allocatedQty(db, e.id, 'contratista'), billedQty: allocatedQty(db, e.id, 'cliente'),
  };
}
export const COLUMNS = [
  { key: 'executionDate', label: 'Fecha de ejecución', type: 'date' }, { key: 'work', label: 'Obra' }, { key: 'location', label: 'Ubicación' }, { key: 'concept', label: 'Concepto' },
  { key: 'contractor', label: 'Contratista' }, { key: 'effectiveQty', label: 'Cantidad', type: 'qty' }, { key: 'unit', label: 'Unidad' }, { key: 'period', label: 'Semana' },
  { key: 'status', label: 'Estado', type: 'status', values: STATUS }, { key: 'evidenceState', label: 'Evidencia', type: 'status', values: { opcional: 'Opcional', completa: 'Completa', faltante: 'Faltante', excepcion: 'Excepción autorizada' } },
  { key: 'workType', label: 'Tipo', type: 'status', values: { ordinario: 'Ordinario', adicional: 'Adicional', retrabajo: 'Retrabajo' } }, { key: 'author', label: 'Capturó' },
];

export function register(app) {
  const internal = (c) => { if (c.acc.audience !== 'interno') throw notFound(); };
  app.get('/api/progress', (c) => {
    internal(c); const ok = inWorkScope(c.acc, 'progress.view');
    let rows = c.db.where('progressEntries', (e) => ok(e.workId) && !e.archivedAt);
    if (c.query.mine === '1') rows = rows.filter((e) => e.authorId === c.user.id);
    return listResult(c, rows.map((e) => entryRow(c.db, e)), COLUMNS, { defaultSort: '-executionDate', name: 'avances', dateField: 'executionDate' });
  });
  app.get('/api/progress/context', (c) => {
    internal(c); c.acc.require('progress.view', c.query.workId);
    const concept = c.db.get('concepts', c.query.conceptId);
    const e = { workId: c.query.workId, locationId: c.query.locationId, conceptId: c.query.conceptId, unitId: concept?.unitId, budgetItemId: c.query.budgetItemId || null, workType: c.query.workType || 'ordinario', qty: '0' };
    const b = budgetContext(c.db, e);
    return { previousValidated: b.previousValidated, budgetQty: b.budgetQty, unit: label(c.db, 'units', concept?.unitId, 'code'), unitKind: label(c.db, 'units', concept?.unitId, 'kind'), evidenceRequired: concept ? concept.evidencePolicy === 'requerida' || !!concept.hiddenWork : false };
  });
  app.get('/api/progress/:id', (c) => {
    internal(c); const e = c.db.get('progressEntries', c.params.id);
    if (!e || !c.acc.inScope('progress.view', e.workId)) throw notFound('El avance');
    return {
      ...entryRow(c.db, e), cumulativeMeasured: e.cumulativeMeasured, baseCumulative: e.baseCumulative, notes: e.notes, internalNotes: e.internalNotes, reworkKind: e.reworkKind, budgetItemId: e.budgetItemId, rejectedReason: e.rejectedReason, evidenceRequired: e.evidenceRequired, evidenceException: e.evidenceException, overBudgetNote: e.overBudgetNote, device: e.device, lastReviewedAt: e.lastReviewedAt, validatedBy: label(c.db, 'users', e.validatedBy), validatedAt: e.validatedAt, crewId: e.crewId, additionalId: e.additionalId,
      budget: budgetContext(c.db, e),
      generator: c.db.by('generatorLines', 'entryId', e.id).sort((a, b) => a.sortOrder - b.sortOrder),
      adjustments: c.db.by('progressAdjustments', 'entryId', e.id).map((a) => ({ ...a, proposedByName: label(c.db, 'users', a.proposedBy), authorizedByName: label(c.db, 'users', a.authorizedBy) })),
      allocations: c.db.by('executionAllocations', 'progressEntryId', e.id).filter((a) => a.state !== 'liberada').map((a) => ({ id: a.id, circuit: a.circuit, qty: a.qty, state: a.state, docType: a.docType, docId: a.docId, folio: label(c.db, a.docType === 'cEstimate' ? 'cEstimates' : 'kEstimates', a.docId, 'folio') })),
      can: { edit: ['borrador', 'reportado', 'rechazado'].includes(e.status) && (e.authorId === c.user.id || c.acc.can('progress.validate', e.workId)), validate: e.status === 'reportado' && c.acc.can('progress.validate', e.workId), adjust: e.status === 'validado', authorizeAdjust: c.acc.can('progress.adjust.authorize', e.workId), evidenceException: c.acc.can('evidence.exception.authorize', e.workId) },
    };
  });
  // Una visita puede traer varios conceptos: cada partida conserva su fila y su origen.
  app.post('/api/progress', (c) => {
    internal(c);
    const list = Array.isArray(c.body.entries) ? c.body.entries : [c.body];
    return c.tx('captura_avance', (tx) => {
      let captureId = null;
      if (list.length > 1 || c.body.visit) {
        const first = list[0]; c.acc.require('progress.capture', first.workId);
        captureId = tx.insert('captures', { workId: first.workId, supervisorId: c.user.id, visitDate: first.executionDate, periodId: periodFor(tx, first.executionDate).id, device: c.body.device || null, note: c.body.visitNote || null }).id;
      }
      const results = list.map((e) => createEntry(tx, c.acc, { ...e, captureId, device: c.body.device || e.device }));
      return list.length === 1 && !Array.isArray(c.body.entries) ? results[0] : { captureId, results };
    });
  });
  app.patch('/api/progress/:id', (c) => c.tx('edicion_avance', (tx) => updateEntry(tx, c.acc, c.params.id, c.body, c.body.recordVersion)));
  app.post('/api/progress/:id/submit', (c) => c.tx('envio_avance', (tx) => submitEntry(tx, c.acc, c.params.id)));
  app.post('/api/progress/:id/review', (c) => c.tx(c.body.decision === 'rechazar' ? 'rechazo_avance' : 'validacion_avance', (tx) => reviewEntry(tx, c.acc, c.params.id, c.body, c.body.recordVersion)));
  app.post('/api/progress/:id/evidence-exception', (c) => c.tx('excepcion_evidencia', (tx) => evidenceException(tx, c.acc, c.params.id, c.body)));
  app.post('/api/progress/:id/dismiss-duplicate', (c) => c.tx('descarte_duplicado', (tx) => { const e = tx.must('progressEntries', c.params.id); c.acc.require('progress.validate', e.workId); requireReason(c.body, 'descartar la alerta'); tx.update('progressEntries', e.id, { duplicateFlag: 'descartado' }); return { id: e.id }; }));
  app.post('/api/progress/:id/adjustments', (c) => c.tx('propuesta_ajuste', (tx) => proposeAdjustment(tx, c.acc, c.params.id, c.body)));
  app.post('/api/progress-adjustments/:id/decide', (c) => c.tx('decision_ajuste', (tx) => decideAdjustment(tx, c.acc, c.params.id, c.body)));
}
