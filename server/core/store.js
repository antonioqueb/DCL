// Adaptador de archivos: colecciones JSON por generación, manifiesto con cambio atómico,
// una sola instancia escritora, control optimista por recordVersion, auditoría e idempotencia
// dentro del mismo compromiso lógico. Los casos de uso solo conocen la interfaz View/Tx.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { ENTITIES, SCHEMA_VERSION, fieldsOf, DECIMALS } from '../domain/schema.js';
import { norm, isDec } from '../domain/decimal.js';
import { isDate, isInstant, nowInstant } from '../domain/dates.js';
import { AppError, ConflictError, StorageError, invalid } from './errors.js';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const DELETABLE = new Set(['generatorLines', 'cEstimateItems', 'kEstimateItems', 'budgetItems', 'changeOrderItems', 'expenseAllocations', 'workdayAllocations', 'rolePermissions', 'roleAssignments', 'annotationLinks', 'planAnnotations', 'evidenceLinks', 'notifications', 'payComponents', 'reconLinks', 'sourceRecords', 'matchProposals', 'conceptLinks', 'crewMemberships']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}
function writeFileDurable(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
function fsyncDir(dir) { try { const fd = fs.openSync(dir, 'r'); fs.fsyncSync(fd); fs.closeSync(fd); } catch { /* no disponible en todos los sistemas */ } }
const partitionKey = (name, rec) => {
  const p = ENTITIES[name].partitionBy;
  if (!p) return '';
  return String(typeof p === 'function' ? p(rec) : rec[p]).replace(/[^A-Za-z0-9_-]/g, '_');
};

// ── Validación de registros contra el esquema ──
export function validateRecord(name, rec) {
  const fields = fieldsOf(name);
  const out = {};
  for (const k of Object.keys(rec)) if (!fields[k]) throw invalid(`Campo no declarado en ${name}: ${k}`, k);
  for (const [k, f] of Object.entries(fields)) {
    let v = rec[k];
    if (v === undefined || v === '') v = null;
    if (v === null) {
      if (f.required) throw invalid(`Falta ${ENTITIES[name].label}: ${k}.`, k, 'Capture el dato obligatorio.');
      out[k] = null; continue;
    }
    switch (f.type) {
      case 'uuid': case 'ref': if (typeof v !== 'string' || !UUID_RE.test(v)) throw invalid(`Identificador inválido en ${name}.${k}`, k); break;
      case 'str': case 'text': case 'secret': if (typeof v !== 'string') throw invalid(`Texto inválido en ${name}.${k}`, k); break;
      case 'int': if (!Number.isInteger(v)) throw invalid(`Entero inválido en ${name}.${k}`, k); break;
      case 'bool': if (typeof v !== 'boolean') throw invalid(`Valor sí/no inválido en ${name}.${k}`, k); break;
      case 'date': if (!isDate(v)) throw invalid(`Fecha inválida en ${k}: "${v}". Use AAAA-MM-DD.`, k); break;
      case 'month': if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) throw invalid(`Periodo inválido en ${k}: "${v}". Use AAAA-MM.`, k); break;
      case 'instant': if (!isInstant(v)) throw invalid(`Instante inválido en ${name}.${k}`, k); break;
      case 'money': case 'qty': case 'price': case 'pct':
        if (typeof v === 'number' || !isDec(v)) throw invalid(`Importe o cantidad inválido en ${k}: "${v}".`, k, 'Use un número decimal con punto.');
        v = norm(v, DECIMALS[f.type]); break;
      case 'enum': if (!f.values.includes(v)) throw invalid(`Valor no permitido en ${k}: "${v}". Opciones: ${f.values.join(', ')}.`, k); break;
      case 'json': if (typeof v !== 'object') throw invalid(`Estructura inválida en ${name}.${k}`, k); break;
      default: throw new Error(`Tipo desconocido ${f.type}`);
    }
    out[k] = v;
  }
  return out;
}

