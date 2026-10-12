// Plataforma: permisos por API, concurrencia, persistencia, respaldo, paquete portable, documentos e importación.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { startEnv, scenario, PASSWORD } from './helpers.js';
import { TINY_JPG } from '../server/seed/client.js';
import { Store, validateAll } from '../server/core/store.js';
import { AuthStore } from '../server/core/auth.js';
import { createBackup, restoreInto, readBackup } from '../server/core/backup.js';
import { exportPackage, importPackageInto } from '../server/core/package.js';
import { toCsv, fromCsv } from '../server/core/csv.js';
import { layout } from '../server/pdf/render.js';
import { fmtMoney } from '../server/domain/decimal.js';

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
async function weekFlow(env, S) { // estimación autorizada, cerrada y con un pago confirmado
  const L = S.lucia, sup = await env.as('supervisor'), tes = await env.as('tesoreria');
  const e = await sup.post('/api/progress', { workId: S.work, locationId: S.sotano, conceptId: S.piso, contractorId: S.contractor, executionDate: '2026-08-27', qty: '80.52', submit: true });
  const ph = await sup.upload('f.jpg', TINY_JPG, { kind: 'foto', workId: S.work }); await sup.post('/api/evidence', { attachmentId: ph.id, objectType: 'progressEntry', objectId: e.id });
  await L.post(`/api/progress/${e.id}/review`, { decision: 'validar' });
  const est = await L.post('/api/c-estimates', { workId: S.work, contractorId: S.contractor, periodId: S.period });
  await L.post(`/api/c-estimates/${est.id}/generate`, {}); await L.post(`/api/c-estimates/${est.id}/transition`, { to: 'revision_interna' });
  const au = await L.post(`/api/c-estimates/${est.id}/authorize`, { exceptionReason: 'Prueba sin conformidad' });
  const close = await L.post('/api/closes', { periodId: S.period });
  const pay = await tes.post('/api/disbursements', { date: '2026-08-29', accountId: S.cash, methodId: S.method.efectivo, amount: '20000', applications: [{ obligationId: au.obligationId, amount: '20000' }] });
  await L.post(`/api/disbursements/${pay.id}/authorize`, {}); const rc = await tes.upload('r.jpg', TINY_JPG, { kind: 'comprobante' }); await tes.post(`/api/disbursements/${pay.id}/confirm`, { receiptAttachmentId: rc.id });
  return { entry: e.id, est: est.id, ob: au.obligationId, close: close.id, pay: pay.id, photo: ph.id, receipt: rc.id };
}

