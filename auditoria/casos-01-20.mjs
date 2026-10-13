// CAS-01 a CAS-20 · captura, presupuesto y autorización (sección 27).
import { caso, ejecutar, escenario, TINY_JPG } from './arnes.mjs';
const st = async (c, m, u, b) => { const r = await c.try(m, u, b); return r.status; };

caso('CAS-01', 'Separación de obras', ['ACC-02', 'ACC-11', 'AVA-10'], async (t) => {
  const S = await escenario(t.env); const eB = await S.capturar(S.s2, { workId: S.B, locationId: S.locB, conceptId: S.piso, executionDate: '2026-08-27', qty: '7' });
  t.ok('S1 lee la obra B por ID', 404, await st(S.s1, 'GET', `/api/works/${S.B}`));
  t.ok('S1 lee un avance de B por ID', 404, await st(S.s1, 'GET', `/api/progress/${eB.id}`));
  const antes = t.env.store.view().count('progressEntries');
  t.ok('S1 crea avance en B por API', 403, await st(S.s1, 'POST', '/api/progress', { workId: S.B, locationId: S.locB, conceptId: S.piso, contractorId: S.K1, executionDate: '2026-08-27', qty: '1' }));
  t.ok('S1 crea avance en A con ubicación de B', true, [403, 422, 409].includes(await st(S.s1, 'POST', '/api/progress', { workId: S.A, locationId: S.locB, conceptId: S.piso, contractorId: S.K1, executionDate: '2026-08-27', qty: '1' })));
  t.ok('No se creó ningún registro en B', antes, t.env.store.view().count('progressEntries'));
  const lista = await S.s1.get('/api/progress'); t.ok('El listado de S1 no trae avances de B', 0, lista.items.filter((x) => x.workId === S.B).length);
  const obras = await S.s1.get('/api/works'); t.ok('El listado de obras de S1 solo trae A', ['AUD-A'], obras.items.map((w) => w.code));
  const bus = await S.s1.try('GET', '/api/search?q=Obra%20B'); t.ok('La búsqueda de S1 no devuelve la obra B', false, JSON.stringify(bus.data).includes('AUD-B'));
  const csv = await S.s1.try('GET', '/api/progress?format=csv'); t.ok('La exportación de S1 no trae B', false, csv.data.toString('utf8').includes('Obra B'));
  const pdf = await S.s1.try('GET', '/api/progress?format=pdf&title=x'); t.nota('Exportación PDF de avances como S1 (estado)', pdf.status);
  const ph = await S.s2.upload('b.jpg', TINY_JPG, { kind: 'foto', workId: S.B }); t.ok('S1 descarga un adjunto de B', 404, await st(S.s1, 'GET', `/api/attachments/${ph.id}/content`));
  const bor = await S.s1.try('POST', '/api/progress', { workId: S.A, locationId: S.sot, conceptId: S.piso, contractorId: S.K1, executionDate: '2026-08-27', qty: '3' });
  t.ok('S1 guarda un borrador válido en A', 200, bor.status); t.ok('Queda como borrador', 'borrador', (await S.s1.get(`/api/progress/${bor.data.id}`)).status);
  t.ok('S2 no ve el borrador de S1 en A', 404, await st(S.s2, 'GET', `/api/progress/${bor.data.id}`));
});

caso('CAS-02', 'Separación de terceros', ['ACC-03', 'ACC-05', 'ACC-06', 'DOC-03'], async (t) => {
  const S = await escenario(t.env); const D = S.D;
  await S.validado({ locationId: S.sot, conceptId: S.piso, executionDate: '2026-08-27', qty: '10', contractorId: S.K2 });
  await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-27', qty: '4', contractorId: S.K1 });
  const e2 = await S.estimacion({ contractorId: S.K2 }); const e1 = await S.estimacion({ contractorId: S.K1 }); const pago = await S.pagar(e2.ob, '1000');
  const item2 = (await D.get(`/api/c-estimates/${e2.id}`)).items[0];
  t.ok('K1 lee la estimación de K2', 404, await st(S.k1, 'GET', `/api/c-estimates/${e2.id}`));
  t.ok('K1 lee la obligación de K2', 404, await st(S.k1, 'GET', `/api/obligations/${e2.ob}`));
  t.ok('K1 lee el pago de K2', 404, await st(S.k1, 'GET', `/api/disbursements/${pago}`));
  t.ok('K1 pide el recibo PDF de K2', 404, await st(S.k1, 'GET', `/api/documents/preview?type=recibo_pago&id=${pago}&format=pdf`));
  t.ok('K1 pide la estimación PDF de K2', 404, await st(S.k1, 'GET', `/api/documents/preview?type=estimacion_contratista&id=${e2.id}&format=pdf`));
  t.ok('K1 observa una partida de K2', true, [403, 404].includes(await st(S.k1, 'POST', `/api/c-estimates/${e2.id}/observe`, { itemId: item2.id, proposedQty: '1', text: 'intento ajeno' })));
  const mias = await S.k1.get('/api/c-estimates'); t.ok('El listado de K1 no contiene documentos de K2', [], mias.items.filter((x) => x.id === e2.id));
  const estado = await S.k1.get('/api/contractor/statement'); t.ok('El estado de cuenta de K1 no incluye a K2', false, JSON.stringify(estado).includes('K2 Contratista'));
  t.ok('K1 sí ve su propia estimación (compartida al autorizar)', 200, await st(S.k1, 'GET', `/api/c-estimates/${e1.id}`));
  for (const u of ['/api/reports/costos', `/api/works/${S.A}/summary`, '/api/results', '/api/expenses', '/api/rates', '/api/c-estimates', '/api/obligations', `/api/documents/preview?type=reporte_costos&id=${S.A}`, `/api/documents/preview?type=reporte_costos&id=${S.A}&format=pdf`, '/api/analytics/datasets', '/api/home/charts', '/api/audit']) {
    const r = await S.c1.try('GET', u); t.cierto(`C1 no obtiene datos internos en ${u.split('?')[0]}${u.includes('pdf') ? ' (pdf)' : ''}`, [403, 404, 422].includes(r.status) || r.data?.total === 0 || (Array.isArray(r.data?.items) && !r.data.items.length), `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`); }
  const q = await S.c1.try('POST', '/api/analytics/query', { dataset: 'mano_obra' }); t.cierto('C1 no consulta el explorador de reportes', [403, 404].includes(q.status), q.status);
  const xp = await S.c1.try('POST', '/api/analytics/export', { dataset: 'mano_obra', format: 'pdf' }); t.cierto('C1 no exporta reportes a PDF', [403, 404].includes(xp.status), xp.status);
  const xs = await S.s1.try('POST', '/api/analytics/query', { dataset: 'mano_obra' }); t.cierto('S1 (supervisor) no consulta importes de mano de obra en el explorador', [403, 404].includes(xs.status), `${xs.status} ${JSON.stringify(xs.data).slice(0, 160)}`);
  const sv = await S.s1.get('/api/progress'); t.ok('El supervisor no recibe precios en el listado de avances', false, /unitPrice|"price"|amount/.test(JSON.stringify(sv.items)));
});