// ── Vista de lectura sobre una generación coherente ──
const INDEX = new WeakMap();
export class View {
  constructor(cols, meta) { this.cols = cols; this.meta = meta; }
  _base(c) { const m = this.cols.get(c); if (!m) { if (!ENTITIES[c]) throw new Error(`Colección desconocida: ${c}`); return EMPTY; } return m; }
  get(c, id) { return id ? this._base(c).get(id) || null : null; }
  must(c, id, what) { const r = this.get(c, id); if (!r) throw new AppError(404, 'no_encontrado', `${what || ENTITIES[c].label} no existe.`); return r; }
  all(c) { return [...this._base(c).values()]; }
  where(c, fn) { return this.all(c).filter(fn); }
  first(c, fn) { for (const r of this._base(c).values()) if (fn(r)) return r; return null; }
  count(c) { return this._base(c).size; }
  by(c, field, value) {
    const base = this._base(c);
    let idx = INDEX.get(base); if (!idx) INDEX.set(base, (idx = new Map()));
    let f = idx.get(field);
    if (!f) { f = new Map(); for (const r of base.values()) { const k = r[field]; let l = f.get(k); if (!l) f.set(k, (l = [])); l.push(r); } idx.set(field, f); }
    return f.get(value) || [];
  }
  one(c, field, value) { return this.by(c, field, value)[0] || null; }
}
const EMPTY = new Map();

// ── Transacción: capa de cambios sobre la vista; se confirma completa o no se confirma ──
class Tx extends View {
  constructor(store, meta) {
    super(store._cols, store.manifest);
    this.store = store; this.txMeta = meta; this.overlay = new Map(); this.removed = new Map(); this.events = []; this.now = nowInstant();
    this.actorId = meta.actor?.id || null; this.actorName = meta.actor?.name || 'sistema';
  }
  _ov(c) { let m = this.overlay.get(c); if (!m) this.overlay.set(c, (m = new Map())); return m; }
  get(c, id) { if (!id) return null; if (this.removed.get(c)?.has(id)) return null; return this.overlay.get(c)?.get(id) || super.get(c, id); }
  all(c) {
    const ov = this.overlay.get(c), rm = this.removed.get(c);
    if (!ov && !rm) return super.all(c);
    const res = [];
    for (const r of this._base(c).values()) { if (rm?.has(r.id) || ov?.has(r.id)) continue; res.push(r); }
    if (ov) for (const r of ov.values()) res.push(r);
    return res;
  }
  first(c, fn) { return this.all(c).find(fn) || null; }
  count(c) { return this.all(c).length; }
  by(c, field, value) {
    const ov = this.overlay.get(c), rm = this.removed.get(c), base = super.by(c, field, value);
    if (!ov && !rm) return base;
    const res = base.filter((r) => !rm?.has(r.id) && !ov?.has(r.id));
    if (ov) for (const r of ov.values()) if (r[field] === value) res.push(r);
    return res;
  }
  insert(c, data) {
    const ent = ENTITIES[c]; if (!ent) throw new Error(`Colección desconocida: ${c}`);
    const id = data.id || crypto.randomUUID();
    if (this.get(c, id)) throw invalid(`Ya existe un registro con ese identificador en ${ent.label}.`, 'id');
    const base = ent.noCommon ? {} : { organizationId: this.store.manifest.organizationId, recordVersion: 1, schemaVersion: SCHEMA_VERSION, createdAt: this.now, createdBy: this.actorId, updatedAt: this.now, updatedBy: this.actorId };
    const rec = deepFreeze(validateRecord(c, { ...base, ...data, id }));
    this._ov(c).set(id, rec);
    return rec;
  }
  update(c, id, patch, { expectedVersion } = {}) {
    const ent = ENTITIES[c];
    if (ent.immutable) throw new AppError(409, 'inmutable', `${ent.label}: los registros históricos no se modifican; registre un reverso o ajuste.`);
    const cur = this.get(c, id);
    if (!cur) throw new AppError(404, 'no_encontrado', `${ent.label} no existe.`);
    if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== cur.recordVersion) throw new ConflictError(c, cur, patch);
    const orig = super.get(c, id);
    const clean = { ...patch }; for (const k of ['id', 'organizationId', 'recordVersion', 'createdAt', 'createdBy', 'schemaVersion']) delete clean[k];
    const rec = deepFreeze(validateRecord(c, { ...cur, ...clean, recordVersion: (orig ? orig.recordVersion : 0) + 1, updatedAt: this.now, updatedBy: this.actorId }));
    this._ov(c).set(id, rec);
    return rec;
  }
  archive(c, id, opts) { return this.update(c, id, { archivedAt: this.now, archivedBy: this.actorId }, opts); }
  remove(c, id) {
    if (!DELETABLE.has(c)) throw new AppError(409, 'no_eliminable', `${ENTITIES[c].label}: no se eliminan registros; use desactivación, cancelación o reverso.`);
    const cur = this.get(c, id); if (!cur) return;
    this.overlay.get(c)?.delete(id);
    if (super.get(c, id)) { let s = this.removed.get(c); if (!s) this.removed.set(c, (s = new Map())); s.set(id, cur); }
  }
  // Evento de negocio explícito (aprobación, cierre, publicación, exportación sensible, etc.).
  event(action, { collection = null, objectId = null, objectVersion = null, reason = null, detail = null } = {}) {
    this.events.push({ action, kind: 'evento', collection, objectId, objectVersion, reason, diff: detail });
  }
}