test('Criterios 1–3: permisos efectivos por API y descarga directa, por rol y por obra', async (t) => {
  const env = await startEnv(); t.after(() => env.stop()); const S = await scenario(env); const F = await weekFlow(env, S);
  const anon = env.anon(); for (const u of ['/api/works', '/api/progress', `/api/attachments/${F.photo}/content`, '/api/audit', '/api/admin/backups']) assert.equal((await anon.try('GET', u)).status, 401, u);
  // Una solicitud de escritura sin el encabezado de la aplicación se rechaza.
  assert.equal((await fetch(`${env.base}/api/logout`, { method: 'POST' })).status, 403);
  const matrix = { // [usuario, [ruta, estado esperado]…]
    supervisor: [['/api/c-estimates/' + F.est, 404], ['/api/obligations', 0], ['/api/rates', 200, 0], ['/api/expenses', 404], ['/api/results', 404], ['/api/users', 403], ['/api/audit', 403], [`/api/works/${S.work2}`, 404], [`/api/attachments/${F.receipt}/content`, 404], ['/api/receivables', 404], ['/api/cash/accounts', 404]],
    coordinacion: [[`/api/works/${S.work}`, 200], [`/api/works/${S.work2}`, 404], ['/api/results', 404], ['/api/expenses', 404], ['/api/disbursements', 0], ['/api/users', 403]],
    auxiliar: [['/api/expenses', 200], ['/api/results', 404], ['/api/rates', 200, 0], ['/api/c-estimates', 0], ['/api/catalog/partyBankAccounts', 403], ['/api/catalog/personnelNotices', 403], ['/api/audit', 403]],
    tesoreria: [['/api/obligations', 200], ['/api/results', 404], ['/api/progress', 0], ['/api/catalog/partyBankAccounts', 200], ['/api/users', 403]],
    admin: [['/api/users', 200], ['/api/results', 404], ['/api/obligations', 0], ['/api/c-estimates', 0], ['/api/expenses', 404], ['/api/audit', 403]],
    auditor: [['/api/audit', 200], ['/api/c-estimates/' + F.est, 200], ['/api/users', 403]],
    contratista: [['/api/c-estimates/' + F.est, 200], ['/api/works', 200], ['/api/expenses', 404], ['/api/results', 404], ['/api/k-estimates', 0], [`/api/works/${S.work}/budget-tracking`, 404], ['/api/catalog/parties', 404], ['/api/additionals', 404], [`/api/attachments/${F.photo}/content`, 200], [`/api/attachments/${F.receipt}/content`, 200], ['/api/audit', 403], ['/api/closes/board?periodId=' + S.period, 404]],
    contratista2: [['/api/c-estimates/' + F.est, 404], [`/api/obligations/${F.ob}`, 404], [`/api/disbursements/${F.pay}`, 404], [`/api/attachments/${F.photo}/content`, 404], [`/api/attachments/${F.receipt}/content`, 404], [`/api/attachments/${F.photo}/thumb`, 404]],
    cliente: [['/api/c-estimates', 0], ['/api/expenses', 404], ['/api/results', 404], [`/api/works/${S.work}/summary`, 404], [`/api/attachments/${F.photo}/content`, 404], ['/api/catalog/workers', 404], ['/api/obligations', 0], ['/api/additionals', 404], ['/api/progress', 404]],
    cliente2: [[`/api/works/${S.work}`, 404]],
  };
  for (const [u, checks] of Object.entries(matrix)) { const c = await env.as(u);
    for (const [url, status, total] of checks) { const r = await c.try('GET', url); if (status === 0) assert.ok(r.status === 404 || r.status === 403 || r.data.total === 0, `${u} ${url} → ${r.status} total ${r.data?.total}`); else { assert.equal(r.status, status, `${u} ${url}`); if (total !== undefined) assert.equal(r.data.total, total, `${u} ${url} total`); } } }
  // Acciones prohibidas por API directa.
  const sup = await env.as('supervisor'), con = await env.as('contratista'), tes = await env.as('tesoreria'), adm = await env.as('admin');
  assert.equal((await sup.try('POST', `/api/c-estimates/${F.est}/authorize`, {})).status, 403);
  assert.equal((await sup.try('POST', '/api/progress', { workId: S.work2, locationId: S.loc2, conceptId: S.piso, executionDate: '2026-08-27', qty: '1' })).status, 403); // obra no asignada
  assert.equal((await con.try('POST', `/api/c-estimates/${F.est}/authorize`, {})).status, 403);
  assert.equal((await con.try('PATCH', `/api/progress/${F.entry}`, { qty: '999' })).status, 403);
  assert.equal((await tes.try('PATCH', `/api/progress/${F.entry}`, { qty: '999' })).status, 403); // tesorería no modifica cantidades de ejecución
  assert.equal((await tes.try('POST', `/api/progress/${F.entry}/adjustments`, { qtyDelta: '-1', reason: 'cuadrar el pago' })).status, 403);
  assert.equal((await adm.try('POST', `/api/disbursements/${F.pay}/reverse`, { reason: 'no debería poder' })).status, 403); // administración técnica ≠ aprobación financiera
  assert.equal((await adm.try('POST', '/api/closes', { periodId: S.period })).status, 403);
  // Revocar a un usuario invalida su sesión de inmediato.
  const users = await adm.get('/api/users'); const u = users.items.find((x) => x.username === 'auxiliar'); const aux = await env.as('auxiliar');
  assert.equal((await aux.try('GET', '/api/expenses')).status, 200); await adm.patch(`/api/users/${u.id}`, { status: 'inactivo' }); assert.equal((await aux.try('GET', '/api/expenses')).status, 401);
  // Delegación con vigencia: Luis puede autorizar mientras dure; al revocarse, ya no.
  const luis = await env.as('coordinacion'); const luisId = users.items.find((x) => x.username === 'coordinacion').id;
  assert.equal((await luis.try('POST', `/api/c-estimates/${F.est}/reopen`, { reason: 'prueba de delegación' })).status, 403);
  const dg = await S.lucia.post('/api/delegations', { toUserId: luisId, permission: 'cestimates.reopen', workId: S.work, validFrom: '2026-01-01', validTo: '2099-12-31', reason: 'Ausencia de dirección (prueba)' });
  assert.equal((await luis.try('POST', `/api/c-estimates/${F.est}/reopen`, { reason: 'prueba de delegación' })).status, 200);
  await S.lucia.post(`/api/delegations/${dg.id}/revoke`, {}); assert.equal((await luis.try('POST', `/api/c-estimates/${F.est}/reopen`, { reason: 'otra vez' })).status, 403);
  // Límite de autorización configurable (no inventado): con límite definido, se respeta.
  const roles = await adm.get('/api/roles'); await S.lucia.post('/api/catalog/authorizationLimits', { roleId: roles.roles.find((r) => r.code === 'direccion').id, kind: 'pago', maxAmount: '100' });
  const p2 = await tes.post('/api/disbursements', { date: '2026-08-30', accountId: S.cash, methodId: S.method.efectivo, amount: '500', applications: [{ obligationId: F.ob, amount: '500' }] });
  assert.equal((await S.lucia.try('POST', `/api/disbursements/${p2.id}/authorize`, {})).status, 403);
});

