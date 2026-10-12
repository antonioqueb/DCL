// Catálogos y datos maestros: alta, edición con control de versión y desactivación (nunca eliminación).
import { listResult } from '../core/http.js';
import { invalid, notFound, forbidden } from '../core/errors.js';
import { ENTITIES, fieldsOf, normalizeName } from '../domain/schema.js';
import { label, pick, scopedWorks } from './common.js';

const ST = { activo: 'Activo', inactivo: 'Inactivo' };
const yes = () => true;
// view/manage: permiso requerido · fields: campos editables · secret: campos que exigen otro permiso
const R = {
  units: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['code', 'name', 'kind', 'decimals', 'status'], columns: [['code', 'Código'], ['name', 'Unidad'], ['kind', 'Tipo'], ['status', 'Estado', 'status', ST]] },
  costCategories: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['code', 'name', 'class', 'parentId', 'status'], columns: [['code', 'Código'], ['name', 'Categoría'], ['class', 'Clasificación'], ['parent', 'Depende de'], ['status', 'Estado', 'status', ST]], extra: (db, r) => ({ parent: label(db, 'costCategories', r.parentId) }) },
  concepts: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['code', 'name', 'catalog', 'family', 'unitId', 'evidencePolicy', 'hiddenWork', 'status', 'validFrom', 'validTo'], normalize: 'name', prefix: 'C', columns: [['code', 'Código'], ['name', 'Concepto'], ['catalog', 'Catálogo', 'status', { contratacion: 'Contratación', comercial: 'Comercial' }], ['family', 'Familia'], ['unit', 'Unidad'], ['evidencePolicy', 'Evidencia', 'status', { opcional: 'Opcional', requerida: 'Requerida' }], ['status', 'Estado', 'status', ST]], extra: (db, r) => ({ unit: label(db, 'units', r.unitId, 'code'), aliases: db.by('conceptAliases', 'conceptId', r.id).map((a) => a.alias) }) },
  conceptLinks: { view: 'rates.client.view', manage: 'catalogs.manage', fields: ['contractConceptId', 'commercialConceptId', 'note', 'validated'], columns: [['contract', 'Concepto de contratación'], ['commercial', 'Concepto comercial'], ['note', 'Nota'], ['validated', 'Validada', 'bool']], extra: (db, r) => ({ contract: label(db, 'concepts', r.contractConceptId), commercial: label(db, 'concepts', r.commercialConceptId) }) },
  detailLevels: { view: 'catalogs.view', manage: 'rates.manage', fields: ['code', 'name', 'costAmount', 'saleAmount', 'currency', 'note', 'status'], columns: [['code', 'Código'], ['name', 'Nivel'], ['costAmount', 'Pago al contratista', 'money'], ['saleAmount', 'Cobro al cliente', 'money'], ['status', 'Estado', 'status', ST]], hide: (acc, r) => ({ ...r, costAmount: acc.can('rates.contract.view') ? r.costAmount : undefined, saleAmount: acc.can('rates.client.view') ? r.saleAmount : undefined }) },
  adjustmentReasons: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['code', 'name', 'appliesTo', 'status'], columns: [['code', 'Código'], ['name', 'Motivo'], ['appliesTo', 'Aplica a'], ['status', 'Estado', 'status', ST]] },
  voucherTypes: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['code', 'name', 'hasTaxBreakdown', 'status'], columns: [['code', 'Código'], ['name', 'Tipo de comprobante'], ['hasTaxBreakdown', 'Desglosa impuestos', 'bool'], ['status', 'Estado', 'status', ST]] },
  paymentMethods: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['code', 'name', 'kind', 'status'], columns: [['code', 'Código'], ['name', 'Medio'], ['kind', 'Tipo'], ['status', 'Estado', 'status', ST]] },
  accounts: { view: 'cash.view', manage: 'cash.manage', fields: ['code', 'name', 'kind', 'currency', 'openingBalance', 'openingDate', 'status'], lockAfterUse: ['openingBalance', 'openingDate', 'currency', 'kind'], columns: [['code', 'Código'], ['name', 'Cuenta'], ['kind', 'Tipo', 'status', { efectivo: 'Efectivo', banco: 'Banco' }], ['openingBalance', 'Saldo inicial', 'money'], ['openingDate', 'Fecha del saldo', 'date'], ['status', 'Estado', 'status', ST]] },
  parties: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['code', 'name', 'legalName', 'isClient', 'isSupplier', 'isContractor', 'status', 'validFrom', 'validTo'], secret: { taxId: 'banking.view', restrictedNotes: 'banking.view' }, normalize: 'name', prefix: 'P', columns: [['code', 'Código'], ['name', 'Nombre'], ['legalName', 'Razón social'], ['roles', 'Relación'], ['status', 'Estado', 'status', ST]], extra: (db, r) => ({ roles: [r.isClient && 'Cliente', r.isSupplier && 'Proveedor', r.isContractor && 'Contratista'].filter(Boolean).join(', '), aliases: db.by('partyAliases', 'partyId', r.id).map((a) => a.alias), contacts: db.by('contacts', 'partyId', r.id).map((x) => pick(x, ['id', 'name', 'position', 'phone', 'email', 'isRepresentative'])) }) },
  contacts: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['partyId', 'name', 'position', 'phone', 'email', 'isRepresentative', 'status'], columns: [['party', 'Empresa'], ['name', 'Contacto'], ['position', 'Cargo'], ['phone', 'Teléfono'], ['email', 'Correo'], ['status', 'Estado', 'status', ST]], extra: (db, r) => ({ party: label(db, 'parties', r.partyId) }) },
  partyBankAccounts: { view: 'banking.view', manage: 'banking.view', fields: ['partyId', 'bank', 'holder', 'accountNumber', 'clabe', 'status'], columns: [['party', 'Titular registrado'], ['bank', 'Banco'], ['holder', 'Nombre en la cuenta'], ['masked', 'Cuenta'], ['status', 'Estado', 'status', ST]], extra: (db, r) => ({ party: label(db, 'parties', r.partyId), masked: r.clabe ? `••••${r.clabe.slice(-4)}` : r.accountNumber ? `••••${r.accountNumber.slice(-4)}` : null }) },
  workers: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['code', 'name', 'contractorId', 'status', 'docsPending', 'payAccountPending'], normalize: 'name', prefix: 'T', columns: [['code', 'Código'], ['name', 'Trabajador'], ['contractor', 'Contratista'], ['alerts', 'Alertas'], ['status', 'Estado', 'status', ST]], extra: (db, r) => ({ contractor: label(db, 'parties', r.contractorId), alerts: [r.docsPending && 'Documentación pendiente', r.payAccountPending && 'Cuenta de pago pendiente'].filter(Boolean).join(' · ') || null }) },
  crews: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['code', 'name', 'contractorId', 'status'], prefix: 'CU', columns: [['code', 'Código'], ['name', 'Cuadrilla'], ['contractor', 'Contratista'], ['members', 'Integrantes vigentes', 'int'], ['status', 'Estado', 'status', ST]], extra: (db, r) => ({ contractor: label(db, 'parties', r.contractorId), members: db.by('crewMemberships', 'crewId', r.id).filter((m) => !m.validTo).length }) },
  crewMemberships: { view: 'catalogs.view', manage: 'catalogs.manage', fields: ['crewId', 'workerId', 'validFrom', 'validTo'], columns: [['crew', 'Cuadrilla'], ['worker', 'Trabajador'], ['validFrom', 'Desde', 'date'], ['validTo', 'Hasta', 'date']], extra: (db, r) => ({ crew: label(db, 'crews', r.crewId), worker: label(db, 'workers', r.workerId) }) },
  personnelNotices: { view: 'personnel.view', manage: 'personnel.view', fields: ['workerId', 'kind', 'date', 'note', 'attachmentId', 'status'], columns: [['date', 'Fecha', 'date'], ['worker', 'Trabajador'], ['kind', 'Aviso', 'status', { alta: 'Alta', baja: 'Baja', pendiente: 'Pendiente' }], ['note', 'Nota'], ['status', 'Seguimiento', 'status', { abierto: 'Abierto', atendido: 'Atendido' }]], extra: (db, r) => ({ worker: label(db, 'workers', r.workerId) }) },
  supplies: { view: 'catalogs.view', manage: 'supplies.manage', fields: ['code', 'name', 'unitId', 'status'], prefix: 'I', columns: [['code', 'Código'], ['name', 'Insumo'], ['unit', 'Unidad'], ['status', 'Estado', 'status', ST]], extra: (db, r) => ({ unit: label(db, 'units', r.unitId, 'code') }) },
  authorizationLimits: { view: 'config.manage', manage: 'config.manage', fields: ['roleId', 'userId', 'kind', 'maxAmount', 'currency', 'note'], deletable: true, columns: [['who', 'Rol o persona'], ['kind', 'Tipo de autorización'], ['maxAmount', 'Importe máximo', 'money'], ['note', 'Nota']], extra: (db, r) => ({ who: label(db, 'roles', r.roleId) || label(db, 'users', r.userId) }) },
  pendingDecisions: { view: 'decisions.view', manage: 'config.manage', fields: ['status', 'resolution', 'decidedByName', 'decidedAt'], noCreate: true, columns: [['code', 'Clave'], ['topic', 'Tema'], ['question', 'Decisión que debe validar Lucía'], ['provisional', 'Comportamiento provisional'], ['status', 'Estado', 'status', { pendiente: 'Pendiente', validada: 'Validada' }], ['resolution', 'Resolución']] },
};
export const CATALOGS = R;
const cols = (r) => r.columns.map(([key, lbl, type, values]) => ({ key, label: lbl, type: type || 'text', values }));

