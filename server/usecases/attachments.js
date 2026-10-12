// Archivos: fotografías, documentos y planos. El original se conserva íntegro (hash) y se sirve
// solo tras verificar permisos; las miniaturas son copias optimizadas aparte.
import { invalid, notFound, forbidden, blocked } from '../core/errors.js';
import { label, pick, req, visibleWork, locationPath } from './common.js';

const MAGIC = [
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, ext: ['.jpg', '.jpeg'] },
  { mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), ext: ['.png'] },
  { mime: 'image/webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP', ext: ['.webp'] },
  { mime: 'application/pdf', test: (b) => b.subarray(0, 5).toString() === '%PDF-', ext: ['.pdf'] },
  { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', test: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04, ext: ['.xlsx'], onlyKind: 'importacion' },
  { mime: 'text/csv', test: (b) => !b.subarray(0, 4096).includes(0), ext: ['.csv'], onlyKinds: ['importacion', 'comprobante'] },
];
export function sniff(buf, name, kind) {
  const ext = (/\.[A-Za-z0-9]+$/.exec(name || '') || [''])[0].toLowerCase();
  for (const m of MAGIC) {
    if (!m.ext.includes(ext)) continue;
    if (m.onlyKind && kind !== m.onlyKind) continue; if (m.onlyKinds && !m.onlyKinds.includes(kind)) continue;
    if (!m.test(buf)) throw invalid(`El contenido del archivo no corresponde a su extensión (${ext}).`, 'file', 'Vuelva a exportar o fotografiar el documento.');
    return m.mime;
  }
  throw invalid(`Tipo de archivo no permitido (${ext || 'sin extensión'}). Se aceptan JPG, PNG, WEBP y PDF.`, 'file');
}

// A qué obra pertenece un objeto de negocio y qué permiso se necesita para adjuntarle evidencia.
const OBJ = {
  progressEntry: ['progressEntries', 'progress.capture', 'progress.validate'], additional: ['additionals', 'additionals.report'], incident: ['incidents', 'additionals.report'],
  cEstimate: ['cEstimates', 'cestimates.prepare'], kEstimate: ['kEstimates', 'kestimates.prepare'], expense: ['expenses', 'expenses.capture'], changeOrder: ['changeOrders', 'budgets.manage'],
  disbursement: ['disbursements', 'payments.prepare', 'payments.confirm'], receipt: ['receipts', 'receipts.register'], work: ['works', 'works.manage'], contract: ['contracts', 'budgets.manage'], budgetVersion: ['budgetVersions', 'budgets.manage'], invoice: ['invoices', 'receipts.register'],
};
function objectOf(db, type, id) { const def = OBJ[type]; if (!def) throw invalid('Tipo de objeto no admitido para evidencia.', 'objectType'); const o = db.get(def[0], id); if (!o) throw notFound('El registro'); return { o, perms: def.slice(1), workId: type === 'work' ? o.id : o.workId || null }; }

export function canReadAttachment(db, acc, att) {
  if (!att) return false;
  if (att.uploadedBy === acc.user.id) return true;
  const links = db.by('evidenceLinks', 'attachmentId', att.id);
  if (acc.audience === 'interno') {
    if (att.confidentiality === 'laboral') return acc.can('personnel.view');
    if (att.confidentiality === 'financiero') return acc.can('payments.view') || acc.can('expenses.view') || acc.can('receivables.view') || acc.can('cash.view');
    if (att.kind === 'importacion') return acc.can('import.manage');
    if (att.workId) return acc.inScope('works.view', att.workId);
    return links.some((l) => !l.workId || acc.inScope('works.view', l.workId)) || !links.length && acc.can('works.view');
  }
  if (acc.audience === 'contratista' && acc.partyId) {
    if (att.confidentiality !== 'operativo') {
      // Comprobantes de sus propios pagos confirmados.
      return db.by('disbursements', 'receiptAttachmentId', att.id).some((x) => x.beneficiaryId === acc.partyId && x.status !== 'preparado');
    }
    const mine = (estId) => { const e = db.get('cEstimates', estId); return e && e.contractorId === acc.partyId && !['borrador', 'revision_interna', 'cancelada'].includes(e.status); };
    for (const l of links) {
      if (l.objectType === 'progressEntry' && db.by('executionAllocations', 'progressEntryId', l.objectId).some((a) => a.circuit === 'contratista' && a.state !== 'liberada' && mine(a.docId))) return true;
      if (l.objectType === 'cEstimate' && mine(l.objectId)) return true;
    }
    return db.by('issuedDocuments', 'attachmentId', att.id).some((x) => x.audience === 'contratista' && x.partyId === acc.partyId);
  }
  if (acc.audience === 'cliente' && acc.partyId) {
    const pub = (kId) => { const k = db.get('kEstimates', kId); return k && k.clientId === acc.partyId && k.publishedVersion !== null; };
    if (db.by('issuedDocuments', 'attachmentId', att.id).some((x) => x.audience === 'cliente' && x.published && x.partyId === acc.partyId)) return true;
    // Solo evidencias expresamente seleccionadas para el expediente del cliente.
    for (const l of links) if (l.clientVisible) {
      if (l.objectType === 'kEstimate' && pub(l.objectId)) return true;
      if (l.objectType === 'progressEntry' && db.by('executionAllocations', 'progressEntryId', l.objectId).some((a) => a.circuit === 'cliente' && a.state !== 'liberada' && pub(a.docId))) return true;
    }
    return db.by('planVersions', 'attachmentId', att.id).some((pv) => { const w = db.get('works', db.get('plans', pv.planId)?.workId); return w && w.clientId === acc.partyId && db.by('planAnnotations', 'planVersionId', pv.id).some((an) => db.by('annotationLinks', 'annotationId', an.id).some((al) => al.objectType === 'kEstimate' && pub(al.objectId))); });
  }
  return false;
}