test('Criterios 5, 6, 8, 10: acumulados, ajustes negativos, partida sin tarifa y autorización parcial', async (t) => {
  const env = await startEnv(); t.after(() => env.stop()); const S = await scenario(env); const L = S.lucia, sup = await env.as('supervisor'), con = await env.as('contratista');
  const cap = (o) => sup.post('/api/progress', { workId: S.work, contractorId: S.contractor, submit: true, ...o });
  const a = await cap({ locationId: S.pb, conceptId: S.canto, executionDate: '2026-08-24', mode: 'acumulado', qty: '10' }); await L.post(`/api/progress/${a.id}/review`, { decision: 'validar' });
  const b = await cap({ locationId: S.pb, conceptId: S.canto, executionDate: '2026-08-26', mode: 'acumulado', qty: '16.5' });
  let d = await L.get(`/api/progress/${b.id}`); assert.equal(d.qty, '6.5000'); assert.equal(d.baseCumulative, '10.0000');
  // Otra ubicación no es comparable: su acumulado empieza en cero.
  const o = await cap({ locationId: S.sotano, conceptId: S.canto, executionDate: '2026-08-26', mode: 'acumulado', qty: '4' }); assert.equal((await L.get(`/api/progress/${o.id}`)).qty, '4.0000');
  // Un acumulado menor al validado se rechaza; una cantidad negativa ordinaria también.
  assert.equal((await sup.try('POST', '/api/progress', { workId: S.work, locationId: S.pb, conceptId: S.canto, executionDate: '2026-08-27', mode: 'acumulado', qty: '8' })).status, 422);
  assert.equal((await sup.try('POST', '/api/progress', { workId: S.work, locationId: S.pb, conceptId: S.canto, executionDate: '2026-08-27', qty: '-3' })).status, 422);
  assert.equal((await sup.try('POST', '/api/progress', { workId: S.work, locationId: S.pb, conceptId: S.canto, executionDate: '2099-01-01', qty: '3' })).status, 422);
  // Evidencia obligatoria (trabajo que queda oculto): no se valida sin fotografía o excepción autorizada.
  const im = await cap({ locationId: S.pb, conceptId: S.imper, executionDate: '2026-08-26', qty: '12' });
  assert.equal((await L.try('POST', `/api/progress/${im.id}/review`, { decision: 'validar' })).status, 409);
  await L.post(`/api/progress/${im.id}/evidence-exception`, { reason: 'Se perdió el teléfono del supervisor; verificado en sitio' }); await L.post(`/api/progress/${im.id}/review`, { decision: 'validar' });
  // Ajuste negativo: no borra la medición original.
  await L.post(`/api/progress/${b.id}/review`, { decision: 'validar' }); const adj = await sup.post(`/api/progress/${b.id}/adjustments`, { qtyDelta: '-1.5', reason: 'Se midió dos veces el remate' });
  assert.equal((await sup.try('POST', `/api/progress-adjustments/${adj.id}/decide`, { decision: 'autorizar' })).status, 403);
  await L.post(`/api/progress-adjustments/${adj.id}/decide`, { decision: 'autorizar' }); d = await L.get(`/api/progress/${b.id}`);
  assert.equal(d.qty, '6.5000'); assert.equal(d.effectiveQty, '5.0000'); assert.equal(d.adjustments[0].qtyDelta, '-1.5000');
  // Partida sin tarifa: pendiente de valorar, nunca autorizada con cero. Autorización parcial excluye lo observado.
  const st = await cap({ locationId: S.pb, conceptId: S.sinTarifa, executionDate: '2026-08-27', qty: '1' }); await L.post(`/api/progress/${st.id}/review`, { decision: 'validar' }); await L.post(`/api/progress/${o.id}/review`, { decision: 'validar' });
  const est = await L.post('/api/c-estimates', { workId: S.work, contractorId: S.contractor, periodId: S.period }); await L.post(`/api/c-estimates/${est.id}/generate`, {});
  let doc = await L.get(`/api/c-estimates/${est.id}`); const noRate = doc.items.find((i) => i.pendingValuation); assert.equal(noRate.amount, null); assert.equal(doc.totals.pendingValuation, 1);
  await L.post(`/api/c-estimates/${est.id}/transition`, { to: 'revision_interna' }); await L.post(`/api/c-estimates/${est.id}/transition`, { to: 'revision_contratista' });
  assert.equal((await con.try('POST', `/api/c-estimates/${est.id}/accept`, {})).status, 409); // no se acepta un importe indeterminado
  const cdoc = await con.get(`/api/c-estimates/${est.id}`); const priced = cdoc.items.filter((i) => !i.pendingValuation); const obsItem = priced.find((i) => i.location === 'Sótano 1');
  await con.post(`/api/c-estimates/${est.id}/accept`, { itemIds: priced.filter((i) => i.id !== obsItem.id).map((i) => i.id) });
  await con.post(`/api/c-estimates/${est.id}/observe`, { itemId: obsItem.id, proposedQty: '5', text: 'Faltó un tramo' });
  const au = await L.post(`/api/c-estimates/${est.id}/authorize`, { partial: true }); doc = await L.get(`/api/c-estimates/${est.id}`);
  assert.equal(au.excluded, 2); assert.deepEqual(doc.items.map((i) => i.status).sort(), ['autorizada', 'autorizada', 'diferida', 'diferida']);
  assert.equal(au.authorizedTotal, '2640.00'); // canto en planta baja (10 + 6.5 − 1.5) × 80 + impermeabilización 12 × 120
  // Lo diferido queda disponible para otro documento; no se perdió ni se pagó.
  assert.equal((await L.get(`/api/progress/${o.id}`)).paidQty, '0.0000');
});