function serialize(c, name, rec) {
  const def = R[name]; const out = { ...rec };
  for (const [k, f] of Object.entries(fieldsOf(name))) if (f.type === 'secret') { const p = def.secret?.[k] || def.view; if (!c.acc.can(p)) delete out[k]; }
  Object.assign(out, def.extra ? def.extra(c.db, rec) : {});
  return def.hide ? def.hide(c.acc, out) : out;
}
function clean(name, body, acc) {
  const def = R[name]; const data = pick(body, def.fields);
  for (const [k, p] of Object.entries(def.secret || {})) if (body[k] !== undefined) { if (!acc.can(p)) throw forbidden('No tiene permiso para modificar datos fiscales o bancarios.'); data[k] = body[k]; }
  if (def.normalize && data[def.normalize] !== undefined) data.normalizedName = normalizeName(data[def.normalize]);
  for (const [k, f] of Object.entries(fieldsOf(name))) if (data[k] === '') data[k] = null; else if (f.type === 'bool' && data[k] !== undefined && data[k] !== null) data[k] = !!data[k]; else if (f.type === 'int' && typeof data[k] === 'string') data[k] = parseInt(data[k], 10);
  return data;
}
function nextCode(tx, name, prefix) { let n = tx.count(name) + 1; let code; do { code = `${prefix}${String(n++).padStart(3, '0')}`; } while (tx.by(name, 'code', code).length); return code; }
function checkAlias(tx, name, data, id) {
  if (name === 'parties' && data.normalizedName) { const a = tx.by('partyAliases', 'normalizedAlias', data.normalizedName).find((x) => x.partyId !== id); if (a) throw invalid(`"${data.name}" ya está registrado como alias de ${label(tx, 'parties', a.partyId)}.`, 'name', 'Use el registro existente en lugar de crear un duplicado.'); }
}