caso('CAS-03', 'Medición en dos ubicaciones', ['AVA-18', 'EST-02'], async (t) => {
  const S = await escenario(t.env); const D = S.D;
  const a = await S.validado({ locationId: S.sot, conceptId: S.piso, executionDate: '2026-08-27', qty: '15.79' }); const b = await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-28', qty: '25.24' });
  const e = await D.post('/api/c-estimates', { workId: S.A, contractorId: S.K1, periodId: S.per }); await D.post(`/api/c-estimates/${e.id}/generate`, {});
  let doc = await D.get(`/api/c-estimates/${e.id}`); t.ok('Importes por ubicación', ['5526.50', '8834.00'], doc.items.map((i) => i.amount).sort()); t.ok('Total', '14360.50', doc.totals.gross);
  const e2 = await D.post('/api/c-estimates', { workId: S.A, contractorId: S.K1, periodId: (await D.post('/api/periods', { year: 2026, week: 36 })).id }); t.ok('Otra semana no vuelve a incluir la misma ejecución', 0, (await D.post(`/api/c-estimates/${e2.id}/generate`, {})).added);
  const env2 = t.env; const D2 = D; const x = await D2.post('/api/c-estimates', { workId: S.B, contractorId: S.K1, periodId: S.per }); void env2; void x;
  // Agrupado por concepto en un documento nuevo (misma obra/semana no admite dos ordinarias): se prueba regenerando.
  const g = await D.try('POST', `/api/c-estimates/${e.id}/generate`, { groupBy: 'concepto', regroup: true }); t.nota('Reagrupar un documento ya generado', `${g.status} ${JSON.stringify(g.data).slice(0, 160)}`);
  doc = await D.get(`/api/c-estimates/${e.id}`); const qty = doc.items.reduce((s, i) => s + Number(i.qty), 0); t.ok('Cantidad total 41.03 m²', '41.03', qty.toFixed(2));
  const origenes = doc.items.flatMap((i) => i.allocations.map((al) => al.location)).sort(); t.ok('Se conservan los dos orígenes', ['Planta baja', 'Sótano 1'], origenes);
  t.ok('No se creó una tercera ejecución', 2, t.env.store.view().where('progressEntries', (p) => [a, b].includes(p.id) || p.workId === S.A).length);
  t.ok('Cada partida conserva unidad, precio y cálculo', true, doc.items.every((i) => i.unit === 'm2' && i.unitPrice === '350.0000' && i.allocations.every((al) => al.entryId || al.progressEntryId)));
});

caso('CAS-04', 'Acumulado correcto', ['AVA-02', 'AVA-03', 'SEM-12'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const cap = (qty, date) => S.capturar(S.s1, { locationId: S.pb, conceptId: S.piso, executionDate: date, mode: 'acumulado', qty });
  const a = await cap('40', '2026-08-24'); await D.post(`/api/progress/${a.id}/review`, { decision: 'validar' });
  const r = await cap('60', '2026-08-25'); const rj = await D.try('POST', `/api/progress/${r.id}/review`, { decision: 'rechazar', reason: 'Medición no verificada en sitio' }); t.ok('Rechazo del acumulado de 60', 200, rj.status);
  const b = await cap('55', '2026-08-26'); const d = await D.get(`/api/progress/${b.id}`);
  t.ok('Incremento', '15.0000', d.qty); t.ok('Base usada = última validada', '40.0000', d.baseCumulative); t.ok('Acumulado medido', '55.0000', d.cumulativeMeasured);
  await D.post(`/api/progress/${b.id}/review`, { decision: 'validar' }); const e = await S.estimacion({ autorizar: false }); const doc = await D.get(`/api/c-estimates/${e.id}`);
  t.ok('Cantidad en la estimación = 40 + 15 (no 95 ni 115)', '55.00', doc.items.reduce((s, i) => s + Number(i.qty), 0).toFixed(2));
  const it15 = doc.items.flatMap((i) => i.allocations).find((al) => al.qty === '15.0000'); t.cierto('Existe la asignación de 15 m²', !!it15); t.ok('Importe total 55 × 350', '19250.00', doc.totals.gross);
  const otra = await S.capturar(S.s1, { locationId: S.sot, conceptId: S.piso, executionDate: '2026-08-26', mode: 'acumulado', qty: '9' }); t.ok('Otra ubicación no hereda la base', '9.0000', (await D.get(`/api/progress/${otra.id}`)).qty);
});

