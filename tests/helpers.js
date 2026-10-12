// Entorno de prueba aislado: carpeta temporal, servidor real en puerto efímero y datos de prueba identificados.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../server/config.js';
import { buildApp } from '../server/app.js';
import { seedBase } from '../server/seed/base.js';
import { client, createUser } from '../server/seed/client.js';

export const PASSWORD = 'prueba-dcl-12345';
export async function startEnv({ dir } = {}) {
  const dataDir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'dcl-test-'));
  const config = { ...loadConfig(['--demo'], {}), dataDir, port: 0 };
  const fresh = !fs.existsSync(path.join(dataDir, 'manifest.json'));
  const app = await buildApp(config, { create: { dataset: 'demo', organizationName: 'DCL (PRUEBA)' } });
  if (fresh) app.store.tx({ action: 'semilla_base' }, (tx) => seedBase(tx));
  const server = await app.listen(0, '127.0.0.1');
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { app, store: app.store, auth: app.auth, server, base, dataDir, config,
    as: async (username) => { const c = client(base); await c.login(username, PASSWORD); return c; },
    anon: () => client(base),
    user: (o) => createUser(app.store, app.auth, { password: PASSWORD, ...o }),
    stop: async () => { await new Promise((r) => server.close(r)); server.closeAllConnections?.(); app.store.close(); },
  };
  return env;
}

// Escenario mínimo de prueba: una obra con dos ubicaciones, un contratista, tarifas y un usuario por rol.
export async function scenario(env, { week = { year: 2026, week: 35 } } = {}) {
  const S = {};
  env.user({ username: 'lucia', name: 'Lucía (prueba)', role: 'direccion' });
  env.user({ username: 'admin', name: 'Administración técnica (prueba)', role: 'admin_tecnico' });
  env.user({ username: 'tesoreria', name: 'Tesorería (prueba)', role: 'tesoreria' });
  env.user({ username: 'auxiliar', name: 'Auxiliar (prueba)', role: 'auxiliar' });
  env.user({ username: 'auditor', name: 'Auditor (prueba)', role: 'auditor' });
  const L = (S.lucia = await env.as('lucia'));
  const opt = await L.get('/api/options?sets=units,methods,categories,voucherTypes');
  S.unit = Object.fromEntries(opt.units.map((u) => [u.label, u.id])); S.method = Object.fromEntries(opt.methods.map((m) => [m.kind, m.id])); S.cat = Object.fromEntries(opt.categories.map((m) => [m.label, m.id])); S.voucher = Object.fromEntries(opt.voucherTypes.map((m) => [m.label, m.id]));
  S.client = (await L.post('/api/catalog/parties', { name: 'Cliente de Prueba Arquitectos', isClient: true })).id;
  S.client2 = (await L.post('/api/catalog/parties', { name: 'Otro Cliente de Prueba', isClient: true })).id;
  S.contractor = (await L.post('/api/catalog/parties', { name: 'Contratista de Prueba Uno', isContractor: true })).id;
  S.contractor2 = (await L.post('/api/catalog/parties', { name: 'Contratista de Prueba Dos', isContractor: true })).id;
  S.supplier = (await L.post('/api/catalog/parties', { name: 'Proveedor de Prueba', isSupplier: true })).id;
  S.work = (await L.post('/api/works', { name: 'Obra de prueba Balcones', code: 'PRB-01', clientId: S.client })).id;
  S.work2 = (await L.post('/api/works', { name: 'Obra de prueba Dos', code: 'PRB-02', clientId: S.client2 })).id;
  for (const w of [S.work, S.work2]) await L.patch(`/api/works/${w}`, { status: 'activa' });
  S.sotano = (await L.post(`/api/works/${S.work}/locations`, { name: 'Sótano 1', kind: 'nivel' })).id;
  S.pb = (await L.post(`/api/works/${S.work}/locations`, { name: 'Planta baja', kind: 'nivel' })).id;
  S.bano = (await L.post(`/api/works/${S.work}/locations`, { name: 'Baño principal', kind: 'habitacion', parentId: S.pb })).id;
  S.loc2 = (await L.post(`/api/works/${S.work2}/locations`, { name: 'Planta baja', kind: 'nivel' })).id;
  const concept = async (name, unit, extra = {}) => (await L.post('/api/catalog/concepts', { name, catalog: 'contratacion', unitId: S.unit[unit], evidencePolicy: 'opcional', ...extra })).id;
  S.piso = await concept('Instalación de piso interior', 'm2');
  S.imper = await concept('Impermeabilización de muro', 'm2', { hiddenWork: true });
  S.canto = await concept('Canto pulido', 'ml');
  S.sinTarifa = await concept('Detalle especial sin tarifa', 'lote');
  S.kPiso = (await L.post('/api/catalog/concepts', { name: 'Suministro e instalación de piso de mármol', catalog: 'comercial', unitId: S.unit.m2, evidencePolicy: 'opcional' })).id;
  S.kLimpieza = (await L.post('/api/catalog/concepts', { name: 'Limpieza y sellado de baño', catalog: 'comercial', unitId: S.unit.m2, evidencePolicy: 'opcional' })).id;
  await L.post('/api/rates', { circuit: 'contratacion', conceptId: S.piso, price: '350', validFrom: '2026-01-01' });
  await L.post('/api/rates', { circuit: 'contratacion', conceptId: S.imper, price: '120', validFrom: '2026-01-01' });
  await L.post('/api/rates', { circuit: 'contratacion', conceptId: S.canto, price: '80', validFrom: '2026-01-01' });
  await L.post('/api/rates', { circuit: 'comercial', conceptId: S.kPiso, price: '1280', validFrom: '2026-01-01' });
  for (const w of [S.work, S.work2]) await L.post(`/api/works/${w}/assignments`, { kind: 'contratista', partyId: S.contractor, validFrom: '2026-01-01' });
  await L.post(`/api/works/${S.work2}/assignments`, { kind: 'contratista', partyId: S.contractor2, validFrom: '2026-01-01' });
  S.supervisorId = env.user({ username: 'supervisor', name: 'Supervisor (prueba)', role: 'supervisor', scope: 'asignadas' });
  env.user({ username: 'coordinacion', name: 'Luis (prueba)', role: 'coordinacion', scope: 'obra', workId: S.work });
  await L.post(`/api/works/${S.work}/assignments`, { kind: 'supervisor', userId: S.supervisorId, validFrom: '2026-01-01' });
  env.user({ username: 'contratista', name: 'Contratista Uno (prueba)', role: 'contratista', partyId: S.contractor });
  env.user({ username: 'contratista2', name: 'Contratista Dos (prueba)', role: 'contratista', partyId: S.contractor2 });
  env.user({ username: 'cliente', name: 'Cliente (prueba)', role: 'cliente', partyId: S.client });
  env.user({ username: 'cliente2', name: 'Cliente Dos (prueba)', role: 'cliente', partyId: S.client2 });
  S.period = (await L.post('/api/periods', week)).id;
  S.cash = (await L.post('/api/catalog/accounts', { code: 'CAJA', name: 'Caja de prueba', kind: 'efectivo', currency: 'MXN', openingBalance: '500000', openingDate: '2026-01-01' })).id;
  S.bank = (await L.post('/api/catalog/accounts', { code: 'BANCO', name: 'Banco de prueba', kind: 'banco', currency: 'MXN', openingBalance: '1000000', openingDate: '2026-01-01' })).id;
  return S;
}
