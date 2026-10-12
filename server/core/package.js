// Paquete portable: colecciones canónicas (JSON), una tabla CSV por entidad o relación, diccionario de
// datos, adjuntos y manifiesto de integridad. No incluye sesiones, contraseñas ni otros secretos.
import JSZip from 'jszip';
import { ENTITIES, COMMON, SCHEMA_VERSION, fieldsOf, parseType } from '../domain/schema.js';
import { toCsv, fromCsv } from './csv.js';
import { Store, sha256 } from './store.js';
import { StorageError } from './errors.js';

const TYPE_LABEL = { uuid: 'Identificador (UUID, texto)', ref: 'Referencia', str: 'Texto', text: 'Texto largo', secret: 'Texto restringido', int: 'Entero', bool: 'Booleano (true/false)', date: 'Fecha de operación (AAAA-MM-DD)', month: 'Periodo (AAAA-MM)', instant: 'Instante (ISO-8601 con zona, UTC)', money: 'Decimal(18,2)', qty: 'Decimal(18,4)', price: 'Decimal(18,4)', pct: 'Decimal(9,4)', enum: 'Catálogo de estados', json: 'Objeto anidado declarado (JSON)' };
export function dictionary() {
  return Object.values(ENTITIES).map((e) => ({ collection: e.name, label: e.label, group: e.group, immutable: !!e.immutable, unique: e.unique || [], fields: Object.entries(e.noCommon ? { id: 'uuid!', ...e.fields } : { ...COMMON, ...e.fields }).map(([name, spec]) => { const t = parseType(spec); return { name, type: t.type, typeLabel: TYPE_LABEL[t.type], required: t.required, ref: t.ref || null, values: t.values || null }; }) }));
}
export function dictionaryMarkdown() {
  const out = ['# Diccionario de datos', '', `Versión de esquema: ${SCHEMA_VERSION}. Generado a partir de \`server/domain/schema.js\` (fuente única).`, '', 'Convenciones: identificadores UUID como texto; fechas de operación `AAAA-MM-DD`; instantes ISO-8601 en UTC; decimales con punto, sin separador de miles; nulo = campo vacío.', ''];
  let group = null;
  for (const e of dictionary()) { if (e.group !== group) { group = e.group; out.push(`## ${group[0].toUpperCase()}${group.slice(1)}`, ''); }
    out.push(`### ${e.label} — \`${e.collection}\`${e.immutable ? ' · histórico inmutable' : ''}`, ''); if (e.unique.length) out.push(`Unicidad lógica: ${e.unique.map((u) => `(${u.join(', ')})`).join('; ')}.`, '');
    out.push('| Campo | Tipo | Obligatorio | Detalle |', '|---|---|---|---|'); for (const f of e.fields) out.push(`| \`${f.name}\` | ${f.typeLabel} | ${f.required ? 'Sí' : 'No'} | ${f.ref ? `→ \`${f.ref}.id\`` : f.values ? f.values.join(', ') : ''} |`); out.push(''); }
  return out.join('\n');
}
const csvColumns = (name) => Object.entries(fieldsOf(name)).map(([key, f]) => ({ key, label: key, type: ['money', 'qty', 'price', 'pct', 'int', 'json'].includes(f.type) ? f.type : f.type === 'bool' ? 'bool' : 'text' }));

export async function exportPackage(store, { by = 'sistema' } = {}) {
  const zip = new JSZip(); const cols = store.dump(); const files = {}; const counts = {};
  const put = (name, data) => { const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'); zip.file(name, buf); files[name] = { sha256: sha256(buf), bytes: buf.length }; };
  for (const name of Object.keys(ENTITIES)) { const records = cols.get(name) || []; counts[name] = records.length; put(`colecciones/${name}.json`, JSON.stringify({ collection: name, records })); put(`csv/${name}.csv`, toCsv(records, csvColumns(name))); }
  let blobs = 0; for (const a of cols.get('attachments') || []) for (const h of [a.sha256, a.thumbSha256]) if (h && store.hasBlob(h) && !files[`adjuntos/${h}`]) { put(`adjuntos/${h}`, store.readBlob(h)); blobs++; }
  put('diccionario/diccionario-de-datos.md', dictionaryMarkdown()); put('diccionario/diccionario-de-datos.json', JSON.stringify(dictionary(), null, 1));
  put('LEEME.txt', ['Paquete portable de DCL Instalaciones', '', 'colecciones/  JSON canónico por entidad (fuente para migrar).', 'csv/          Una tabla CSV UTF-8 por entidad o relación: separador coma, comillas dobles duplicadas, saltos CRLF,', '              fechas AAAA-MM-DD, instantes ISO con zona, decimales con punto, booleanos true/false, nulo = vacío.', '              Un texto que comienza con = + - @ o apóstrofo lleva un apóstrofo antepuesto (protección para hojas de cálculo);', '              el importador propio lo retira. Los importes numéricos no se alteran.', 'adjuntos/     Archivos binarios nombrados por su hash SHA-256.', 'diccionario/  Diccionario de datos.', 'manifiesto.json  Versión de esquema, fecha, conteos y sumas de verificación.', '', 'No contiene contraseñas ni sesiones.'].join('\r\n'));
  const manifest = { format: 'dcl-paquete', schemaVersion: SCHEMA_VERSION, dataset: store.dataset, organizationId: store.organizationId, exportedAt: new Date().toISOString(), exportedBy: by, generation: store.manifest.generation, auditHead: store.manifest.auditHead, counts, attachments: blobs, files };
  zip.file('manifiesto.json', JSON.stringify(manifest, null, 1));
  return { buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), manifest };
}
// Lee y verifica un paquete. source: 'csv' reconstruye desde las tablas CSV; 'json' desde las colecciones canónicas.
export async function readPackage(buffer, { source = 'json' } = {}) {
  const zip = await JSZip.loadAsync(buffer); const mf = zip.file('manifiesto.json'); if (!mf) throw new StorageError('El archivo no es un paquete portable.');
  const manifest = JSON.parse(await mf.async('string')); if (manifest.format !== 'dcl-paquete') throw new StorageError('Formato de paquete desconocido.');
  if (manifest.schemaVersion !== SCHEMA_VERSION) throw new StorageError(`El paquete usa la versión de esquema ${manifest.schemaVersion}; esta aplicación espera ${SCHEMA_VERSION}. Ejecute el migrador correspondiente.`);
  const problems = []; const data = {};
  for (const [name, info] of Object.entries(manifest.files)) { const f = zip.file(name); if (!f) { problems.push(`${name}: falta en el paquete`); continue; } const buf = await f.async('nodebuffer'); if (sha256(buf) !== info.sha256) problems.push(`${name}: suma de verificación distinta`); data[name] = buf; }
  if (problems.length) throw new StorageError('El paquete no supera la verificación de integridad.', { problems });
  const cols = new Map();
  for (const name of Object.keys(ENTITIES)) { let records;
    if (source === 'csv') { const types = fieldsOf(name); records = fromCsv(data[`csv/${name}.csv`].toString('utf8'), (k) => { const t = types[k]?.type; return ['money', 'qty', 'price', 'pct', 'int', 'json', 'bool'].includes(t) ? t : 'text'; }); }
    else records = JSON.parse(data[`colecciones/${name}.json`].toString('utf8')).records;
    if (records.length !== manifest.counts[name]) throw new StorageError(`${name}: el conteo (${records.length}) no coincide con el manifiesto (${manifest.counts[name]}).`);
    cols.set(name, records); }
  const blobs = Object.entries(data).filter(([n]) => n.startsWith('adjuntos/')).map(([n, buf]) => ({ hash: n.slice(9), buf }));
  return { manifest, cols, blobs };
}
// Carga un paquete en un conjunto AISLADO (nunca sobre la operación vigente por omisión).
export async function importPackageInto(buffer, targetDir, opts = {}) {
  const p = await readPackage(buffer, opts);
  const store = Store.open(targetDir, { create: { dataset: p.manifest.dataset, organizationId: p.manifest.organizationId } });
  if (store.manifest.generation > 1) { store.close(); throw new StorageError('La carpeta destino ya contiene datos; use una carpeta vacía.'); }
  for (const b of p.blobs) store.putBlob(b.buf);
  store.replaceAll(p.cols, { auditHead: p.manifest.auditHead });
  return { store, manifest: p.manifest };
}