test('Criterios 33–35 y recorridos 6 y 7: edición concurrente, idempotencia, segunda instancia y reinicio', async (t) => {
  const env = await startEnv(); t.after(() => env.stop()); const S = await scenario(env); const L = S.lucia, sup = await env.as('supervisor'), luis = await env.as('coordinacion');
  const e = await sup.post('/api/progress', { workId: S.work, locationId: S.pb, conceptId: S.piso, contractorId: S.contractor, executionDate: '2026-08-27', qty: '10', submit: true });
  const v = (await sup.get(`/api/progress/${e.id}`)).recordVersion;
  // Dos personas editan el mismo registro con la misma versión: la segunda recibe el conflicto con ambas versiones.
  assert.equal((await sup.try('PATCH', `/api/progress/${e.id}`, { qty: '11', recordVersion: v })).status, 200);
  const c2 = await luis.try('PATCH', `/api/progress/${e.id}`, { qty: '12', recordVersion: v });
  assert.equal(c2.status, 409); assert.equal(c2.data.error, 'conflicto'); assert.equal(c2.data.current.qty, '11.0000'); assert.equal(c2.data.attempted.qty, '12.0000');
  assert.equal((await L.get(`/api/progress/${e.id}`)).qty, '11.0000'); // sin pérdida silenciosa
  assert.equal((await luis.try('PATCH', `/api/progress/${e.id}`, { qty: '12', recordVersion: c2.data.current.recordVersion })).status, 200);
  // Reintento con la misma clave: no duplica el avance.
  const k = { key: 'captura-123' }; const body = { workId: S.work, locationId: S.sotano, conceptId: S.piso, executionDate: '2026-08-28', qty: '3' };
  const r1 = await sup.post('/api/progress', body, k), r2 = await sup.post('/api/progress', body, k); assert.equal(r1.id, r2.id);
  assert.equal((await sup.get('/api/progress?mine=1')).total, 2);
  // Una segunda instancia escritora no puede abrir los mismos datos.
  assert.throws(() => Store.open(env.dataDir), /otra instancia/);
  const ro = Store.open(env.dataDir, { readOnly: true }); assert.throws(() => ro.tx({ action: 'x' }, () => {}), /solo lectura/);
  const F = await weekFlow(env, S); const before = { ob: await L.get(`/api/obligations/${F.ob}`), audit: env.store.verifyAudit(), gen: env.store.manifest.generation, cash: (await L.get('/api/cash/accounts')).items };
  await L.post('/api/logout'); const dir = env.dataDir; await env.stop();
  // Reinicio del servidor: datos, adjuntos, estados y auditoría siguen ahí.
  const env2 = await startEnv({ dir }); t.after(() => env2.stop()); const L2 = await env2.as('lucia');
  const after = await L2.get(`/api/obligations/${F.ob}`); assert.equal(after.paid, before.ob.paid); assert.equal(after.balance, before.ob.balance); assert.equal(after.payStatus, 'parcial');
  assert.equal((await L2.get(`/api/c-estimates/${F.est}`)).status, 'cerrada'); assert.deepEqual((await L2.get('/api/cash/accounts')).items.map((a) => a.balance), before.cash.map((a) => a.balance));
  assert.equal((await L2.try('GET', `/api/attachments/${F.photo}/content`)).data.equals(TINY_JPG), true);
  const a2 = env2.store.verifyAudit(); assert.equal(a2.ok, true); assert.ok(a2.total >= before.audit.total);
  // Corrupción detectada: no se "arregla" borrando; el sistema se niega a abrir.
  await env2.stop(); const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); const f = path.join(dir, m.collections.obligations[''].file); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('"grossAmount":"', '"grossAmount":"9'));
  assert.throws(() => Store.open(dir), /corrupción/); t.after(() => {});
});