export const attRow = (db, a) => ({ id: a.id, name: a.originalName, mime: a.mime, size: a.size, kind: a.kind, sha256: a.sha256, uploadedBy: label(db, 'users', a.uploadedBy), uploadedAt: a.uploadedAt, takenAtDeclared: a.takenAtDeclared, takenAtSource: a.takenAtSource, hasThumb: !!a.hasThumb, isImage: a.mime.startsWith('image/') });
export function evidenceFor(db, acc, objectType, objectId, { clientOnly = false } = {}) {
  return db.by('evidenceLinks', 'objectId', objectId).filter((l) => l.objectType === objectType && (!clientOnly || l.clientVisible)).map((l) => { const a = db.get('attachments', l.attachmentId); return a && canReadAttachment(db, acc, a) ? { linkId: l.id, caption: l.caption, clientVisible: acc.audience === 'interno' ? l.clientVisible : undefined, location: locationPath(db, l.locationId), ...attRow(db, a) } : null; }).filter(Boolean);
}

export function saveAttachment(tx, store, user, buf, { name, kind = 'documento', workId = null, takenAt = null, confidentiality = 'operativo' }) {
  if (!buf.length) throw invalid('El archivo está vacío.', 'file');
  const mime = sniff(buf, name, kind);
  const sha = store.putBlob(buf); // el binario se escribe antes; el registro participa del compromiso lógico
  return tx.insert('attachments', { originalName: String(name).slice(0, 200), mime, size: buf.length, sha256: sha, kind, uploadedBy: user?.id || null, uploadedAt: tx.now, takenAtDeclared: takenAt || null, takenAtSource: takenAt ? 'declarada' : 'no_disponible', hasThumb: false, workId, confidentiality });
}

