// Reportería avanzada: agregaciones exactas, alcance por obra aplicado antes de calcular, desglose y reportes guardados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { startEnv, scenario } from './helpers.js';

test('Motor de análisis: totales iguales a los listados, alcance por rol, desglose y datos faltantes', async (t) => {
  const env = await startEnv(); t.after(() => env.stop()); const S = await scenario(env); const L = S.lucia, sup = await env.as('supervisor');
  const cap = async (o) => { const r = await sup.post('/api/progress', { workId: S.work, contractorId: S.contractor, submit: true, ...o }); await L.post(`/api/progress/${r.id}/review`, { decision: 'validar' }); return r.id; };
  await cap({ locationId: S.sotano, conceptId: S.piso, executionDate: '2026-08-20', qty: '15.79' }); await cap({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-27', qty: '25.24' }); await cap({ locationId: S.pb, conceptId: S.canto, executionDate: '2026-08-27', qty: '10' }); await cap({ locationId: S.pb, conceptId: S.sinTarifa, executionDate: '2026-08-28', qty: '1' });
  const est = await L.post('/api/c-estimates', { workId: S.work, contractorId: S.contractor, periodId: S.period }); await L.post(`/api/c-estimates/${est.id}/generate`, {});
  const q = (c, b) => c.post('/api/analytics/query', b);
  // Suma por unidad: 41.03 m², 10 ml, 1 lote. Sin agrupar por unidad se advierte la mezcla.
  const byUnit = await q(L, { dataset: 'avances', groupBy: 'unit', measures: ['qty', 'n'] });
  assert.deepEqual(Object.fromEntries(byUnit.rows.map((r) => [r.key, r.qty])), { m2: '41.0300', ml: '10.0000', lote: '1.0000' }); assert.equal(byUnit.warnings.length, 0);
  assert.match((await q(L, { dataset: 'avances', groupBy: 'work', measures: ['qty'] })).warnings[0], /unidades distintas/);
  // Por periodo semanal y con filtro: la semana 34 tiene 15.79 m², la 35 tiene 25.24 m².
  const byWeek = await q(L, { dataset: 'avances', groupBy: '_periodo', bucket: 'semana', measures: ['qty'], filters: { unit: ['m2'] } });
  assert.deepEqual(byWeek.rows.map((r) => [r.key, r.qty]), [['2026-S34', '15.7900'], ['2026-S35', '25.2400']]);
  assert.equal((await q(L, { dataset: 'avances', groupBy: 'unit', measures: ['qty'], from: '2026-08-24', to: '2026-08-31', filters: { unit: ['m2'] } })).totals.qty, '25.2400');
  // El total de mano de obra coincide con el listado; la partida sin tarifa se informa como faltante, no como cero.
  const mo = await q(L, { dataset: 'mano_obra', groupBy: 'concept', measures: ['amount'] }); const list = await L.get('/api/c-estimates');
  assert.equal(mo.totals.amount, list.totals.grossTotal.value); assert.equal(mo.totals.amount, '15160.50'); assert.equal(mo.totals.amount__missing, 1);
  assert.equal(mo.rows.find((r) => r.label === 'Detalle especial sin tarifa').amount, null); assert.match(mo.warnings[0], /no se sumaron como cero/);
  // Series: matriz concepto × estado de la partida.
  const piv = await q(L, { dataset: 'mano_obra', groupBy: 'concept', seriesBy: 'itemStatus', measures: ['amount'] }); assert.equal(piv.series.length, 1); assert.equal(piv.series[0].name, 'Pendiente');
  // Desglose hasta el registro, con enlace al documento.
  const dr = await L.post('/api/analytics/rows', { dataset: 'avances', filters: { unit: ['m2'] } }); assert.equal(dr.total, 2); assert.match(dr.items[0].href, /^#\/avances\//);
  // "Otros" conserva el total cuando se limita.
  const top = await q(L, { dataset: 'avances', groupBy: 'location', measures: ['n'], limit: 1 }); assert.equal(top.rows.length, 2); assert.equal(top.rows[1].key, '__otros'); assert.equal(top.rows.reduce((a, r) => a + Number(r.n), 0), 4);
  // Alcance antes de calcular: el supervisor solo ve avances de su obra y ningún conjunto económico.
  const other = await L.post('/api/progress', { workId: S.work2, locationId: S.loc2, conceptId: S.piso, contractorId: S.contractor2, executionDate: '2026-08-27', qty: '99', submit: true });
  assert.deepEqual((await q(sup, { dataset: 'avances', groupBy: 'work', measures: ['n'] })).rows.map((r) => r.label), ['Obra de prueba Balcones']);
  assert.equal((await q(L, { dataset: 'avances', groupBy: 'work', measures: ['n'] })).rows.length, 2); assert.ok(other.id);
  assert.deepEqual((await sup.get('/api/analytics/datasets')).items.map((x) => x.code), ['avances']);
  for (const ds of ['mano_obra', 'costos', 'obligaciones', 'cobranza', 'caja', 'gastos', 'actividad']) assert.equal((await sup.try('POST', '/api/analytics/query', { dataset: ds })).status, 404, ds);
  for (const u of ['contratista', 'cliente']) { const c = await env.as(u); assert.equal((await c.try('GET', '/api/analytics/datasets')).status, 404); assert.equal((await c.try('POST', '/api/analytics/query', { dataset: 'avances' })).status, 404); assert.equal((await c.try('POST', '/api/analytics/rows', { dataset: 'avances' })).status, 404); }
  assert.equal((await L.try('POST', '/api/analytics/query', { dataset: 'avances', groupBy: 'inexistente' })).status, 422);
  // Reportes guardados: privados por omisión; compartidos solo para quien tiene acceso al conjunto.
  const cfg = { dataset: 'mano_obra', groupBy: 'contractor', measures: ['amount'], chart: 'hbar' };
  const s1 = await L.post('/api/analytics/saved', { name: 'Mano de obra por contratista', config: cfg, shared: true });
  assert.equal((await L.get('/api/analytics/saved')).items.length, 1); assert.equal((await sup.get('/api/analytics/saved')).items.length, 0);
  assert.equal((await (await env.as('auditor')).get('/api/analytics/saved')).items.length, 1);
  assert.equal((await (await env.as('auditor')).try('DELETE', `/api/analytics/saved/${s1.id}`)).status, 403);
  // CSV del análisis con importes sin formato local.
  const csv = (await L.try('POST', '/api/analytics/export', { dataset: 'mano_obra', groupBy: 'concept', measures: ['amount'] })).data.toString('utf8'); assert.ok(csv.includes('14360.50'));
});