test('Criterios 31, 39 y recorrido 8: respaldo restaurado y paquete portable (JSON y CSV) conservan todo', async (t) => {
  const env = await startEnv(); t.after(() => env.stop()); const S = await scenario(env); const F = await weekFlow(env, S); const L = S.lucia;
  const b = await (await env.as('admin')).post('/api/admin/backups', { note: 'prueba' }); const bdir = path.join(env.dataDir, 'backups', b.stamp);
  assert.deepEqual(readBackup(bdir).problems, []);
  const target = tmp('dcl-restore-'); const { store: rs, auth: ra } = restoreInto(bdir, target, AuthStore); t.after(() => rs.close());
  assert.deepEqual(validateAll(rs.view()), []); assert.equal(rs.verifyAudit().ok, true); assert.equal(rs.hasBlob(env.store.view().get('attachments', F.photo).sha256), true);
  // Mismos saldos y documentos en el entorno restaurado, y las contraseñas siguen funcionando.
  rs.close(); const env3 = await startEnv({ dir: target }); t.after(() => env3.stop()); const L3 = await env3.as('lucia');
  const o1 = await L.get(`/api/obligations/${F.ob}`), o3 = await L3.get(`/api/obligations/${F.ob}`); for (const k of ['gross', 'paid', 'balance', 'payStatus']) assert.equal(o3[k], o1[k]);
  assert.deepEqual(await L3.get(`/api/closes/${F.close}`), await L.get(`/api/closes/${F.close}`)); assert.ok(ra.hasPassword(env.store.view().by('users', 'username', 'lucia')[0].id));
  // Un respaldo alterado no supera la validación.
  const victim = path.join(bdir, 'collections', 'obligations.json'); fs.writeFileSync(victim, fs.readFileSync(victim, 'utf8').replace('"grossAmount":"2', '"grossAmount":"3')); assert.ok(readBackup(bdir).problems.length > 0);
  // Paquete portable: IDs, relaciones, versiones, historial y archivos, por JSON y por CSV.
  const { buffer, manifest } = await exportPackage(env.store, {}); assert.equal(manifest.dataset, 'demo'); assert.ok(!/secure|credential|session/i.test(JSON.stringify(Object.keys(manifest.files))));
  const norm = (st) => JSON.stringify([...st.dump()].filter(([, v]) => v.length).map(([k, v]) => [k, [...v].sort((a, c) => (a.id < c.id ? -1 : 1))]).sort());
  for (const source of ['json', 'csv']) { const { store } = await importPackageInto(buffer, tmp(`dcl-pkg-${source}-`), { source }); assert.equal(norm(store), norm(env.store), `paquete por ${source}`); assert.equal(store.verifyAudit().ok, true); assert.deepEqual(validateAll(store.view()), []); assert.equal(store.readBlob(env.store.view().get('attachments', F.photo).sha256).equals(TINY_JPG), true); store.close(); }
  // El paquete no contiene contraseñas ni sesiones.
  assert.ok(!buffer.toString('latin1').includes('scrypt'));
  // CSV: protección contra fórmulas reversible y negativos numéricos intactos.
  const cols = [{ key: 'a', type: 'text' }, { key: 'n', type: 'money' }, { key: 'z', type: 'text' }]; const rows = [{ a: '=SUMA(A1)', n: '-12.50', z: null }, { a: "'cita", n: '0.00', z: '' }, { a: '+52 81, "x"\nlinea', n: '1.00', z: '-texto' }];
  const csv = toCsv(rows, cols); assert.ok(csv.includes("'=SUMA(A1)")); assert.ok(csv.includes(',-12.50,')); assert.deepEqual(fromCsv(csv, (k) => (k === 'n' ? 'money' : 'text')), rows);
});