caso('CAS-05', 'Acumulado menor', ['AVA-04', 'AVA-09', 'AVA-20'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const a = await S.capturar(S.s1, { locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-24', mode: 'acumulado', qty: '55' }); await D.post(`/api/progress/${a.id}/review`, { decision: 'validar' });
  const n = t.env.store.view().count('progressEntries'); const r = await S.s1.try('POST', '/api/progress', { workId: S.A, locationId: S.pb, conceptId: S.piso, contractorId: S.K1, executionDate: '2026-08-26', mode: 'acumulado', qty: '50', submit: true });
  t.ok('Acumulado menor rechazado', 422, r.status); t.nota('Mensaje al usuario', `${r.data.message} | ${r.data.hint || ''}`); t.cierto('El mensaje orienta a la corrección', /ajuste|correcci/i.test(JSON.stringify(r.data)), r.data.message);
  t.ok('No se creó trabajo negativo', n, t.env.store.view().count('progressEntries')); t.ok('La base validada se conserva', '55.0000', (await D.get(`/api/progress/${a.id}`)).qty);
  t.ok('Cantidad negativa directa rechazada', 422, await st(S.s1, 'POST', '/api/progress', { workId: S.A, locationId: S.pb, conceptId: S.piso, contractorId: S.K1, executionDate: '2026-08-26', qty: '-5' }));
  t.ok('Editar la cantidad de un avance validado', true, [403, 409].includes(await st(D, 'PATCH', `/api/progress/${a.id}`, { qty: '50' })));
  const e = await S.estimacion(); const adj = await S.s1.post(`/api/progress/${a.id}/adjustments`, { qtyDelta: '-5', reason: 'Se midió de más el remate (auditoría)' });
  t.ok('El ajuste sin motivo se rechaza', 422, await st(S.s1, 'POST', `/api/progress/${a.id}/adjustments`, { qtyDelta: '-1' }));
  t.ok('Antes de autorizar, la cantidad vigente no cambia', '55.0000', (await D.get(`/api/progress/${a.id}`)).effectiveQty);
  const dec = await D.try('POST', `/api/progress-adjustments/${adj.id}/decide`, { decision: 'autorizar' }); t.nota('Autorizar ajuste −5 con el avance ya en una estimación autorizada', `${dec.status} ${JSON.stringify(dec.data).slice(0, 300)}`);
  const p = await D.get(`/api/progress/${a.id}`); const doc = await D.get(`/api/c-estimates/${e.id}`);
  t.ok('La medición original se conserva', '55.0000', p.qty); t.nota('Cantidad vigente tras decidir', p.effectiveQty); t.ok('La estimación autorizada no cambió por cascada', '19250.00', doc.totals.authorized);
  t.cierto('El ajuste queda vinculado al avance', p.adjustments.length === 1 && p.adjustments[0].qtyDelta === '-5.0000', p.adjustments);
  const ob = await D.get(`/api/obligations/${e.ob}`); t.ok('La obligación no se redujo en silencio', '19250.00', ob.gross);
  t.nota('Documentos afectados informados al decidir', JSON.stringify(dec.data).slice(0, 300));
});

caso('CAS-06', 'Generador', ['AVA-05', 'AVA-06', 'SEM-07'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const g = (ded) => ({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-26', generator: [{ label: 'Tramo', length: '4', width: '3', pieces: '2', deduction: ded }] });
  const r = await S.capturar(S.s1, g('1.5')); const d = await D.get(`/api/progress/${r.id}`); t.ok('Cantidad del generador', '22.5000', d.qty); t.ok('Conserva dimensiones', ['4.0000', '3.0000', '2.0000', '1.5000'], [d.generator[0].length, d.generator[0].width, d.generator[0].pieces, d.generator[0].deduction]);
  t.cierto('Conserva fórmula', /largo/.test(d.generator[0].formula), d.generator[0].formula);
  const ed = await S.s1.try('PATCH', `/api/progress/${r.id}`, { generator: [{ label: 'Tramo', length: '5', width: '3', pieces: '2', deduction: '1.5' }], recordVersion: d.recordVersion }); t.ok('Editar una dimensión (aún reportado)', 200, ed.status); t.ok('El total cambia a 28.5', '28.5000', (await D.get(`/api/progress/${r.id}`)).qty);
  await S.s1.patch(`/api/progress/${r.id}`, { generator: [{ label: 'Tramo', length: '4', width: '3', pieces: '2', deduction: '1.5' }] }); await D.post(`/api/progress/${r.id}/review`, { decision: 'validar' });
  const e = await S.estimacion({ autorizar: false }); t.ok('Importe 22.5 × 350', '7875.00', (await D.get(`/api/c-estimates/${e.id}`)).totals.gross);
  const bad = await S.s1.try('POST', '/api/progress', { workId: S.A, contractorId: S.K1, submit: true, ...g('25') }); t.ok('Deducción mayor al área bruta', 422, bad.status); t.nota('Mensaje', bad.data.message);
  const txt = await S.s1.try('POST', '/api/progress', { workId: S.A, contractorId: S.K1, locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-26', generator: [{ label: 'x', length: 'abc', width: '3' }] }); t.ok('Dimensión no numérica', 422, txt.status);
});

caso('CAS-07', 'Exceso de alcance', ['PRE-07', 'PRE-08', 'ADI-02'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const B = await S.presupuesto([{ chapter: 'PISOS', locationId: S.pb, conceptId: S.kPiso, description: 'Piso planta baja', unitId: S.unit.m2, qty: '100', price: '1280' }]);
  await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-24', qty: '95', budgetItemId: B.items[0] });
  const r = await S.s1.try('POST', '/api/progress', { workId: S.A, contractorId: S.K1, submit: true, locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-26', qty: '10', budgetItemId: B.items[0] });
  t.ok('La captura que excede el presupuesto se puede registrar', 200, r.status); t.nota('Avisos al capturar', JSON.stringify(r.data.warnings || r.data).slice(0, 300)); t.cierto('Se advierte el exceso al capturar', /exce|alcance|presupuest/i.test(JSON.stringify(r.data.warnings || '')), r.data.warnings);
  t.ok('Validar el exceso sin motivo se bloquea', 409, await st(D, 'POST', `/api/progress/${r.data.id}/review`, { decision: 'validar' })); t.ok('S1 no valida su propio exceso', 403, await st(S.s1, 'POST', `/api/progress/${r.data.id}/review`, { decision: 'validar', overBudgetNote: 'me lo apruebo' }));
  await D.post(`/api/progress/${r.data.id}/review`, { decision: 'validar', overBudgetNote: 'Se ejecutó de más por instrucción en obra (auditoría)' }); const tr = await D.get(`/api/works/${S.A}/budget-tracking`); const row = tr.rows.find((x) => x.id === B.items[0]);
  t.nota('Renglón de seguimiento', JSON.stringify(row)); t.ok('Ejecutado 105', '105.0000', row.executedQty); t.ok('Presupuesto vigente sigue en 100', '100.0000', row.currentQty ?? row.budgetQty ?? row.qty);
  t.cierto('El excedente de 5 es visible (no truncado a cero)', JSON.stringify(row).includes('5.0000') && (row.excessQty === '5.0000' || row.pendingQty === '-5.0000' || row.overQty === '5.0000'), { pendingQty: row.pendingQty, excessQty: row.excessQty, state: row.state });
  t.ok('Importe vigente del contrato sin cambio', '128000.00', tr.summary.current);
  const k = await D.post('/api/k-estimates', { workId: S.A, periodFrom: '2026-08-01', periodTo: '2026-08-31' }); await D.post(`/api/k-estimates/${k.id}/generate`, {}); const kd = await D.get(`/api/k-estimates/${k.id}`);
  t.nota('Cantidad propuesta al cliente con exceso', JSON.stringify(kd.items.map((i) => [i.proposedQty, i.contractedQty, i.warnings || i.excess || null]))); t.nota('Avisos de la estimación al cliente', JSON.stringify(kd.warnings || kd.checks || null).slice(0, 300));
});

caso('CAS-08', 'Partida sin ejecución', ['PRE-06', 'PRE-12'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const B = await S.presupuesto([{ chapter: 'BAÑOS', locationId: S.pb, conceptId: S.kPiso, description: 'Limpieza y sellado', unitId: S.unit.m2, qty: '78.3', price: '270' }, { chapter: 'PISOS', locationId: S.sot, conceptId: S.kPiso, description: 'Piso sótano', unitId: S.unit.m2, qty: '10', price: '1280' }]);
  await S.validado({ locationId: S.sot, conceptId: S.piso, executionDate: '2026-08-24', qty: '4', budgetItemId: B.items[1] });
  const tr = await D.get(`/api/works/${S.A}/budget-tracking`); const row = tr.rows.find((x) => x.id === B.items[0]);
  t.ok('Importe presupuestado', '21141.00', row.budgetAmount); t.ok('Ejecutado cero', '0.0000', row.executedQty); t.ok('Pendiente íntegro', '21141.00', row.pendingAmount); t.ok('Estado', 'pendiente', row.state);
  t.ok('No se rotula como pérdida', false, /p[eé]rdida|fuga/i.test(JSON.stringify(row)));
  const csv = await D.try('GET', `/api/works/${S.A}/budget-tracking?format=csv`); t.nota('Exportación CSV del seguimiento (estado y tipo)', `${csv.status} ${Buffer.isBuffer(csv.data) ? 'archivo' : 'json'}`);
  t.cierto('La partida sin ejecución aparece en la exportación', Buffer.isBuffer(csv.data) && csv.data.toString('utf8').includes('Limpieza y sellado'), Buffer.isBuffer(csv.data) ? csv.data.toString('utf8').slice(0, 200) : 'sin exportación CSV del seguimiento');
  const rep = await D.try('GET', '/api/reports/presupuesto-ejecucion'); t.nota('Reporte fijo de presupuesto contra ejecución', `${rep.status} ${rep.status === 200 ? rep.data.total + ' renglones' : ''}`);
  const sum = await D.get(`/api/works/${S.A}/summary`); t.nota('Tarjetas de la obra', JSON.stringify(sum.cards.map((c) => [c.key, c.value])));
});

caso('CAS-09', 'Tarifas distintas', ['TAR-02', 'TAR-12', 'SEM-03'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const B = await S.presupuesto([{ chapter: 'PISOS', locationId: S.pb, conceptId: S.kPiso, description: 'Piso planta baja', unitId: S.unit.m2, qty: '100', price: '1280' }]);
  const en = await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-24', qty: '10', budgetItemId: B.items[0] });
  const e = await S.estimacion(); t.ok('Costo de contratación', '3500.00', e.total);
  const k = await D.post('/api/k-estimates', { workId: S.A, periodFrom: '2026-08-01', periodTo: '2026-08-31' }); await D.post(`/api/k-estimates/${k.id}/generate`, {}); let kd = await D.get(`/api/k-estimates/${k.id}`);
  t.ok('Propuesta comercial', '12800.00', kd.summary.subtotal); t.ok('Mismo avance de origen en los dos circuitos', en, kd.items[0].allocations[0].entryId || kd.items[0].allocations[0].progressEntryId);
  t.ok('Sigue existiendo una sola ejecución', 1, t.env.store.view().count('progressEntries'));
  await D.post('/api/rates', { circuit: 'comercial', conceptId: S.kPiso, price: '1500', validFrom: '2026-01-01' }); t.ok('Cambiar el precio comercial no altera el de contratación', '3500.00', (await D.get(`/api/c-estimates/${e.id}`)).totals.authorized);
  const nuevo = (await D.get('/api/rates')).items.filter((r) => r.conceptId === S.piso && r.status !== 'inactiva'); t.ok('La tarifa de contratación sigue en 350', ['350.0000'], nuevo.map((r) => r.price));
  const sum = await D.get(`/api/works/${S.A}/summary`); t.nota('Margen de la obra', JSON.stringify(sum.margin)); t.ok('El margen se marca como parcial', true, sum.margin.partial);
  t.ok('No se usa la etiqueta "utilidad neta"', false, /utilidad neta/i.test(JSON.stringify(sum)));
});

caso('CAS-10', 'Vigencia de precios', ['TAR-03', 'TAR-04', 'EST-10'], async (t) => {
  const S = await escenario(t.env); const D = S.D; await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-24', qty: '10' }); const e = await S.estimacion();
  await D.post('/api/rates', { circuit: 'contratacion', conceptId: S.piso, price: '400', validFrom: '2026-08-31' });
  t.ok('Documento anterior permanece', '3500.00', (await D.get(`/api/c-estimates/${e.id}`)).totals.authorized);
  const p2 = (await D.post('/api/periods', { year: 2026, week: 36 })).id; await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-09-01', qty: '10' }); const e2 = await S.estimacion({ periodId: p2 }); t.ok('Nueva partida usa 400', '4000.00', e2.total);
  await S.validado({ locationId: S.sot, conceptId: S.piso, executionDate: '2026-08-30', qty: '10' }); const p3 = (await D.post('/api/periods', { year: 2026, week: 37 })).id; const e3 = await S.estimacion({ periodId: p3 }); t.nota('Avance con fecha anterior a la vigencia, estimado después (precio aplicado)', e3.total);
  const doc = await D.get(`/api/documents/preview?type=estimacion_contratista&id=${e.id}&audience=interno`); t.ok('Reemitir el histórico conserva 3,500', '3500.00', doc.model.sections[0].rows[0].amount); t.ok('La vista previa no es borrador', false, doc.draft);
  const fz = await D.get(`/api/c-estimates/${e.id}/versions/1`); t.ok('La versión congelada guarda el origen del precio', '350.0000', fz.items[0].rate?.price);
  const ed = await D.try('PATCH', `/api/catalog/rates/${S.ratePiso}`, { price: '1' }); t.cierto('La tarifa no se edita en sitio', [403, 404, 405, 409, 422].includes(ed.status), ed.status);
  const sol = await D.try('POST', '/api/rates', { circuit: 'contratacion', conceptId: S.piso, price: '410', validFrom: '2026-08-31' }); t.nota('Segunda tarifa con la misma vigencia y alcance (precedencia determinista)', `${sol.status} ${JSON.stringify(sol.data).slice(0, 200)}`);
});

caso('CAS-11', 'Precio ausente', ['TAR-09', 'AVA-13'], async (t) => {
  const S = await escenario(t.env); const D = S.D; await S.validado({ locationId: S.pb, conceptId: S.sinTarifa, executionDate: '2026-08-24', qty: '10' });
  const e = await S.estimacion({ autorizar: false }); let doc = await D.get(`/api/c-estimates/${e.id}`); const it = doc.items[0];
  t.ok('Importe indeterminado (no cero)', null, it.amount); t.ok('Marcada por valorar', true, it.pendingValuation); t.ok('Total bruto no la suma como cero silencioso', '0.00', doc.totals.gross);
  await D.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_interna' }); const au = await D.try('POST', `/api/c-estimates/${e.id}/authorize`, { exceptionReason: 'auditoría' }); t.ok('Autorización bloqueada', 409, au.status); t.nota('Explicación', `${au.data.message} ${JSON.stringify(au.data.details || '').slice(0, 200)}`);
  const pa = await D.try('POST', `/api/c-estimates/${e.id}/authorize`, { exceptionReason: 'auditoría', partial: true }); t.nota('Autorización parcial con solo partidas sin precio', `${pa.status} ${JSON.stringify(pa.data).slice(0, 200)}`);
  const z0 = await D.try('POST', `/api/c-estimates/${e.id}/items/${it.id}/price`, { unitPrice: '0' }); t.cierto('Precio cero sin motivo se rechaza', [409, 422].includes(z0.status), z0.status);
  const z1 = await D.try('POST', `/api/c-estimates/${e.id}/items/${it.id}/price`, { unitPrice: '0', reason: 'DCL absorbe el detalle por acuerdo de dirección (auditoría)' }); t.nota('Precio cero explícito con motivo', `${z1.status} ${JSON.stringify(z1.data).slice(0, 200)}`); const dz = await D.get(`/api/c-estimates/${e.id}`); t.nota('Partida tras el precio cero explícito', JSON.stringify({ amount: dz.items[0].amount, pendingValuation: dz.items[0].pendingValuation, exceptional: dz.items[0].rate?.exceptional, motivo: dz.items[0].rate?.reason || dz.items[0].priceReason }));
  t.ok('S1 no fija precio', true, [403, 404].includes(await st(S.s1, 'POST', `/api/c-estimates/${e.id}/items/${it.id}/price`, { unitPrice: '999', reason: 'intento sin facultad' })));
  const inc = await S.s1.try('POST', '/api/progress', { workId: S.A, locationId: S.pb, executionDate: '2026-08-24' }); t.nota('Borrador incompleto (sin concepto ni cantidad)', `${inc.status} ${inc.data.message || ''}`);
  const env = await S.s1.try('POST', '/api/progress', { workId: S.A, locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-24', submit: true }); t.ok('Enviar sin cantidad se rechaza', 422, env.status);
});

caso('CAS-12', 'Cambio después de aceptación', ['EST-07', 'EST-08'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const en = await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-24', qty: '20' });
  const e = await S.estimacion({ autorizar: false }); await D.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_interna' }); await D.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_contratista' });
  const acc = await S.k1.post(`/api/c-estimates/${e.id}/accept`, { version: 1 }); t.ok('K1 acepta la versión 1', 'lista_autorizar', acc.status); let doc = await D.get(`/api/c-estimates/${e.id}`); t.ok('Importe aceptado', '7000.00', doc.totals.gross);
  t.ok('La conformidad identifica versión, persona y fecha', [1, 'K1 usuario (auditoría)', true], [doc.conformity.version, doc.conformity.actorName, !!doc.conformity.at || !!doc.conformity.acceptedAt || !!doc.conformity.createdAt]);
  const adj = await D.try('POST', `/api/progress/${en}/adjustments`, { qtyDelta: '2', reason: 'Dirección corrige a 22 m² (auditoría)' }); t.nota('Dirección propone +2 m²', `${adj.status} ${JSON.stringify(adj.data).slice(0, 200)}`);
  if (adj.status === 200) { const dec = await D.try('POST', `/api/progress-adjustments/${adj.data.id}/decide`, { decision: 'autorizar' }); t.nota('Decidir el ajuste', `${dec.status} ${JSON.stringify(dec.data).slice(0, 300)}`); }
  doc = await D.get(`/api/c-estimates/${e.id}`); t.nota('Estado tras el cambio', JSON.stringify({ status: doc.status, version: doc.version, gross: doc.totals.gross, conformity: doc.conformity && { version: doc.conformity.version, valid: doc.conformity.valid } }));
  const au = await D.try('POST', `/api/c-estimates/${e.id}/authorize`, {}); t.nota('Autorizar tras el cambio sin nueva aceptación', `${au.status} ${JSON.stringify(au.data).slice(0, 300)}`);
  const pagaria = au.status === 200 ? au.data.authorizedTotal : null; t.cierto('No se autorizan $7,700 bajo la aceptación de $7,000', !(au.status === 200 && pagaria === '7700.00'), { status: au.status, authorizedTotal: pagaria });
  t.cierto('Si se autorizó, fue por el importe aceptado', au.status !== 200 || pagaria === '7000.00', pagaria);
});

caso('CAS-13', 'Aprobación parcial', ['EST-05', 'EST-06', 'CIE-06'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const a = await S.validado({ locationId: S.pb, conceptId: S.canto, executionDate: '2026-08-24', qty: '62.5' }); const b = await S.validado({ locationId: S.sot, conceptId: S.canto, executionDate: '2026-08-24', qty: '25' });
  const e = await S.estimacion({ autorizar: false }); await D.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_interna' }); await D.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_contratista' });
  const cd = await S.k1.get(`/api/c-estimates/${e.id}`); const i5 = cd.items.find((i) => i.amount === '5000.00'), i2 = cd.items.find((i) => i.amount === '2000.00');
  await S.k1.post(`/api/c-estimates/${e.id}/accept`, { itemIds: [i5.id] }); await S.k1.post(`/api/c-estimates/${e.id}/observe`, { itemId: i2.id, proposedQty: '30', text: 'Faltó un tramo (auditoría)' });
  const pol = (await D.get('/api/settings')).items.find((x) => x.key === 'policy.partialAuthorization'); t.nota('Parámetro policy.partialAuthorization de fábrica', JSON.stringify({ value: pol?.value, requiresDecision: pol?.requiresDecision }));
  await D.call('PUT', '/api/settings/policy.partialAuthorization', { value: false, reason: 'Auditoría: probar política sin parciales' }); const blq = await D.try('POST', `/api/c-estimates/${e.id}/authorize`, {}); t.ok('Con la política de parciales desactivada, la autorización se bloquea', 409, blq.status); t.nota('Explicación del bloqueo', JSON.stringify(blq.data).slice(0, 300));
  await D.call('PUT', '/api/settings/policy.partialAuthorization', { value: true, reason: 'Auditoría: restablecer' });
  const au = await D.post(`/api/c-estimates/${e.id}/authorize`, {}); t.ok('Autorizado', '5000.00', au.authorizedTotal); t.ok('Excluidas', 1, au.excluded);
  const doc = await D.get(`/api/c-estimates/${e.id}`); t.ok('Estados por partida', ['autorizada', 'diferida'], doc.items.map((i) => i.status).sort());
  const bd = await D.get(`/api/closes/board?periodId=${S.per}`); t.nota('Tablero de cierre: pendientes informados', JSON.stringify(bd.checks.find((c) => c.code === 'pendientes') || null).slice(0, 300)); t.ok('Bruto por cerrar', '5000.00', bd.totals.grossToClose);
  t.cierto('El tablero muestra la partida excluida y su motivo', /diferid|observad|excluid/i.test(JSON.stringify(bd)), 'sin mención de partidas excluidas en el tablero');
  const cl = await D.post('/api/closes', { periodId: S.per }); t.ok('El cierre liquida solo lo autorizado', '5000.00', cl.totals.gross);
  t.ok('La ejecución diferida no quedó pagada', '0.0000', (await D.get(`/api/progress/${b}`)).paidQty); t.ok('La autorizada sí quedó asignada', '62.5000', (await D.get(`/api/progress/${a}`)).paidQty);
  const p2 = (await D.post('/api/periods', { year: 2026, week: 36 })).id; const e2 = await D.post('/api/c-estimates', { workId: S.A, contractorId: S.K1, periodId: p2 }); const g2 = await D.post(`/api/c-estimates/${e2.id}/generate`, {});
  t.ok('Los $2,000 diferidos quedan disponibles para la semana siguiente', 1, g2.added); t.ok('Importe recuperado', '2000.00', (await D.get(`/api/c-estimates/${e2.id}`)).totals.gross);
});

caso('CAS-14', 'Observación del contratista', ['EST-03', 'EST-04'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const en = await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-24', qty: '10' });
  const e = await S.estimacion({ autorizar: false }); await D.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_interna' }); await D.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_contratista' });
  const it = (await S.k1.get(`/api/c-estimates/${e.id}`)).items[0]; const obs = await S.k1.post(`/api/c-estimates/${e.id}/observe`, { itemId: it.id, proposedQty: '12', text: 'Medí 12 m² (auditoría)' });
  t.ok('La captura original no cambia', '10.0000', (await D.get(`/api/progress/${en}`)).qty); let doc = await D.get(`/api/c-estimates/${e.id}`);
  const o = doc.items[0].observations[0]; t.ok('Se conservan reportado y propuesto', ['10.0000', '12.0000'], [doc.items[0].qty, o.proposedQty]);
  t.ok('K1 edita la captura por API', true, [403, 404].includes(await st(S.k1, 'PATCH', `/api/progress/${en}`, { qty: '12' })));
  t.ok('K1 cambia el precio por API', true, [403, 404].includes(await st(S.k1, 'POST', `/api/c-estimates/${e.id}/items/${it.id}/price`, { price: '999', reason: 'intento del contratista' })));
  t.ok('K1 resuelve su propia observación', true, [403, 404].includes(await st(S.k1, 'POST', `/api/observations/${obs.id}/resolve`, { resolution: 'aceptada', note: 'me la acepto' })));
  t.ok('S1 resuelve la observación', true, [403, 404].includes(await st(S.s1, 'POST', `/api/observations/${obs.id}/resolve`, { resolution: 'aceptada', note: 'sin facultad' })));
  t.ok('Resolver sin motivo', 422, await st(D, 'POST', `/api/observations/${obs.id}/resolve`, { resolution: 'aceptada' }));
  const r = await D.post(`/api/observations/${obs.id}/resolve`, { resolution: 'parcial', resolvedQty: '11', note: 'Se verificó 11 m² en sitio (auditoría)' }); t.nota('Resolución parcial a 11', JSON.stringify(r).slice(0, 300));
  doc = await D.get(`/api/c-estimates/${e.id}`); const o2 = doc.items[0].observations[0]; t.nota('Reportado / propuesto / acordado', JSON.stringify({ reportado: o2.before?.qty, propuesto: o2.proposedQty, acordado: o2.after?.qty, por: o2.resolvedBy, nota: o2.resolutionNote }));
  t.ok('Quedan visibles reportado, propuesto y acordado', ['10.0000', '12.0000', '11.0000'], [o2.before?.qty, o2.proposedQty, o2.after?.qty]); t.cierto('Con persona y motivo', !!o2.resolvedBy && !!o2.resolutionNote, o2);
  const pe = await D.get(`/api/progress/${en}`); t.ok('La medición del supervisor sigue en 10 y la vigente es 11', ['10.0000', '11.0000'], [pe.qty, pe.effectiveQty]); t.ok('La resolución creó versión nueva', 2, doc.version);
  t.ok('La aceptación de la versión 1 ya no sirve', 409, await st(S.k1, 'POST', `/api/c-estimates/${e.id}/accept`, { version: 1 }));
});

caso('CAS-15', 'Adicional absorbido', ['ADI-03', 'ADI-05', 'ADI-06'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const a = await S.s1.post('/api/additionals', { workId: S.A, locationId: S.pb, date: '2026-08-26', description: 'Reposición de pieza dañada (auditoría)', kind: 'reposicion', executorId: S.K1, executed: true, qty: '1', unitId: S.unit.lote });
  const ph = await S.s1.upload('ad.jpg', TINY_JPG, { kind: 'foto', workId: S.A }); await S.s1.post('/api/evidence', { attachmentId: ph.id, objectType: 'additional', objectId: a.id });
  await D.post(`/api/additionals/${a.id}/operation`, { status: 'validado' }); await D.post(`/api/additionals/${a.id}/cost`, { amount: '1000' });
  let d = await D.get(`/api/additionals/${a.id}`); t.ok('Tres decisiones separadas', ['validado', 'autorizado', 'pendiente'], [d.opStatus, d.costStatus, d.saleStatus]); t.ok('Exposición', '1000.00', d.exposure);
  const e = await S.estimacion(); t.ok('Obligación con el contratista', '1000.00', e.total); let ar = await D.get('/api/receivables'); t.ok('La cuenta por cobrar no aumenta', '0.00', ar.summary.approvedBalance);
  const k = await D.post('/api/k-estimates', { workId: S.A, periodFrom: '2026-08-01', periodTo: '2026-08-31' }); t.ok('No se puede cobrar al cliente sin aprobación comercial', 409, await st(D, 'POST', `/api/k-estimates/${k.id}/items`, { additionalId: a.id, proposedQty: '1' }));
  await D.post(`/api/additionals/${a.id}/sale`, { status: 'rechazado_cliente', reason: 'El cliente no aceptó (auditoría)' }); t.ok('La obligación con el contratista permanece', '1000.00', (await D.get(`/api/obligations/${e.ob}`)).gross);
  t.ok('Absorber sin motivo', true, [409, 422].includes(await st(D, 'POST', `/api/additionals/${a.id}/sale`, { status: 'absorbido' })));
  const ab = await D.try('POST', `/api/additionals/${a.id}/sale`, { status: 'absorbido', reason: 'DCL absorbe el costo por decisión de dirección (auditoría)' }); t.ok('Absorber con motivo', 200, ab.status);
  d = await D.get(`/api/additionals/${a.id}`); t.ok('El costo permanece con motivo y responsable', ['absorbido', '1000.00', true, true], [d.saleStatus, d.costAmount, !!d.saleNote, !!d.saleBy]);
  t.ok('La cantidad no se puso en cero', '1.0000', d.qty); t.nota('Exposición tras absorber', d.exposure); ar = await D.get('/api/receivables'); t.ok('Sigue sin cuenta por cobrar', '0.00', ar.summary.approvedBalance);
  t.ok('S1 no ve importes del adicional', [undefined, undefined], [(await S.s1.get(`/api/additionals/${a.id}`)).costAmount, (await S.s1.get(`/api/additionals/${a.id}`)).saleAmount]);
});

caso('CAS-16', 'Aditiva propuesta', ['PRE-04', 'ADI-08'], async (t) => {
  const S = await escenario(t.env); const D = S.D; await S.presupuesto([{ chapter: 'PISOS', locationId: S.pb, conceptId: S.kPiso, description: 'Piso planta baja', unitId: S.unit.m2, qty: '100', price: '1000' }]);
  const co = (kind, qty) => D.post(`/api/works/${S.A}/change-orders`, { kind, changeType: 'cambio_cantidad', reason: `Cambio de alcance ${kind} (auditoría)`, items: [{ description: 'Piso planta baja', unitId: S.unit.m2, qtyDelta: qty, price: '1000', locationId: S.pb }] });
  const ad = await co('aditiva', '10'); const de = await co('deductiva', '5');
  const ap = await D.try('POST', `/api/change-orders/${de.id}/decide`, { status: 'aprobada', clientApprovedByName: 'Representante C1 (auditoría)', effectiveDate: '2026-08-20', reason: 'Aprobada por correo (auditoría)' }); t.ok('Aprobar la deductiva', 200, ap.status); if (ap.status !== 200) t.nota('Respuesta', JSON.stringify(ap.data));
  let tr = await D.get(`/api/works/${S.A}/budget-tracking`); t.nota('Resumen', JSON.stringify(tr.summary)); t.ok('Vigente aprobado', '95000.00', tr.summary.current); t.ok('Original', '100000.00', tr.summary.original);
  t.cierto('La aditiva pendiente se muestra separada', JSON.stringify(tr.summary).includes('10000.00') && tr.summary.current === '95000.00', tr.summary);
  const ap2 = await D.try('POST', `/api/change-orders/${ad.id}/decide`, { status: 'aprobada', clientApprovedByName: 'Representante C1 (auditoría)', effectiveDate: '2026-08-21', reason: 'Aprobada por correo (auditoría)' }); t.ok('Aprobar la aditiva', 200, ap2.status);
  tr = await D.get(`/api/works/${S.A}/budget-tracking`); t.ok('Vigente tras aceptar', '105000.00', tr.summary.current);
  const pend = await co('aditiva', '3'); t.ok('S1 no aprueba modificaciones', true, [403, 404].includes(await st(S.s1, 'POST', `/api/change-orders/${pend.id}/decide`, { status: 'aprobada', clientApprovedByName: 'x' }))); t.ok('S1 no propone modificaciones', true, [403, 404].includes(await st(S.s1, 'POST', `/api/works/${S.A}/change-orders`, { kind: 'aditiva', changeType: 'cambio_cantidad', reason: 'intento', items: [{ description: 'x', unitId: S.unit.m2, qtyDelta: '1', price: '1' }] })));
  t.ok('Una modificación aprobada no se vuelve a decidir', 409, await st(D, 'POST', `/api/change-orders/${ad.id}/decide`, { status: 'rechazada', reason: 'x' }));
  const sinEv = await co('aditiva', '1'); const r = await D.try('POST', `/api/change-orders/${sinEv.id}/decide`, { status: 'aprobada' }); t.nota('Aprobar sin indicar quién aprobó por el cliente', `${r.status} ${r.data.message || ''}`);
});

caso('CAS-17', 'Jornada repartida', ['JOR-03', 'GAS-03'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const w = await D.try('POST', '/api/catalog/workers', { name: 'Trabajador (auditoría)', contractorId: S.K1 }); if (w.status !== 200) throw Object.assign(new Error('No se pudo crear el trabajador'), { data: w.data });
  const body = (allocs, extra = {}) => ({ workerId: w.data.id, date: '2026-08-26', qty: '1', rate: '600', allocations: allocs, ...extra });
  const j = await D.try('POST', '/api/workdays', body([{ workId: S.A, qty: '0.6' }, { workId: S.B, qty: '0.4' }])); t.ok('Jornada 60/40', 200, j.status); t.nota('Respuesta', JSON.stringify(j.data).slice(0, 400));
  const list = await D.get('/api/workdays'); const row = list.items.find((x) => x.id === j.data.id); t.nota('Renglón', JSON.stringify(row).slice(0, 500)); t.ok('Importe total', '600.00', row?.amount);
  const als = t.env.store.view().where('workdayAllocations', (x) => x.workdayId === j.data.id); t.ok('Distribución', ['240.00', '360.00'], als.map((x) => x.amount).sort()); t.ok('Una sola jornada', 1, t.env.store.view().count('workdays'));
  t.ok('Distribuir 120 %', 422, await st(D, 'POST', '/api/workdays', body([{ workId: S.A, qty: '0.6' }, { workId: S.B, qty: '0.6' }], { date: '2026-08-27' })));
  const seg = await D.try('POST', '/api/workdays', body([{ workId: S.A, qty: '1' }])); t.ok('Segunda jornada completa el mismo día sin justificar', 409, seg.status);
  t.ok('S1 no captura jornada en B', 403, await st(S.s1, 'POST', '/api/workdays', body([{ workId: S.B, qty: '1' }], { date: '2026-08-28' })));
  const ap = await D.try('POST', `/api/workdays/${j.data.id}/decide`, { decision: 'aprobar' }); t.nota('Aprobar la jornada', `${ap.status} ${JSON.stringify(ap.data).slice(0, 200)}`);
  const eA = await D.post('/api/c-estimates', { workId: S.A, contractorId: S.K1, periodId: S.per }); const g = await D.post(`/api/c-estimates/${eA.id}/generate`, {}); const doc = await D.get(`/api/c-estimates/${eA.id}`); t.nota('Estimación de A con la jornada', JSON.stringify({ added: g.added, items: doc.items.map((i) => [i.description, i.method, i.amount]) }));
  t.ok('La obra A recibe $360 de la jornada', '360.00', doc.totals.gross);
});

caso('CAS-18', 'Evidencia pendiente', ['EVI-03', 'EVI-04'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const a = await S.s1.post('/api/additionals', { workId: S.A, locationId: S.pb, date: '2026-08-26', description: 'Apertura adicional (auditoría)', kind: 'trabajo_nuevo', executorId: S.K1, executed: true, qty: '1', unitId: S.unit.lote });
  t.ok('Validar el adicional sin foto', 409, await st(D, 'POST', `/api/additionals/${a.id}/operation`, { status: 'validado' })); t.ok('El adicional se conserva reportado', 'reportado', (await D.get(`/api/additionals/${a.id}`)).opStatus);
  const fake = await S.s1.try('POST', '/api/evidence', { attachmentId: '00000000-0000-4000-8000-000000000000', objectType: 'additional', objectId: a.id }); t.cierto('Vincular un adjunto que no existe (carga fallida) se rechaza', [404, 409, 422].includes(fake.status), fake.status);
  t.ok('Sigue sin evidencia', 0, (await D.get(`/api/additionals/${a.id}`)).evidence?.length ?? (await D.get(`/api/additionals/${a.id}`)).evidenceCount ?? 0);
  const vacio = await S.s1.call('POST', '/api/attachments?name=vacia.jpg&kind=foto&workId=' + S.A, Buffer.alloc(0)).catch((e) => ({ status: e.status || 0, data: e.data })); t.nota('Carga de un archivo vacío', `${vacio.status} ${JSON.stringify(vacio.data).slice(0, 160)}`);
  const url = `/api/attachments?${new URLSearchParams({ name: 'ad.jpg', kind: 'foto', workId: S.A })}`; const k1 = await S.s1.call('POST', url, TINY_JPG, { key: 'carga-ad-1' }); const k2 = await S.s1.call('POST', url, TINY_JPG, { key: 'carga-ad-1' }); t.ok('Reintento de la carga con la misma clave de operación devuelve el mismo adjunto', k1.data.id, k2.data.id);
  const u1 = k1.data; const u2 = await S.s1.upload('ad.jpg', TINY_JPG, { kind: 'foto', workId: S.A }); t.nota('Segunda carga del mismo archivo sin clave (p. ej. el usuario lo vuelve a elegir)', JSON.stringify({ mismoId: u1.id === u2.id, mismoHash: u1.sha256 === u2.sha256 }));
  await S.s1.post('/api/evidence', { attachmentId: u1.id, objectType: 'additional', objectId: a.id }); const dup = await S.s1.try('POST', '/api/evidence', { attachmentId: u2.id, objectType: 'additional', objectId: a.id });
  const evs = t.env.store.view().where('evidenceLinks', (x) => x.objectId === a.id && !x.archivedAt); t.nota('Vínculos de evidencia tras elegir dos veces la misma foto', `${evs.length} (segundo vínculo: ${dup.status})`); t.ok('La misma fotografía (mismo contenido) no cuenta dos veces como evidencia', 1, evs.length);
  t.ok('Con evidencia confirmada sí se valida', 200, await st(D, 'POST', `/api/additionals/${a.id}/operation`, { status: 'validado' }));
  const o = await S.capturar(S.s1, { locationId: S.pb, conceptId: S.oculto, executionDate: '2026-08-26', qty: '12' }); t.ok('Trabajo oculto sin foto no se valida', 409, await st(D, 'POST', `/api/progress/${o.id}/review`, { decision: 'validar' }));
  t.ok('Excepción sin motivo', 422, await st(D, 'POST', `/api/progress/${o.id}/evidence-exception`, {})); t.ok('S1 no concede la excepción', 403, await st(S.s1, 'POST', `/api/progress/${o.id}/evidence-exception`, { reason: 'me la concedo' }));
  await D.post(`/api/progress/${o.id}/evidence-exception`, { reason: 'Teléfono extraviado; verificado en sitio (auditoría)' }); await D.post(`/api/progress/${o.id}/review`, { decision: 'validar' }); const p = await D.get(`/api/progress/${o.id}`);
  t.cierto('La excepción queda visible con motivo y responsable', /Teléfono extraviado/.test(JSON.stringify(p)) && /D1 Dirección/.test(JSON.stringify(p)), JSON.stringify(p.evidenceException || p.exception || null));
  const b = await S.s1.post('/api/additionals', { workId: S.A, locationId: S.pb, date: '2026-08-26', description: 'Otro adicional sin foto (auditoría)', kind: 'trabajo_nuevo', executorId: S.K1, executed: true, qty: '1', unitId: S.unit.lote });
  const ex = await D.try('POST', `/api/additionals/${b.id}/operation`, { status: 'validado', evidenceException: 'Sin foto por causa justificada (auditoría)', reason: 'Sin foto por causa justificada (auditoría)' }); t.nota('Excepción de evidencia para un adicional', `${ex.status} ${ex.data.message || ''}`);
});

caso('CAS-19', 'Cambio de plano', ['EVI-08', 'EVI-09', 'DOC-02'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const B = await S.presupuesto([{ chapter: 'PISOS', locationId: S.pb, conceptId: S.kPiso, description: 'Piso planta baja', unitId: S.unit.m2, qty: '100', price: '1280' }]);
  await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-24', qty: '10', budgetItemId: B.items[0] });
  const f1 = await D.upload('plano-v1.jpg', TINY_JPG, { kind: 'plano', workId: S.A }); const pl = await D.post(`/api/works/${S.A}/plans`, { name: 'Planta baja (auditoría)', attachmentId: f1.id });
  let plans = await D.get(`/api/works/${S.A}/plans`); const v1 = plans.items[0].versions.find((v) => v.version === 1);
  const an = await D.post(`/api/plan-versions/${v1.id}/annotations`, { shape: 'punto', points: [[0.25, 0.4]], page: 1, label: 'Zona ejecutada (auditoría)' }); t.nota('Anotación creada', JSON.stringify(an).slice(0, 200));
  const k = await D.post('/api/k-estimates', { workId: S.A, periodFrom: '2026-08-01', periodTo: '2026-08-31' }); await D.post(`/api/k-estimates/${k.id}/generate`, {}); const kd = await D.get(`/api/k-estimates/${k.id}`);
  const ln = await D.try('POST', `/api/annotations/${an.id}/links`, { objectType: 'kEstimate', objectId: k.id }); t.nota('Vincular la marca a la partida comercial', `${ln.status} ${JSON.stringify(ln.data).slice(0, 200)}`);
  await D.post(`/api/k-estimates/${k.id}/transition`, { to: 'revision_interna' }); await D.post(`/api/k-estimates/${k.id}/transition`, { to: 'enviada' });
  const pub1 = await S.c1.get(`/api/k-estimates/${k.id}`); t.nota('Planos en el documento publicado', JSON.stringify(pub1.plans || null).slice(0, 300));
  const f2 = await D.upload('plano-v2.png', Buffer.concat([TINY_JPG, Buffer.from('v2')]), { kind: 'plano', workId: S.A }).catch((e) => ({ err: e.data || e.message }));
  const f2ok = f2.id ? f2 : await D.upload('plano-v2.jpg', TINY_JPG, { kind: 'plano', workId: S.A, note: 'v2' }); const v2 = await D.post(`/api/plans/${pl.id}/versions`, { attachmentId: f2ok.id });
  plans = await D.get(`/api/works/${S.A}/plans`); const vs = plans.items[0].versions; t.ok('Versiones del plano', [['sustituida', 1], ['vigente', 2]], vs.map((v) => [v.status, v.version]).sort());
  const a1 = t.env.store.view().where('planAnnotations', (x) => x.planVersionId === v1.id && !x.archivedAt).length, a2 = t.env.store.view().where('planAnnotations', (x) => x.planVersionId === v2.id && !x.archivedAt).length;
  t.ok('La marca permanece en la versión 1 y no se mueve sola a la 2', [1, 0], [a1, a2]);
  const an0 = t.env.store.view().get('planAnnotations', an.id); t.ok('La anotación conserva versión, página y coordenadas', [v1.id, 1, [[0.25, 0.4]]], [an0.planVersionId, an0.page, an0.points.p || an0.points]);
  const pub2 = await S.c1.get(`/api/k-estimates/${k.id}`); t.ok('El documento publicado no cambió por subir el plano nuevo', JSON.stringify(pub1.plans || null), JSON.stringify(pub2.plans || null));
  t.cierto('El documento publicado incluye el plano y referencia la versión 1', pub2.plans?.length === 1 && pub2.plans[0].version === 1, pub2.plans);
  t.ok('C1 no anota planos', true, [403, 404].includes(await st(S.c1, 'POST', `/api/plan-versions/${v1.id}/annotations`, { shape: 'punto', points: [[0.1, 0.1]] })));
  t.ok('Coordenadas fuera de rango', 422, await st(D, 'POST', `/api/plan-versions/${v2.id}/annotations`, { shape: 'punto', points: [[1.4, 0.1]] }));
});

caso('CAS-20', 'Retrabajo', ['AVA-08', 'ADI-11'], async (t) => {
  const S = await escenario(t.env); const D = S.D; const B = await S.presupuesto([{ chapter: 'PISOS', locationId: S.pb, conceptId: S.kPiso, description: 'Piso planta baja', unitId: S.unit.m2, qty: '100', price: '1280' }]);
  const o = await S.validado({ locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-24', qty: '20', budgetItemId: B.items[0] });
  const sinClase = await S.s1.try('POST', '/api/progress', { workId: S.A, contractorId: S.K1, submit: true, locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-26', qty: '5', workType: 'retrabajo', budgetItemId: B.items[0] }); t.nota('Retrabajo sin clasificar la causa', `${sinClase.status} ${sinClase.data.message || ''}`);
  const rw = await S.s1.try('POST', '/api/progress', { workId: S.A, contractorId: S.K1, submit: true, locationId: S.pb, conceptId: S.piso, executionDate: '2026-08-26', qty: '5', workType: 'retrabajo', reworkKind: 'error_instalacion', relatedEntryId: o, description: 'Reparación de 5 m² ya entregados (auditoría)', budgetItemId: B.items[0] });
  t.ok('Capturar el retrabajo', 200, rw.status); if (rw.status !== 200) { t.nota('Respuesta', JSON.stringify(rw.data)); return; } await D.post(`/api/progress/${rw.data.id}/review`, { decision: 'validar' });
  const tr = await D.get(`/api/works/${S.A}/budget-tracking`); const row = tr.rows.find((x) => x.id === B.items[0]); t.ok('Ejecución entregada sigue en 20 (no 25)', '20.0000', row.executedQty);
  const bill = await D.get(`/api/works/${S.A}/billable`); t.ok('Lo cobrable al cliente son 20 m²', '20.00', bill.items.reduce((s, i) => s + Number(i.available), 0).toFixed(2));
  const e = await S.estimacion({ autorizar: false }); const doc = await D.get(`/api/c-estimates/${e.id}`); t.nota('Estimación del contratista', JSON.stringify(doc.items.map((i) => [i.description, i.qty, i.amount, i.workType || i.kind || null])));
  t.cierto('El costo de la reparación queda identificado como retrabajo', /retrabajo|reparaci/i.test(JSON.stringify(doc.items)), doc.items.map((i) => i.description));
  const lib = await S.capturar(S.s1, { locationId: S.sot, conceptId: S.piso, executionDate: '2026-08-26', qty: '3', workType: 'retrabajo', reworkKind: 'error_instalacion', description: 'Retrabajo sin partida de presupuesto (auditoría)' }); await D.post(`/api/progress/${lib.id}/review`, { decision: 'validar' }); const bill2 = await D.get(`/api/works/${S.A}/billable`); t.nota('Cobrable tras un retrabajo sin partida de presupuesto', JSON.stringify(bill2.items.map((i) => [i.available, i.workType || null, i.budgetItemId ? 'con partida' : 'sin partida'])));
  const rep = await D.try('GET', '/api/reports/retrabajos'); t.nota('Reporte de retrabajos', `${rep.status} ${rep.status === 200 ? JSON.stringify(rep.data.items).slice(0, 300) : ''}`);
});

const solo = process.argv.slice(2); await ejecutar('casos-01-20', solo.length ? solo : null);
