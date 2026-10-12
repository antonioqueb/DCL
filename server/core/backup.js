// Respaldos consistentes (manifiesto + colecciones + adjuntos referenciados) y restauración controlada.
import fs from 'node:fs';
import path from 'node:path';
import { Store, View, validateAll, validateRecord, sha256, writeFileDurable } from './store.js';
import { ENTITIES } from '../domain/schema.js';
import { StorageError } from './errors.js';

const stampNow = () => new Date().toISOString().replace(/[:.]/g, '-');
const blobRefs = (cols) => { const s = new Set(); for (const a of cols.get('attachments') || []) { s.add(a.sha256); if (a.thumbSha256) s.add(a.thumbSha256); } return s; };

export function createBackup(store, auth, { by = 'sistema', note = null } = {}) {
  const stamp = stampNow(); const dir = path.join(store.dir, 'backups', stamp);
  fs.mkdirSync(path.join(dir, 'collections'), { recursive: true }); fs.mkdirSync(path.join(dir, 'blobs'), { recursive: true });
  // Toma una generación coherente: el volcado proviene de una sola vista en memoria.
  const cols = store.dump(); const files = {}; let bytes = 0;
  for (const [c, records] of cols) { const data = Buffer.from(JSON.stringify({ collection: c, records })); fs.writeFileSync(path.join(dir, 'collections', `${c}.json`), data); files[`collections/${c}.json`] = { sha256: sha256(data), count: records.length }; bytes += data.length; }
  let blobs = 0; const missing = [];
  for (const h of blobRefs(cols)) { if (!store.hasBlob(h)) { missing.push(h); continue; } const b = store.readBlob(h); fs.writeFileSync(path.join(dir, 'blobs', h), b); files[`blobs/${h}`] = { sha256: h }; bytes += b.length; blobs++; }
  if (auth) { const data = Buffer.from(JSON.stringify(auth.exportCredentials())); fs.writeFileSync(path.join(dir, 'credentials.json'), data); try { fs.chmodSync(path.join(dir, 'credentials.json'), 0o600); } catch { /* sin permisos POSIX */ } files['credentials.json'] = { sha256: sha256(data) }; }
  const manifest = { format: 'dcl-backup', stamp, createdAt: new Date().toISOString(), createdBy: by, note, dataset: store.dataset, organizationId: store.organizationId, schemaVersion: store.manifest.schemaVersion, generation: store.manifest.generation, auditHead: store.manifest.auditHead, files, missingBlobs: missing };
  const text = JSON.stringify(manifest, null, 1); writeFileDurable(path.join(dir, 'backup.json'), text);
  const info = { stamp, generation: manifest.generation, files: Object.keys(files).length, blobs, bytes, checksum: sha256(text), missingBlobs: missing.length };
  store.tx({ actor: { id: null, name: by }, action: 'respaldo' }, (tx) => { tx.insert('backupManifests', { stamp, generation: info.generation, files: info.files, blobs, bytes, checksum: info.checksum, createdByName: by, note }); });
  return info;
}
export function listBackups(dataDir) {
  const dir = path.join(dataDir, 'backups'); if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => fs.existsSync(path.join(dir, f, 'backup.json'))).sort().reverse().map((stamp) => { const m = JSON.parse(fs.readFileSync(path.join(dir, stamp, 'backup.json'), 'utf8')); return { stamp, createdAt: m.createdAt, createdBy: m.createdBy, dataset: m.dataset, generation: m.generation, files: Object.keys(m.files).length, note: m.note }; });
}
// Verifica sumas, esquema, referencias y adjuntos sin tocar la operación vigente.
export function readBackup(backupDir) {
  const problems = [];
  const mf = path.join(backupDir, 'backup.json'); if (!fs.existsSync(mf)) throw new StorageError('La carpeta no contiene un respaldo válido.');
  const manifest = JSON.parse(fs.readFileSync(mf, 'utf8')); if (manifest.format !== 'dcl-backup') throw new StorageError('Formato de respaldo desconocido.');
  const cols = new Map();
  for (const [rel, info] of Object.entries(manifest.files)) {
    const f = path.join(backupDir, rel);
    if (!fs.existsSync(f)) { problems.push({ file: rel, problem: 'archivo faltante' }); continue; }
    const buf = fs.readFileSync(f);
    if (sha256(buf) !== info.sha256) { problems.push({ file: rel, problem: 'suma de verificación distinta' }); continue; }
    if (rel.startsWith('collections/')) { const doc = JSON.parse(buf.toString('utf8')); if (!ENTITIES[doc.collection]) { problems.push({ file: rel, problem: 'colección desconocida' }); continue; } if (doc.records.length !== info.count) problems.push({ file: rel, problem: 'conteo distinto' }); cols.set(doc.collection, doc.records); }
  }
  if (!problems.length) {
    const m = new Map(); for (const [c, recs] of cols) { const mm = new Map(); for (const r of recs) { try { mm.set(r.id, validateRecord(c, r)); } catch (e) { problems.push({ collection: c, id: r.id, problem: e.message }); } } m.set(c, mm); }
    problems.push(...validateAll(new View(m, manifest)));
    for (const h of blobRefs(cols)) if (!manifest.files[`blobs/${h}`] && !manifest.missingBlobs.includes(h)) problems.push({ file: `blobs/${h}`, problem: 'adjunto referenciado sin respaldo' });
  }
  return { manifest, cols, problems };
}
function applyBackup(store, auth, backupDir, b) {
  for (const rel of Object.keys(b.manifest.files)) if (rel.startsWith('blobs/')) store.putBlob(fs.readFileSync(path.join(backupDir, rel)));
  store.replaceAll(b.cols, { auditHead: b.manifest.auditHead });
  const cred = path.join(backupDir, 'credentials.json');
  if (auth && fs.existsSync(cred)) { auth.data = { credentials: JSON.parse(fs.readFileSync(cred, 'utf8')).credentials, sessions: {} }; auth._save(); }
}
// Restauración sobre la operación vigente: valida, conserva un respaldo previo y sustituye la generación.
export function restoreBackup(store, auth, stamp, { by = 'sistema' } = {}) {
  const backupDir = path.join(store.dir, 'backups', stamp); const b = readBackup(backupDir);
  if (b.problems.length) throw new StorageError('El respaldo no supera la validación; no se restauró nada.', { problems: b.problems.slice(0, 50) });
  if (b.manifest.dataset !== store.dataset) throw new StorageError(`El respaldo es del conjunto "${b.manifest.dataset}" y estos datos son "${store.dataset}". No se mezclan demostración y operación.`);
  if (b.manifest.organizationId !== store.organizationId) throw new StorageError('El respaldo pertenece a otra organización.');
  const previous = createBackup(store, auth, { by, note: `Previo a restaurar ${stamp}` });
  applyBackup(store, auth, backupDir, b);
  store.tx({ actor: { id: null, name: by }, action: 'restauracion', reason: `Restauración del respaldo ${stamp}` }, (tx) => tx.event('restauracion', { detail: { stamp, previousBackup: previous.stamp } }));
  return { restored: stamp, previousBackup: previous.stamp };
}
// Restauración en un entorno de prueba aislado (otra carpeta de datos).
export function restoreInto(backupDir, targetDir, AuthStore) {
  const b = readBackup(backupDir);
  if (b.problems.length) throw new StorageError('El respaldo no supera la validación.', { problems: b.problems.slice(0, 50) });
  if (fs.existsSync(path.join(targetDir, 'manifest.json'))) throw new StorageError('La carpeta destino ya contiene datos; use una carpeta vacía para la prueba de restauración.');
  const store = Store.open(targetDir, { create: { dataset: b.manifest.dataset, organizationId: b.manifest.organizationId } });
  const auth = AuthStore ? new AuthStore(targetDir) : null;
  applyBackup(store, auth, backupDir, b);
  return { store, auth };
}