test('Criterios 37, 38 y 40: documentos emitidos, coincidencia pantalla–CSV–PDF y aislamiento de la demostración', async (t) => {
  const env = await startEnv(); t.after(() => env.stop()); const S = await scenario(env); const F = await weekFlow(env, S); const L = S.lucia;
  const prev = await L.get(`/api/documents/preview?type=estimacion_contratista&id=${F.est}&audience=interno`); assert.equal(prev.draft, false);
  const item = prev.model.sections[0].rows[0]; const screen = await L.get(`/api/c-estimates/${F.est}`);
  assert.equal(item.amount, screen.items[0].amount); assert.equal(item.amount, '28182.00');
  // PDF: las cadenas dibujadas salen del mismo modelo con la misma regla.
  const cell = prev.layout.sections[0].rows[0]; assert.ok(cell.includes(fmtMoney('28182.00'))); assert.ok(cell.includes('80.52')); assert.ok(prev.layout.sections[0].totals.some(([k, v]) => k.startsWith('Total') && v === '$28,182.00'));
  const csv = (await L.try('GET', `/api/documents/preview?type=estimacion_contratista&id=${F.est}&audience=interno&format=csv`)).data.toString('utf8'); assert.ok(csv.includes('28182.00')); assert.ok(csv.includes('80.5200'));
  const listCsv = (await L.try('GET', '/api/c-estimates?format=csv')).data.toString('utf8'); assert.ok(listCsv.includes('28182.00'));
  const pdf = (await L.try('GET', `/api/documents/preview?type=estimacion_contratista&id=${F.est}&audience=interno&format=pdf`)).data; assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  // Emisión inmutable; una nueva emisión marca la anterior como sustituida sin borrarla.
  const d1 = await L.post('/api/documents/issue', { type: 'estimacion_contratista', id: F.est, audience: 'contratista' }); assert.equal(d1.status, 'vigente');
  const bytes1 = (await L.try('GET', `/api/documents/${d1.id}/pdf`)).data; const con = await env.as('contratista');
  assert.equal((await con.try('GET', `/api/documents/${d1.id}/pdf`)).status, 404); await L.post(`/api/documents/${d1.id}/publish`, {}); assert.equal((await con.try('GET', `/api/documents/${d1.id}/pdf`)).status, 200);
  await L.post('/api/rates', { circuit: 'contratacion', conceptId: S.piso, price: '999', validFrom: '2026-08-31' }); // el catálogo cambia después
  const d2 = await L.post('/api/documents/issue', { type: 'estimacion_contratista', id: F.est, audience: 'contratista' });
  const docs = (await L.get('/api/documents')).items; assert.equal(docs.find((x) => x.id === d1.id).status, 'sustituido'); assert.equal(docs.find((x) => x.id === d2.id).status, 'vigente');
  assert.equal((await L.try('GET', `/api/documents/${d1.id}/pdf?regenerate=0`)).status, 200); assert.equal((await L.get(`/api/documents/${d1.id}`)).model.sections[0].rows[0].amount, '28182.00'); // regenerar conserva importes
  assert.ok(bytes1.length > 1000);
  // Un documento de un registro aún no autorizado se emite como BORRADOR y no puede publicarse.
  const draftEst = await L.post('/api/c-estimates', { workId: S.work2, contractorId: S.contractor, periodId: (await L.post('/api/periods', { year: 2026, week: 36 })).id });
  const dd = await L.post('/api/documents/issue', { type: 'estimacion_contratista', id: draftEst.id, audience: 'contratista' }); assert.equal(dd.status, 'borrador'); assert.equal((await L.try('POST', `/api/documents/${dd.id}/publish`, {})).status, 409);
  // Enlace restringido: alcance de un documento, revocable; generar no es enviar.
  const sh = await L.post(`/api/documents/${d2.id}/share`, { days: 3 }); assert.match(sh.note, /no se envió/); const anon = env.anon();
  assert.equal((await anon.try('GET', sh.path)).status, 200); assert.equal((await anon.try('GET', '/api/shared/' + 'x'.repeat(32))).status, 404);
  const links = await L.get(`/api/documents/${d2.id}/links`); await L.post(`/api/share-links/${links.items[0].id}/revoke`, {}); assert.equal((await anon.try('GET', sh.path)).status, 404);
  // Demostración aislada: un almacén de operación rechaza el modo demo y viceversa; el reinicio solo existe en demo.
  const real = tmp('dcl-real-'); const rs = Store.open(real, { create: { dataset: 'operacion' } }); rs.close();
  const { buildApp } = await import('../server/app.js'); await assert.rejects(() => buildApp({ ...env.config, dataDir: real, demo: true }), /No se mezclan/);
  const opApp = await buildApp({ ...env.config, dataDir: real, demo: false }); t.after(() => opApp.store.close());
  assert.ok(opApp.routes.find((r) => r.pattern === '/api/demo/reset')); const srv = await opApp.listen(0, '127.0.0.1'); t.after(() => srv.close());
  const { createUser, client } = await import('../server/seed/client.js'); const { seedBase } = await import('../server/seed/base.js'); opApp.store.tx({ action: 's' }, (tx) => seedBase(tx)); createUser(opApp.store, opApp.auth, { username: 'real', name: 'Real', role: ['direccion', 'admin_tecnico'], password: PASSWORD });
  const rc = client(`http://127.0.0.1:${srv.address().port}`); await rc.login('real', PASSWORD); const gen = opApp.store.manifest.generation;
  assert.equal((await rc.try('POST', '/api/demo/reset', {})).status, 403); assert.equal(opApp.store.manifest.generation, gen); assert.equal((await rc.get('/api/session')).demo, false);
  // Un respaldo de demostración no puede restaurarse sobre operación.
  const b = createBackup(env.store, env.auth, {}); fs.cpSync(path.join(env.dataDir, 'backups', b.stamp), path.join(real, 'backups', b.stamp), { recursive: true });
  const { restoreBackup } = await import('../server/core/backup.js'); assert.throws(() => restoreBackup(opApp.store, opApp.auth, b.stamp), /No se mezclan/);
});