export function register(app) {
  const def = (c) => { const r = R[c.params.name]; if (!r || c.acc.audience !== 'interno') throw notFound('El catálogo'); return r; };
  app.get('/api/catalog/:name', (c) => {
    const r = def(c); c.acc.require(r.view);
    let rows = c.db.all(c.params.name).filter((x) => !x.archivedAt);
    if (c.query.active === '1') rows = rows.filter((x) => x.status === undefined || x.status === 'activo');
    return listResult(c, rows.map((x) => serialize(c, c.params.name, x)), cols(r), { defaultSort: r.columns[0][0], name: c.params.name });
  });
  app.get('/api/catalog/:name/:id', (c) => { const r = def(c); c.acc.require(r.view); const x = c.db.get(c.params.name, c.params.id); if (!x) throw notFound(); return serialize(c, c.params.name, x); });
  app.post('/api/catalog/:name', (c) => c.tx(`alta_${c.params.name}`, (tx) => {
    const r = def(c); c.acc.require(r.manage); if (r.noCreate) throw forbidden('Este registro no se crea manualmente.');
    const data = clean(c.params.name, c.body, c.acc);
    if (r.prefix && !data.code) data.code = nextCode(tx, c.params.name, r.prefix);
    if (fieldsOf(c.params.name).status && !data.status) data.status = fieldsOf(c.params.name).status.values[0];
    checkAlias(tx, c.params.name, data, null);
    const rec = tx.insert(c.params.name, data);
    for (const alias of c.body.aliases || []) addAlias(tx, c.params.name, rec.id, alias);
    return { id: rec.id, code: rec.code };
  }));
  app.patch('/api/catalog/:name/:id', (c) => c.tx(`edicion_${c.params.name}`, (tx) => {
    const r = def(c); c.acc.require(r.manage);
    const data = clean(c.params.name, c.body, c.acc); const cur = tx.must(c.params.name, c.params.id);
    if (r.lockAfterUse && c.params.name === 'accounts' && tx.by('cashMovements', 'accountId', cur.id).length) for (const k of r.lockAfterUse) if (data[k] !== undefined && String(data[k]) !== String(cur[k])) throw invalid('La cuenta ya tiene movimientos: su saldo inicial no se edita. Registre un ajuste de saldo visible y autorizado.', k);
    checkAlias(tx, c.params.name, data, cur.id);
    // Cambiar el nombre conserva el anterior como alias histórico.
    if (r.normalize && data.name && data.name !== cur.name && ['parties', 'concepts'].includes(c.params.name)) addAlias(tx, c.params.name, cur.id, cur.name);
    const rec = tx.update(c.params.name, cur.id, data, { expectedVersion: c.body.recordVersion });
    for (const alias of c.body.aliases || []) addAlias(tx, c.params.name, rec.id, alias);
    return { id: rec.id, recordVersion: rec.recordVersion };
  }));
  app.del('/api/catalog/:name/:id', (c) => c.tx(`baja_${c.params.name}`, (tx) => {
    const r = def(c); c.acc.require(r.manage); if (!r.deletable) throw forbidden('Los registros usados se desactivan; no se eliminan.');
    tx.archive(c.params.name, c.params.id); return { ok: true };
  }));

  // Opciones para formularios, ya filtradas por alcance.
  app.get('/api/options', (c) => {
    const db = c.db, acc = c.acc; const want = new Set((c.query.sets || '').split(',')); const out = {};
    const act = (x) => !x.archivedAt && (x.status === undefined || x.status === 'activo');
    const internal = acc.audience === 'interno';
    if (want.has('works')) out.works = scopedWorks(db, acc).map((w) => ({ id: w.id, label: `${w.code} · ${w.name}`, status: w.status, clientId: internal ? w.clientId : undefined }));
    if (!internal) return out;
    if (want.has('units')) out.units = db.all('units').filter(act).map((u) => ({ id: u.id, label: u.code, kind: u.kind }));
    if (want.has('concepts')) out.concepts = db.all('concepts').filter(act).map((x) => ({ id: x.id, label: x.name, catalog: x.catalog, unitId: x.unitId, unit: label(db, 'units', x.unitId, 'code'), unitKind: label(db, 'units', x.unitId, 'kind'), evidence: x.evidencePolicy === 'requerida' || !!x.hiddenWork }));
    if (want.has('contractors')) out.contractors = db.where('parties', (p) => act(p) && p.isContractor).map((p) => ({ id: p.id, label: p.name }));
    if (want.has('clients')) out.clients = db.where('parties', (p) => act(p) && p.isClient).map((p) => ({ id: p.id, label: p.name }));
    if (want.has('suppliers')) out.suppliers = db.where('parties', (p) => act(p) && p.isSupplier).map((p) => ({ id: p.id, label: p.name }));
    if (want.has('parties')) out.parties = db.where('parties', act).map((p) => ({ id: p.id, label: p.name }));
    if (want.has('workers')) out.workers = db.where('workers', act).map((p) => ({ id: p.id, label: p.name, contractorId: p.contractorId }));
    if (want.has('crews')) out.crews = db.where('crews', act).map((p) => ({ id: p.id, label: p.name, contractorId: p.contractorId }));
    if (want.has('accounts') && acc.can('cash.view')) out.accounts = db.where('accounts', act).map((a) => ({ id: a.id, label: a.name, kind: a.kind }));
    if (want.has('methods')) out.methods = db.where('paymentMethods', act).map((a) => ({ id: a.id, label: a.name, kind: a.kind }));
    if (want.has('categories')) out.categories = db.where('costCategories', act).map((a) => ({ id: a.id, label: a.name, class: a.class, parentId: a.parentId }));
    if (want.has('voucherTypes')) out.voucherTypes = db.where('voucherTypes', act).map((a) => ({ id: a.id, label: a.name }));
    if (want.has('supplies')) out.supplies = db.where('supplies', act).map((a) => ({ id: a.id, label: a.name, unitId: a.unitId, unit: label(db, 'units', a.unitId, 'code') }));
    if (want.has('reasons')) out.reasons = db.where('adjustmentReasons', act).map((a) => ({ id: a.id, label: a.name }));
    if (want.has('detailLevels')) out.detailLevels = db.where('detailLevels', act).map((a) => ({ id: a.id, label: a.name }));
    if (want.has('periods')) out.periods = db.all('weekPeriods').sort((a, b) => (a.code < b.code ? 1 : -1)).map((p) => ({ id: p.id, label: `${p.code} (${p.startDate} a ${p.endDate})`, status: p.status }));
    if (want.has('users') && (acc.can('works.manage') || acc.can('users.manage'))) out.users = db.where('users', act).map((u) => ({ id: u.id, label: u.name }));
    if (want.has('roles') && acc.can('users.manage')) out.roles = db.all('roles').map((u) => ({ id: u.id, label: u.name, audience: u.audience }));
    return out;
  });

  // Tarifas: versiones con vigencia; cada circuito tiene su propio permiso de consulta.
  const RATE_COLS = [{ key: 'circuit', label: 'Circuito', type: 'status', values: { contratacion: 'Pago a contratista', comercial: 'Cobro a cliente' } }, { key: 'concept', label: 'Concepto' }, { key: 'unit', label: 'Unidad' }, { key: 'scope', label: 'Alcance' }, { key: 'price', label: 'Precio', type: 'money' }, { key: 'validFrom', label: 'Vigente desde', type: 'date' }, { key: 'validTo', label: 'Hasta', type: 'date' }, { key: 'status', label: 'Estado', type: 'status', values: { vigente: 'Vigente', inactiva: 'Inactiva' } }];
  const canRate = (acc, r) => acc.can(r.circuit === 'contratacion' ? 'rates.contract.view' : 'rates.client.view');
  app.get('/api/rates', (c) => {
    if (c.acc.audience !== 'interno') throw notFound();
    const rows = c.db.where('rates', (r) => !r.archivedAt && canRate(c.acc, r)).map((r) => ({ ...r, concept: label(c.db, 'concepts', r.conceptId), unit: label(c.db, 'units', r.unitId, 'code'), scope: [label(c.db, 'works', r.workId), label(c.db, 'parties', r.contractorId)].filter(Boolean).join(' · ') || 'General' }));
    return listResult(c, rows, RATE_COLS, { defaultSort: 'concept', name: 'tarifas' });
  });
  // Una tarifa no se edita: se crea una nueva versión y la anterior cierra su vigencia.
  app.post('/api/rates', (c) => c.tx('alta_tarifa', (tx) => {
    c.acc.require('rates.manage'); const b = c.body;
    for (const k of ['circuit', 'conceptId', 'price', 'validFrom']) if (!b[k]) throw invalid(`Falta ${k} de la tarifa.`, k);
    const concept = tx.must('concepts', b.conceptId);
    if ((b.circuit === 'contratacion') !== (concept.catalog === 'contratacion')) throw invalid('El concepto pertenece al otro catálogo. El precio del cliente y el del contratista se mantienen por separado.', 'conceptId');
    const unitId = b.unitId || concept.unitId;
    for (const o of tx.by('rates', 'conceptId', b.conceptId)) if (o.circuit === b.circuit && o.unitId === unitId && (o.workId || null) === (b.workId || null) && (o.contractorId || null) === (b.contractorId || null) && o.status === 'vigente' && !o.validTo && o.validFrom < b.validFrom) tx.update('rates', o.id, { validTo: prevDay(b.validFrom) });
    const r = tx.insert('rates', { circuit: b.circuit, conceptId: b.conceptId, unitId, workId: b.workId || null, contractorId: b.contractorId || null, price: b.price, currency: b.currency || 'MXN', validFrom: b.validFrom, validTo: b.validTo || null, includes: b.includes || null, status: 'vigente', exceptional: false, reason: b.reason || null });
    return { id: r.id };
  }));
  app.post('/api/rates/:id/deactivate', (c) => c.tx('baja_tarifa', (tx) => { c.acc.require('rates.manage'); tx.update('rates', c.params.id, { status: 'inactiva' }); return { ok: true }; }));
}
import { addDays } from '../domain/dates.js';
const prevDay = (s) => addDays(s, -1);
function addAlias(tx, name, id, alias) {
  const n = normalizeName(alias); if (!n) return;
  if (name === 'parties') { if (!tx.by('partyAliases', 'normalizedAlias', n).length && !tx.by('parties', 'normalizedName', n).some((p) => p.id !== id)) tx.insert('partyAliases', { partyId: id, alias, normalizedAlias: n }); }
  else if (name === 'concepts') { if (!tx.by('conceptAliases', 'conceptId', id).some((a) => a.normalizedAlias === n)) tx.insert('conceptAliases', { conceptId: id, alias, normalizedAlias: n }); }
}
export { yes, ENTITIES };