export function register(app) {
  app.post('/api/attachments', (c) => {
    const q = c.query; if (!q.name) throw invalid('Falta el nombre del archivo.', 'name');
    if (c.acc.audience !== 'interno' && !['foto', 'documento'].includes(q.kind || 'documento')) throw forbidden();
    { const w = q.workId ? c.db.get('works', q.workId) : null; if (q.workId && (!w || !visibleWork(c.db, c.acc, w))) throw notFound('La obra'); }
    const conf = c.acc.audience === 'interno' ? q.confidentiality || (['comprobante'].includes(q.kind) ? 'financiero' : 'operativo') : 'operativo';
    const att = c.tx('carga_archivo', (tx) => saveAttachment(tx, c.store, c.user, c.body, { name: q.name, kind: q.kind || 'documento', workId: q.workId || null, takenAt: q.takenAt || null, confidentiality: conf }));
    return { id: att.id, sha256: att.sha256, size: att.size, mime: att.mime, confirmed: true };
  }, { raw: true });
  app.post('/api/attachments/:id/thumb', (c) => {
    const a = c.db.get('attachments', c.params.id); if (!a || a.uploadedBy !== c.user.id) throw notFound('El archivo');
    if (c.body.length > 400 * 1024 || !(c.body[0] === 0xff && c.body[1] === 0xd8)) throw invalid('La miniatura debe ser JPEG de hasta 400 KB.', 'file');
    const sha = c.store.putBlob(c.body);
    c.tx('miniatura', (tx) => tx.update('attachments', a.id, { hasThumb: true, thumbSha256: sha }));
    return { ok: true };
  }, { raw: true });
  const serve = (thumb) => (c) => {
    const a = c.db.get('attachments', c.params.id);
    if (!a || !canReadAttachment(c.db, c.acc, a)) throw notFound('El archivo');
    const sha = thumb && a.thumbSha256 ? a.thumbSha256 : a.sha256;
    if (!c.store.hasBlob(sha)) throw notFound('El contenido del archivo');
    const inline = (a.mime.startsWith('image/') || a.mime === 'application/pdf') && c.query.download !== '1';
    return { __file: { buffer: c.store.readBlob(sha), mime: thumb && a.thumbSha256 ? 'image/jpeg' : a.mime, name: a.originalName, inline } };
  };
  app.get('/api/attachments/:id/content', serve(false));
  app.get('/api/attachments/:id/thumb', serve(true));
  app.get('/api/attachments/:id', (c) => { const a = c.db.get('attachments', c.params.id); if (!a || !canReadAttachment(c.db, c.acc, a)) throw notFound('El archivo'); return attRow(c.db, a); });

  app.get('/api/evidence', (c) => {
    if (c.acc.audience === 'interno') { const { workId } = objectOf(c.db, c.query.objectType, c.query.objectId); if (workId && !c.acc.inScope('works.view', workId)) throw notFound(); }
    return { items: evidenceFor(c.db, c.acc, c.query.objectType, c.query.objectId) };
  });
  app.post('/api/evidence', (c) => c.tx('vinculo_evidencia', (tx) => {
    req(c.body, ['attachmentId', 'objectType', 'objectId']);
    const a = tx.must('attachments', c.body.attachmentId, 'El archivo'); if (!canReadAttachment(tx, c.acc, a)) throw notFound('El archivo');
    const { o, perms, workId } = objectOf(tx, c.body.objectType, c.body.objectId);
    if (c.acc.audience === 'contratista') { if (c.body.objectType !== 'cEstimate' || o.contractorId !== c.acc.partyId) throw notFound(); }
    else if (c.acc.audience !== 'interno' || !perms.some((p) => c.acc.can(p, workId || undefined))) throw forbidden('No tiene permiso para adjuntar evidencia a este registro.');
    if (tx.by('evidenceLinks', 'attachmentId', a.id).some((l) => l.objectType === c.body.objectType && l.objectId === c.body.objectId)) return { ok: true, duplicate: true };
    const l = tx.insert('evidenceLinks', { attachmentId: a.id, objectType: c.body.objectType, objectId: c.body.objectId, workId, locationId: o.locationId || null, clientVisible: false, caption: c.body.caption || null });
    return { id: l.id };
  }));
  // Selección de evidencias para el expediente del cliente (nunca automática).
  app.patch('/api/evidence/:id', (c) => c.tx('seleccion_evidencia', (tx) => {
    const l = tx.must('evidenceLinks', c.params.id); c.acc.require('kestimates.prepare', l.workId || undefined, 'seleccionar evidencias para el cliente');
    const a = tx.get('attachments', l.attachmentId);
    if (c.body.clientVisible && a.confidentiality !== 'operativo') throw blocked('Los documentos internos, laborales o financieros no se publican al cliente.');
    tx.update('evidenceLinks', l.id, pick(c.body, ['clientVisible', 'caption'])); return { id: l.id };
  }));
  app.del('/api/evidence/:id', (c) => c.tx('retiro_evidencia', (tx) => {
    const l = tx.must('evidenceLinks', c.params.id); const a = tx.get('attachments', l.attachmentId);
    if (a.uploadedBy !== c.user.id) c.acc.require('progress.validate', l.workId || undefined);
    if (l.objectType === 'progressEntry' && tx.get('progressEntries', l.objectId)?.status === 'validado') throw blocked('La evidencia de un avance validado no se retira.', [], 'El archivo original se conserva; si es incorrecto, registre un ajuste con motivo.');
    tx.remove('evidenceLinks', l.id); return { ok: true };
  }));

  // ── Planos: versiones, páginas y anotaciones con coordenadas normalizadas (0–1) ──
  const planView = (db, acc, p) => ({ id: p.id, name: p.name, discipline: p.discipline, workId: p.workId, versions: db.by('planVersions', 'planId', p.id).sort((a, b) => b.version - a.version).map((v) => ({ id: v.id, version: v.version, status: v.status, note: v.note, pageCount: v.pageCount, attachment: attRow(db, db.get('attachments', v.attachmentId)), createdAt: v.createdAt,
    annotations: db.by('planAnnotations', 'planVersionId', v.id).map((an) => ({ id: an.id, page: an.page, shape: an.shape, points: an.points.p, label: an.label, location: locationPath(db, an.locationId), links: db.by('annotationLinks', 'annotationId', an.id).map((l) => ({ id: l.id, objectType: l.objectType, objectId: l.objectId })) })) })) });
  app.get('/api/works/:id/plans', (c) => { if (c.acc.audience !== 'interno' || !c.acc.inScope('works.view', c.params.id)) throw notFound(); return { items: c.db.by('plans', 'workId', c.params.id).filter((p) => !p.archivedAt).map((p) => planView(c.db, c.acc, p)) }; });
  app.post('/api/works/:id/plans', (c) => c.tx('alta_plano', (tx) => {
    c.acc.require('works.manage', c.params.id); req(c.body, ['name', 'attachmentId']); const a = tx.must('attachments', c.body.attachmentId);
    if (!(a.mime === 'application/pdf' || a.mime.startsWith('image/'))) throw invalid('El plano debe ser PDF o imagen.', 'attachmentId');
    const p = tx.insert('plans', { workId: c.params.id, name: c.body.name, discipline: c.body.discipline || null });
    tx.insert('planVersions', { planId: p.id, version: 1, attachmentId: a.id, pageCount: c.body.pageCount || 1, status: 'vigente', note: c.body.note || null });
    return { id: p.id };
  }));
  // Sustituir un plano crea otra versión; las anotaciones permanecen sobre la versión en que se hicieron.
  app.post('/api/plans/:id/versions', (c) => c.tx('nueva_version_plano', (tx) => {
    const p = tx.must('plans', c.params.id); c.acc.require('works.manage', p.workId); req(c.body, ['attachmentId']);
    const vs = tx.by('planVersions', 'planId', p.id); for (const v of vs) if (v.status === 'vigente') tx.update('planVersions', v.id, { status: 'sustituida' });
    return { id: tx.insert('planVersions', { planId: p.id, version: Math.max(0, ...vs.map((v) => v.version)) + 1, attachmentId: c.body.attachmentId, pageCount: c.body.pageCount || 1, status: 'vigente', note: c.body.note || null }).id };
  }));
  app.post('/api/plan-versions/:id/annotations', (c) => c.tx('anotacion_plano', (tx) => {
    const v = tx.must('planVersions', c.params.id); const p = tx.must('plans', v.planId);
    if (!c.acc.can('works.manage', p.workId) && !c.acc.can('progress.capture', p.workId) && !c.acc.can('kestimates.prepare', p.workId)) throw forbidden();
    const { shape, points, page = 1 } = c.body;
    const need = { punto: [1, 1], linea: [2, 50], poligono: [3, 200] }[shape]; if (!need) throw invalid('Forma no válida: punto, línea o polígono.', 'shape');
    if (!Array.isArray(points) || points.length < need[0] || points.length > need[1] || points.some((pt) => !Array.isArray(pt) || pt.length !== 2 || pt.some((n) => typeof n !== 'number' || n < 0 || n > 1))) throw invalid('Las coordenadas deben estar normalizadas entre 0 y 1.', 'points');
    // No se calculan medidas reales desde píxeles: la anotación señala una zona, no la mide.
    const an = tx.insert('planAnnotations', { planVersionId: v.id, page, shape, points: { p: points.map((pt) => pt.map((n) => Math.round(n * 1e5) / 1e5)) }, label: c.body.label || null, locationId: c.body.locationId || null });
    for (const l of c.body.links || []) tx.insert('annotationLinks', { annotationId: an.id, objectType: l.objectType, objectId: l.objectId });
    return { id: an.id };
  }));
  app.post('/api/annotations/:id/links', (c) => c.tx('vinculo_anotacion', (tx) => {
    const an = tx.must('planAnnotations', c.params.id); const p = tx.get('plans', tx.get('planVersions', an.planVersionId).planId); if (!c.acc.can('works.manage', p.workId) && !c.acc.can('kestimates.prepare', p.workId) && !c.acc.can('progress.capture', p.workId)) throw forbidden();
    req(c.body, ['objectType', 'objectId']); return { id: tx.insert('annotationLinks', { annotationId: an.id, objectType: c.body.objectType, objectId: c.body.objectId }).id };
  }));
  app.del('/api/annotations/:id', (c) => c.tx('retiro_anotacion', (tx) => {
    const an = tx.must('planAnnotations', c.params.id); const p = tx.get('plans', tx.get('planVersions', an.planVersionId).planId); c.acc.require('works.manage', p.workId);
    const links = tx.by('annotationLinks', 'annotationId', an.id);
    if (links.some((l) => l.objectType === 'kEstimate' && tx.get('kEstimates', l.objectId)?.publishedVersion !== null)) throw blocked('La anotación forma parte de una estimación publicada al cliente y debe conservarse.');
    for (const l of links) tx.remove('annotationLinks', l.id); tx.remove('planAnnotations', an.id); return { ok: true };
  }));
}