test('Criterios 13, 29 y 30: importación con datos de prueba (hojas ocultas, errores de fórmula, subtotales, fechas) e idempotencia', async (t) => {
  const env = await startEnv(); t.after(() => env.stop()); await scenario(env); const adm = await env.as('admin');
  // Libro de prueba con la forma del control de obra: dos hojas (una oculta), bloques semanales y totales.
  const est = new ExcelJS.Workbook(); const mk = (name, hidden, yearS35) => { const ws = est.addWorksheet(name, { state: hidden ? 'hidden' : 'visible' }); ws.getCell('B2').value = `CONTROL DE OBRA  - ${name}`;
    ['CLAVE', 'CONCEPTO', 'CANTIDAD', 'UNIDAD', 'PU', 'IMPORTE'].forEach((v, i) => { ws.getCell(6, 2 + i).value = v; });
    [[8, 2026, 'Semana 34', '17 - 22 Agosto'], [10, yearS35, 'Semana 35', '24 - 29 Agosto']].forEach(([c, y, w, r]) => { ws.getCell(5, c).value = y; ws.getCell(6, c).value = w; ws.getCell(7, c).value = r; ws.getCell(8, c).value = 'CANT.'; ws.getCell(8, c + 1).value = 'IMPORTE'; });
    ws.getCell(6, 12).value = 'EJECUTADO'; ws.getCell('B9').value = 'PISOS INTERIORES';
    const row = (r, c, q, u, pu, q34, q35) => { ws.getCell(r, 3).value = c; ws.getCell(r, 4).value = q; ws.getCell(r, 5).value = u; ws.getCell(r, 6).value = pu; if (q34) { ws.getCell(r, 8).value = q34; ws.getCell(r, 9).value = q34 * pu; } if (q35) { ws.getCell(r, 10).value = { formula: '10.16+5.63', result: q35 }; ws.getCell(r, 11).value = q35 * pu; } };
    row(10, 'Instalación de piso en sótano 1', 135, 'm2', 350, 0, 15.79); row(11, 'Instalación de piso en PB', 240, 'M2', 350, 4, 25.24); row(12, 'Aperturas varias', 5, 'lotes', 150, 0, 5); ws.getCell(13, 3).value = 'Tapa especial'; ws.getCell(13, 4).value = 1; ws.getCell(13, 5).value = 'huellas'; ws.getCell(13, 6).value = 100;
    ws.getCell(12, 12).value = { formula: 'K12/0', result: { error: '#DIV/0!' } }; ws.getCell(16, 3).value = 'TOTAL DE PTTO.'; ws.getCell(16, 9).value = { formula: 'SUM(I9:I15)', result: 1400 }; ws.getCell(16, 11).value = { formula: 'SUM(K9:K15)', result: 15110.5 }; return ws; };
  mk('Balcones', false, 2026); mk('Obra oculta', true, 2025);
  const up = (name, buf) => adm.call('POST', `/api/imports?name=${encodeURIComponent(name)}`, Buffer.from(buf)).then((r) => r.data);
  const b1 = await up('PRUEBA_Estimaciones.xlsx', await est.xlsx.writeBuffer()); assert.equal(b1.profile, 'estimaciones'); assert.deepEqual(b1.hiddenSheets, ['Obra oculta']);
  const before = env.store.view().count('sourceRecords'); const sim = await adm.post(`/api/imports/${b1.id}/simulate`); assert.equal(env.store.view().count('sourceRecords'), before); // simulación sin escritura
  assert.equal(sim.byKind.avance_semanal.altas, 8); assert.equal(sim.byKind.partida_contratacion.altas, 8); assert.equal(sim.counts.excluidos, 2); // los subtotales no se cargan
  assert.ok(sim.issues.hoja_oculta >= 1 && sim.issues.error_formula >= 1 && sim.issues.unidad === 2 && sim.issues.fecha_conflicto === 1, JSON.stringify(sim.issues));
  assert.equal(sim.totals.checked, 4); assert.equal(sim.totals.withDifference, 0);
  // Confirmación idempotente y recarga del mismo archivo.
  assert.equal((await adm.try('POST', `/api/imports/${b1.id}/confirm`, {})).status, 409); // falta estrategia de arranque
  const c1 = await adm.post(`/api/imports/${b1.id}/confirm`, { strategy: 'solo_evidencia', masters: ['works'] }); assert.equal(c1.written, 16); assert.equal(c1.created.works, 2); // las dos hojas (también la oculta) son obras que aún no existían
  const c2 = await adm.post(`/api/imports/${b1.id}/confirm`, { strategy: 'solo_evidencia' }); assert.equal(c2.already, true); assert.equal(c2.written, 0);
  assert.equal((await up('PRUEBA_Estimaciones.xlsx', await est.xlsx.writeBuffer())).already, true); // el mismo archivo abre el lote existente
  est.worksheets[0].getCell('A1').value = 'copia guardada otro día'; await up('PRUEBA_Estimaciones_copia.xlsx', await est.xlsx.writeBuffer()); // otro archivo con los mismos registros…
  const lots = (await adm.get('/api/imports')).items; const b1b = lots.find((x) => x.id !== b1.id); const sim2 = await adm.post(`/api/imports/${b1b.id}/simulate`); assert.equal(sim2.counts.altas, 0); assert.equal(sim2.counts.coincidencias, 16); // …pero no duplica registros
  assert.equal((await adm.post(`/api/imports/${b1b.id}/confirm`, { strategy: 'solo_evidencia' })).written, 0); assert.equal(env.store.view().count('sourceRecords'), 16);
  // Flujos de prueba: la misma semana y obra por 14,360.50 + 750 = 15,110.50 se propone como un solo hecho, no como otro costo.
  const fl = new ExcelJS.Workbook(); const g = fl.addWorksheet('GLOBAL'); ['Cash', 'Cash', 'Banorte', 'Banorte'].forEach((v, i) => { g.getCell(3, 4 + i).value = v; }); g.getCell('B7').value = new Date(Date.UTC(2026, 7, 28)); g.getCell('C7').value = 'Instalación S35'; g.getCell('D7').value = 15110.5; g.getCell('B8').value = ' 31-Mar-26'; g.getCell('C8').value = 'Fecha como texto'; g.getCell('D8').value = 10; g.getCell('C9').value = 'Saldo'; g.getCell('H9').value = 100;
  const r = fl.addWorksheet('RESIDENCIALES'); r.getCell('B8').value = 'Concepto'; r.getCell('C8').value = 'Concepto'; r.getCell('D8').value = 'Fecha'; r.getCell('E8').value = 'Balcones'; r.getCell('E7').value = 'Cliente de prueba'; r.getCell('B9').value = 'Mano de Obra'; r.getCell('C9').value = '35 - P'; r.getCell('D9').value = new Date(Date.UTC(2026, 7, 29)); r.getCell('E9').value = -15110.5; r.getCell('D10').value = 'Utilidad real:'; r.getCell('E10').value = 999999;
  const b2 = await up('PRUEBA_Flujos.xlsx', await fl.xlsx.writeBuffer()); assert.equal(b2.profile, 'flujos'); const s2 = await adm.post(`/api/imports/${b2.id}/simulate`); assert.equal(s2.issues.fecha_ambigua, 1); assert.equal(s2.byKind.asignacion_obra.altas, 1); assert.equal(s2.byKind.movimiento_caja.altas, 1); // "Utilidad real" no se importa
  const c3 = await adm.post(`/api/imports/${b2.id}/confirm`, { strategy: 'solo_evidencia' }); assert.equal(c3.cross.proposals, 1);
  const mp = (await adm.get('/api/match-proposals')).items; assert.equal(mp[0].amount, '15110.50'); assert.equal(mp[0].status, 'pendiente'); assert.match(mp[0].basis, /un solo hecho/);
  // Nada de lo importado como evidencia generó costos, pagos ni obligaciones.
  const db = env.store.view(); assert.equal(db.count('obligations') + db.count('expenses') + db.count('cashMovements') + db.count('cEstimates'), 0);
  // Reversión: la obra creada no tiene uso, el lote puede revertirse.
  await adm.post(`/api/imports/${b1.id}/revert`, { reason: 'Prueba de reversión' }); assert.equal(env.store.view().by('sourceRecords', 'batchId', b1.id).length, 0);
});
