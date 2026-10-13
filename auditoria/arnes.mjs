// Arnés de la auditoría funcional. Cada caso corre contra el servidor real en una carpeta temporal aislada
// (no toca var/demo ni var/operacion) y registra lo esperado y lo obtenido, pase o no.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startEnv } from '../tests/helpers.js';
export { TINY_JPG } from '../server/seed/client.js';
export const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'resultados');
const J = (v) => JSON.stringify(v === undefined ? null : v) ?? 'null';
export const casos = [];
export function caso(id, titulo, reglas, fn) { casos.push({ id, titulo, reglas, fn }); }
export async function ejecutar(nombre, filtro) {
  const res = [];
  for (const c of casos) {
    if (filtro && !filtro.includes(c.id)) continue;
    const r = { id: c.id, titulo: c.titulo, reglas: c.reglas, comprobaciones: [], observaciones: [], error: null }; const env = await startEnv();
    const t = { env,
      ok: (desc, esperado, real) => { const pasa = J(esperado) === J(real); r.comprobaciones.push({ desc, esperado, real, pasa }); return pasa; },
      cierto: (desc, cond, real) => { r.comprobaciones.push({ desc, esperado: true, real: real === undefined ? !!cond : real, pasa: !!cond }); return !!cond; },
      nota: (desc, valor) => r.observaciones.push({ desc, valor }),
    };
    try { await c.fn(t); } catch (e) { r.error = `${e.message}${e.data ? ' · ' + J(e.data).slice(0, 400) : ''}`.slice(0, 700); r.stack = String(e.stack || '').split('\n').slice(1, 4).join(' | '); }
    await env.stop(); try { fs.rmSync(env.dataDir, { recursive: true, force: true }); } catch { /* temporal */ }
    const fall = r.comprobaciones.filter((x) => !x.pasa); r.resultado = r.error ? 'ERROR' : fall.length ? 'FALLA' : 'PASA'; res.push(r);
    console.log(`${r.resultado.padEnd(5)} ${r.id} ${r.titulo} (${r.comprobaciones.length - fall.length}/${r.comprobaciones.length})${r.error ? '\n      ERROR: ' + r.error + '\n      ' + r.stack : ''}`);
    for (const f of fall) console.log(`      ✗ ${f.desc}\n        esperado ${J(f.esperado)}\n        real     ${J(f.real).slice(0, 500)}`);
  }
  fs.writeFileSync(path.join(OUT, `${nombre}.json`), JSON.stringify({ fecha: new Date().toISOString(), node: process.version, casos: res }, null, 1));
  return res;
}
// Escenario de la auditoría (sección 26): obras A y B, contratistas K1 (A y B) y K2 (solo A), cliente C1 (solo A),
// supervisores S1→A y S2→B, dirección D1 y tesorería T1. Ubicaciones "Sótano 1" y "Planta baja" en A.
export async function escenario(env, { semana = { year: 2026, week: 35 } } = {}) {
  const S = {}; const u = (o) => env.user(o);
  S.d1Id = u({ username: 'd1', name: 'D1 Dirección (auditoría)', role: 'direccion' }); u({ username: 't1', name: 'T1 Tesorería (auditoría)', role: 'tesoreria' }); u({ username: 'aux', name: 'Auxiliar (auditoría)', role: 'auxiliar' });
  u({ username: 'adm', name: 'Administración técnica (auditoría)', role: 'admin_tecnico' }); u({ username: 'aud', name: 'Auditor (auditoría)', role: 'auditor' });
  const D = (S.D = await env.as('d1'));
  const opt = await D.get('/api/options?sets=units,methods,categories,voucherTypes');
  S.unit = Object.fromEntries(opt.units.map((x) => [x.label, x.id])); S.method = Object.fromEntries(opt.methods.map((m) => [m.kind, m.id])); S.cat = Object.fromEntries(opt.categories.map((m) => [m.label, m.id])); S.voucher = Object.fromEntries(opt.voucherTypes.map((m) => [m.label, m.id]));
  const party = async (name, flags) => (await D.post('/api/catalog/parties', { name, ...flags })).id;
  S.C1 = await party('C1 Cliente (auditoría)', { isClient: true }); S.C2 = await party('C2 Cliente (auditoría)', { isClient: true });
  S.K1 = await party('K1 Contratista (auditoría)', { isContractor: true }); S.K2 = await party('K2 Contratista (auditoría)', { isContractor: true }); S.prov = await party('Proveedor (auditoría)', { isSupplier: true });
  S.A = (await D.post('/api/works', { name: 'Obra A (auditoría)', code: 'AUD-A', clientId: S.C1 })).id; S.B = (await D.post('/api/works', { name: 'Obra B (auditoría)', code: 'AUD-B', clientId: S.C2 })).id;
  for (const w of [S.A, S.B]) await D.patch(`/api/works/${w}`, { status: 'activa' });
  S.sot = (await D.post(`/api/works/${S.A}/locations`, { name: 'Sótano 1', kind: 'nivel' })).id; S.pb = (await D.post(`/api/works/${S.A}/locations`, { name: 'Planta baja', kind: 'nivel' })).id; S.locB = (await D.post(`/api/works/${S.B}/locations`, { name: 'Planta baja', kind: 'nivel' })).id;
  const concept = async (name, unit, extra = {}) => (await D.post('/api/catalog/concepts', { name, catalog: 'contratacion', unitId: S.unit[unit], evidencePolicy: 'opcional', ...extra })).id;
  S.piso = await concept('Instalación de piso (auditoría)', 'm2'); S.canto = await concept('Canto pulido (auditoría)', 'ml'); S.sinTarifa = await concept('Detalle sin tarifa (auditoría)', 'lote'); S.oculto = await concept('Impermeabilización (auditoría)', 'm2', { hiddenWork: true });
  S.kPiso = (await D.post('/api/catalog/concepts', { name: 'Suministro e instalación de piso (auditoría)', catalog: 'comercial', unitId: S.unit.m2, evidencePolicy: 'opcional' })).id;
  S.ratePiso = (await D.post('/api/rates', { circuit: 'contratacion', conceptId: S.piso, price: '350', validFrom: '2026-01-01' })).id; await D.post('/api/rates', { circuit: 'contratacion', conceptId: S.canto, price: '80', validFrom: '2026-01-01' }); await D.post('/api/rates', { circuit: 'contratacion', conceptId: S.oculto, price: '120', validFrom: '2026-01-01' });
  S.rateK = (await D.post('/api/rates', { circuit: 'comercial', conceptId: S.kPiso, price: '1280', validFrom: '2026-01-01' })).id;
  for (const w of [S.A, S.B]) await D.post(`/api/works/${w}/assignments`, { kind: 'contratista', partyId: S.K1, validFrom: '2026-01-01' });
  await D.post(`/api/works/${S.A}/assignments`, { kind: 'contratista', partyId: S.K2, validFrom: '2026-01-01' });
  S.s1Id = u({ username: 's1', name: 'S1 Supervisor (auditoría)', role: 'supervisor', scope: 'asignadas' }); S.s2Id = u({ username: 's2', name: 'S2 Supervisor (auditoría)', role: 'supervisor', scope: 'asignadas' });
  await D.post(`/api/works/${S.A}/assignments`, { kind: 'supervisor', userId: S.s1Id, validFrom: '2026-01-01' }); await D.post(`/api/works/${S.B}/assignments`, { kind: 'supervisor', userId: S.s2Id, validFrom: '2026-01-01' });
  u({ username: 'k1', name: 'K1 usuario (auditoría)', role: 'contratista', partyId: S.K1 }); u({ username: 'k2', name: 'K2 usuario (auditoría)', role: 'contratista', partyId: S.K2 }); u({ username: 'c1', name: 'C1 usuario (auditoría)', role: 'cliente', partyId: S.C1 });
  S.per = (await D.post('/api/periods', semana)).id;
  S.caja = (await D.post('/api/catalog/accounts', { code: 'CAJA', name: 'Caja (auditoría)', kind: 'efectivo', currency: 'MXN', openingBalance: '500000', openingDate: '2026-01-01' })).id;
  S.banco = (await D.post('/api/catalog/accounts', { code: 'BANCO', name: 'Banco (auditoría)', kind: 'banco', currency: 'MXN', openingBalance: '1000000', openingDate: '2026-01-01' })).id;
  S.s1 = await env.as('s1'); S.s2 = await env.as('s2'); S.k1 = await env.as('k1'); S.k2 = await env.as('k2'); S.c1 = await env.as('c1'); S.T = await env.as('t1');
  // Atajos
  S.capturar = (who, o) => who.post('/api/progress', { workId: S.A, contractorId: S.K1, submit: true, ...o });
  S.validado = async (o, who = S.s1) => { const r = await S.capturar(who, o); await D.post(`/api/progress/${r.id}/review`, { decision: 'validar' }); return r.id; };
  S.estimacion = async ({ workId = S.A, contractorId = S.K1, periodId = S.per, autorizar = true, cerrar = false } = {}) => { const e = await D.post('/api/c-estimates', { workId, contractorId, periodId }); const g = await D.post(`/api/c-estimates/${e.id}/generate`, {}); let au = null; if (autorizar) { await D.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_interna' }); au = await D.post(`/api/c-estimates/${e.id}/authorize`, { exceptionReason: 'Caso de auditoría: conformidad fuera del sistema' }); } let close = null; if (cerrar) close = await D.post('/api/closes', { periodId }); return { id: e.id, added: g.added, ob: au?.obligationId, total: au?.authorizedTotal, close: close?.id }; };
  // Obligación directa por un importe exacto (partida de importe fijo, con motivo).
  S.obligacion = async (amount, { contractorId = S.K1, workId = S.A, periodId = S.per } = {}) => { const e = await D.post('/api/c-estimates', { workId, contractorId, periodId }); await D.post(`/api/c-estimates/${e.id}/items`, { description: `Importe fijo de auditoría ${amount}`, amount, reason: 'Caso de auditoría' }); await D.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_interna' }); const au = await D.post(`/api/c-estimates/${e.id}/authorize`, { exceptionReason: 'Caso de auditoría: conformidad fuera del sistema' }); return { est: e.id, ob: au.obligationId }; };
  S.pagar = async (ob, amount, { medio = 'efectivo', date = '2026-08-29', reference, confirmar = true } = {}) => { const p = await S.T.post('/api/disbursements', { date, accountId: medio === 'efectivo' ? S.caja : S.banco, methodId: S.method[medio], amount, reference, applications: [{ obligationId: ob, amount }] }); if (confirmar) { await D.post(`/api/disbursements/${p.id}/authorize`, {}); const { TINY_JPG } = await import('../server/seed/client.js'); const rc = await S.T.upload(`recibo-${p.id}.jpg`, TINY_JPG, { kind: 'comprobante' }); await S.T.post(`/api/disbursements/${p.id}/confirm`, { receiptAttachmentId: rc.id, reference }); } return p.id; };
  S.presupuesto = async (items, workId = S.A) => { const b = await D.post(`/api/works/${workId}/budgets`, { name: 'Presupuesto (auditoría)' }); await D.put(`/api/budget-versions/${b.id}/items`, { items }); await D.post(`/api/budget-versions/${b.id}/transition`, { to: 'enviado' }); await D.post(`/api/budget-versions/${b.id}/transition`, { to: 'aceptado', acceptedByName: 'Representante de C1 (auditoría)' }); const v = await D.get(`/api/budget-versions/${b.id}`); return { id: b.id, items: v.items.map((i) => i.id) }; };
  return S;
}