export class Store {
  static open(dir, { create = null, readOnly = false, keepGenerations = 10, forceUnlock = false } = {}) {
    const s = new Store(); s.dir = path.resolve(dir); s.readOnly = readOnly; s.keep = keepGenerations; s.failpoint = null; s._commits = 0;
    const mf = path.join(s.dir, 'manifest.json');
    let fresh = false;
    if (!fs.existsSync(mf)) {
      fresh = true;
      if (!create) throw new StorageError(`No hay datos en ${s.dir}. Ejecute la configuración inicial.`);
      for (const d of ['generations', 'manifests', 'blobs', 'backups', 'secure', 'imports']) fs.mkdirSync(path.join(s.dir, d), { recursive: true });
      const manifest = { format: 'dcl-filestore', schemaVersion: SCHEMA_VERSION, dataset: create.dataset, organizationId: create.organizationId || crypto.randomUUID(), generation: 0, committedAt: nowInstant(), auditHead: { seq: 0, hash: 'GENESIS' }, collections: {} };
      writeFileDurable(mf, JSON.stringify(manifest, null, 1));
    }
    if (!readOnly) s._lock(forceUnlock);
    try { s._load(); } catch (e) { s.close(); throw e; }
    if (fresh) s.tx({ action: 'alta_organizacion' }, (tx) => tx.insert('organizations', { id: s.manifest.organizationId, name: create.organizationName || 'DCL Instalaciones' }));
    if (!readOnly) s._gc();
    return s;
  }
  _lock(force) {
    const lf = path.join(this.dir, 'instance.lock');
    const mine = JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: nowInstant() });
    for (let attempt = 0; attempt < 2; attempt++) {
      try { const fd = fs.openSync(lf, 'wx'); fs.writeSync(fd, mine); fs.fsyncSync(fd); fs.closeSync(fd); this._lockFile = lf; return; }
      catch (e) {
        if (e.code !== 'EEXIST') throw e;
        let other = {}; try { other = JSON.parse(fs.readFileSync(lf, 'utf8')); } catch { /* candado ilegible */ }
        let alive = true;
        if (other.host === os.hostname() && other.pid) { try { process.kill(other.pid, 0); } catch (k) { alive = k.code === 'EPERM'; } }
        if (other.pid === process.pid && other.host === os.hostname()) alive = true;
        if (alive && !force) throw new StorageError(`Ya hay otra instancia con escritura sobre estos datos (equipo ${other.host || '¿?'}, proceso ${other.pid || '¿?'}). Solo una instancia puede escribir; no comparta la carpeta de datos entre equipos.`, { lock: other });
        fs.unlinkSync(lf); // candado huérfano de un proceso que ya no existe
      }
    }
    throw new StorageError('No se pudo tomar el candado de instancia.');
  }
  close() { if (this._lockFile) { try { fs.unlinkSync(this._lockFile); } catch { /* ya liberado */ } this._lockFile = null; } this.closed = true; }

  _load() {
    const manifest = JSON.parse(fs.readFileSync(path.join(this.dir, 'manifest.json'), 'utf8'));
    if (manifest.format !== 'dcl-filestore') throw new StorageError('El manifiesto no corresponde a este sistema.');
    if (manifest.schemaVersion !== SCHEMA_VERSION) throw new StorageError(`Los datos están en la versión de esquema ${manifest.schemaVersion} y la aplicación espera ${SCHEMA_VERSION}. Ejecute el migrador de archivos; no se convierte en silencio al arrancar.`);
    const cols = new Map(); const corrupt = [];
    for (const [name, parts] of Object.entries(manifest.collections)) {
      const m = new Map();
      for (const [pk, info] of Object.entries(parts)) {
        const file = path.join(this.dir, info.file);
        try {
          const buf = fs.readFileSync(file);
          if (sha256(buf) !== info.sha256) throw new Error('la suma de verificación no coincide');
          const doc = JSON.parse(buf.toString('utf8'));
          if (doc.records.length !== info.count) throw new Error('el conteo no coincide con el manifiesto');
          for (const r of doc.records) m.set(r.id, deepFreeze(r));
        } catch (e) { corrupt.push({ collection: name, partition: pk, file: info.file, problem: e.message }); }
      }
      cols.set(name, m);
    }
    if (corrupt.length) throw new StorageError('Se detectó corrupción en los archivos de datos. No se modificó nada. Restaure un respaldo o la generación anterior.', { corrupt });
    this._cols = cols; this.manifest = deepFreeze(manifest);
  }
  get dataset() { return this.manifest.dataset; }
  get organizationId() { return this.manifest.organizationId; }
  view() { return new View(this._cols, this.manifest); }

  // Ejecuta una operación atómica. fn es síncrona: toda la operación queda visible o ninguna.
  tx(meta, fn) {
    if (this.readOnly) throw new StorageError('Esta instancia es de solo lectura.');
    if (this.closed) throw new StorageError('El almacenamiento está cerrado.');
    if (this._inTx) throw new Error('Transacción anidada no permitida');
    const idemKey = meta.idempotencyKey ? `${meta.actor?.id || 'sistema'}:${meta.idempotencyKey}` : null;
    if (idemKey) {
      const prev = this.view().one('idempotentOps', 'key', idemKey);
      if (prev) return prev.result ? structuredClone(prev.result.value) : undefined;
    }
    this._inTx = true;
    try {
      const tx = new Tx(this, meta);
      const result = fn(tx);
      if (result && typeof result.then === 'function') throw new Error('Las operaciones atómicas deben ser síncronas');
      if (idemKey) {
        const op = deepFreeze(validateRecord('idempotentOps', { id: crypto.randomUUID(), key: idemKey, actorId: meta.actor?.id || null, action: meta.action || 'operacion', result: result === undefined ? null : { value: JSON.parse(JSON.stringify(result)) }, at: tx.now }));
        tx._ov('idempotentOps').set(op.id, op);
      }
      this._commit(tx);
      return result;
    } finally { this._inTx = false; }
  }

  _commit(tx) {
    const changed = new Set([...tx.overlay.keys(), ...tx.removed.keys()].filter((c) => (tx.overlay.get(c)?.size || 0) + (tx.removed.get(c)?.size || 0) > 0));
    if (!changed.size && !tx.events.length) return;
    // 1. Restricciones: referencias, organización y unicidad lógica, sobre la vista resultante.
    for (const c of changed) {
      const ent = ENTITIES[c], fields = fieldsOf(c);
      for (const rec of tx.overlay.get(c)?.values() || []) {
        if (!ent.noCommon && rec.organizationId !== this.manifest.organizationId) throw invalid(`El registro de ${ent.label} pertenece a otra organización.`, 'organizationId');
        for (const [k, f] of Object.entries(fields)) {
          if (f.type === 'ref' && rec[k] && !tx.get(f.ref, rec[k])) throw invalid(`${ent.label}: la referencia ${k} apunta a un registro inexistente.`, k, 'Seleccione un registro válido.');
        }
        for (const u of ent.unique || []) {
          if (rec.archivedAt || u.some((k) => rec[k] === null)) continue;
          const dup = tx.by(c, u[0], rec[u[0]]).find((o) => o.id !== rec.id && !o.archivedAt && u.every((k) => o[k] === rec[k]));
          if (dup) throw new AppError(409, 'duplicado', `Ya existe ${ent.label} con ${u.map((k) => `${k} "${rec[k]}"`).join(' y ')}.`, { field: u[0], existingId: dup.id });
        }
      }
    }
    // 2. Auditoría canónica dentro del mismo compromiso.
    const txId = crypto.randomUUID(); const base = { at: tx.now, actorId: tx.actorId, actorName: tx.actorName, onBehalfOf: tx.txMeta.onBehalfOf || null, txId };
    const evs = [];
    for (const c of changed) {
      if (ENTITIES[c].audit === false) continue;
      const fields = fieldsOf(c);
      for (const rec of tx.overlay.get(c)?.values() || []) {
        const before = this._cols.get(c)?.get(rec.id);
        if (!before) { evs.push({ action: tx.txMeta.action, kind: 'alta', collection: c, objectId: rec.id, objectVersion: rec.recordVersion, reason: tx.txMeta.reason || null, diff: null }); continue; }
        const diff = {};
        for (const k of Object.keys(fields)) {
          if (k === 'updatedAt' || k === 'updatedBy' || k === 'recordVersion') continue;
          if (JSON.stringify(before[k] ?? null) !== JSON.stringify(rec[k] ?? null)) diff[k] = fields[k].type === 'secret' ? ['(restringido)', '(modificado)'] : [before[k] ?? null, rec[k] ?? null];
        }
        if (Object.keys(diff).length) evs.push({ action: tx.txMeta.action, kind: 'cambio', collection: c, objectId: rec.id, objectVersion: rec.recordVersion, reason: tx.txMeta.reason || null, diff });
      }
      for (const rec of tx.removed.get(c)?.values() || []) evs.push({ action: tx.txMeta.action, kind: 'baja', collection: c, objectId: rec.id, objectVersion: rec.recordVersion, reason: tx.txMeta.reason || null, diff: { eliminado: rec } });
    }
    for (const e of tx.events) evs.push({ ...e, reason: e.reason || tx.txMeta.reason || null });
    let { seq, hash } = this.manifest.auditHead;
    if (evs.length) {
      const ov = tx._ov('auditEvents');
      for (const e of evs) {
        seq += 1;
        const rec = validateRecord('auditEvents', { id: crypto.randomUUID(), ...base, ...e, action: e.action || 'operacion', seq, prevHash: hash, hash: '-' });
        delete rec.hash;
        hash = sha256(rec.prevHash + JSON.stringify(rec));
        rec.hash = hash;
        ov.set(rec.id, deepFreeze(rec));
      }
      changed.add('auditEvents');
    }
    // 3. Nueva generación: se escriben solo las particiones afectadas y al final se cambia el apuntador.
    const gen = this.manifest.generation + 1;
    const genRel = path.join('generations', String(gen).padStart(8, '0'));
    const genDir = path.join(this.dir, genRel);
    fs.mkdirSync(genDir, { recursive: true });
    const newCols = new Map(this._cols); const collections = { ...this.manifest.collections };
    try {
      for (const c of changed) {
        const ov = tx.overlay.get(c) || EMPTY, rm = tx.removed.get(c) || EMPTY;
        const next = new Map(this._cols.get(c) || EMPTY);
        const touched = new Set();
        for (const [id, r] of rm) { next.delete(id); touched.add(partitionKey(c, r)); }
        for (const [id, r] of ov) { const b = next.get(id); if (b) touched.add(partitionKey(c, b)); next.set(id, r); touched.add(partitionKey(c, r)); }
        const parts = { ...(collections[c] || {}) };
        for (const pk of touched) {
          const records = []; for (const r of next.values()) if (partitionKey(c, r) === pk) records.push(r);
          const rel = path.join(genRel, pk ? `${c}@${pk}.json` : `${c}.json`);
          const data = Buffer.from(JSON.stringify({ collection: c, partition: pk, schemaVersion: SCHEMA_VERSION, generation: gen, records }));
          writeFileDurable(path.join(this.dir, rel), data);
          if (records.length) parts[pk] = { file: rel, sha256: sha256(data), count: records.length }; else delete parts[pk];
          if (this.failpoint === 'after-first-collection') throw new Error('Fallo simulado durante la escritura de colecciones');
        }
        collections[c] = parts; newCols.set(c, next);
      }
      if (this.failpoint === 'before-manifest') throw new Error('Fallo simulado antes de cambiar el manifiesto');
      const manifest = { ...this.manifest, generation: gen, committedAt: tx.now, auditHead: { seq, hash }, collections };
      const text = JSON.stringify(manifest, null, 1);
      fsyncDir(genDir);
      writeFileDurable(path.join(this.dir, 'manifests', `manifest-${String(gen).padStart(8, '0')}.json`), text);
      writeFileDurable(path.join(this.dir, 'manifest.json'), text); // cambio atómico del apuntador de generación
      fsyncDir(this.dir);
      this._cols = newCols; this.manifest = deepFreeze(manifest);
    } catch (e) {
      try { fs.rmSync(genDir, { recursive: true, force: true }); } catch { /* quedará para la limpieza */ }
      throw e;
    }
    if (++this._commits % 25 === 0) this._gc();
  }

  // Conserva las últimas generaciones recuperables y elimina archivos que ningún manifiesto retenido referencia.
  _gc() {
    try {
      const mdir = path.join(this.dir, 'manifests');
      const files = fs.readdirSync(mdir).filter((f) => f.startsWith('manifest-')).sort();
      const drop = files.slice(0, Math.max(0, files.length - this.keep));
      for (const f of drop) fs.unlinkSync(path.join(mdir, f));
      const keep = new Set();
      const collect = (m) => { for (const parts of Object.values(m.collections)) for (const i of Object.values(parts)) keep.add(path.normalize(i.file)); };
      collect(this.manifest);
      for (const f of files.slice(drop.length)) { try { collect(JSON.parse(fs.readFileSync(path.join(mdir, f), 'utf8'))); } catch { /* manifiesto histórico ilegible */ } }
      const gdir = path.join(this.dir, 'generations');
      for (const g of fs.readdirSync(gdir)) {
        const d = path.join(gdir, g); let left = 0;
        for (const f of fs.readdirSync(d)) { if (keep.has(path.normalize(path.join('generations', g, f)))) left++; else fs.unlinkSync(path.join(d, f)); }
        if (!left) fs.rmdirSync(d);
      }
    } catch { /* la limpieza nunca interrumpe la operación */ }
  }
  generations() { return fs.readdirSync(path.join(this.dir, 'manifests')).filter((f) => f.startsWith('manifest-')).sort().map((f) => Number(f.slice(9, 17))); }

  // ── Adjuntos binarios: contenido direccionado por hash, fuera de cualquier ruta pública ──
  blobPath(hash) { if (!/^[0-9a-f]{64}$/.test(hash)) throw invalid('Identificador de archivo inválido.'); return path.join(this.dir, 'blobs', hash.slice(0, 2), hash); }
  putBlob(buf) {
    const h = sha256(buf); const p = this.blobPath(h);
    if (!fs.existsSync(p)) { fs.mkdirSync(path.dirname(p), { recursive: true }); writeFileDurable(p, buf); }
    return h;
  }
  hasBlob(hash) { return fs.existsSync(this.blobPath(hash)); }
  readBlob(hash) { return fs.readFileSync(this.blobPath(hash)); }

  // Verificación de la cadena de auditoría (detecta alteraciones; no es garantía frente a quien administra el servidor).
  verifyAudit() {
    const evs = this.view().all('auditEvents').sort((a, b) => a.seq - b.seq);
    let hash = 'GENESIS', expected = 1;
    for (const e of evs) {
      const { hash: h, ...body } = e;
      if (e.seq !== expected || e.prevHash !== hash || sha256(hash + JSON.stringify(body)) !== h) return { ok: false, brokenAt: e.seq, total: evs.length };
      hash = h; expected++;
    }
    return { ok: hash === this.manifest.auditHead.hash, total: evs.length };
  }
}

// Validación integral (restauración, importación de paquete, verificación administrativa).
export function validateAll(view) {
  const problems = [];
  for (const name of Object.keys(ENTITIES)) {
    const fields = fieldsOf(name);
    for (const rec of view.all(name)) {
      try { validateRecord(name, rec); } catch (e) { problems.push({ collection: name, id: rec.id, problem: e.message }); continue; }
      for (const [k, f] of Object.entries(fields)) if (f.type === 'ref' && rec[k] && !view.get(f.ref, rec[k])) problems.push({ collection: name, id: rec.id, problem: `Referencia rota: ${k}` });
    }
  }
  return problems;
}
export { sha256, writeFileDurable };
