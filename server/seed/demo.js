// Conjunto de DEMOSTRACIÓN: datos ficticios, aislados en su propia carpeta y construidos por medio de
// la API real (mismas reglas, permisos y auditoría que la operación). Ningún nombre, cuenta, tarifa o
// saldo corresponde a DCL: son ejemplos para recorrer los flujos.
import fs from 'node:fs';
import { buildApp } from '../app.js';
import { seedBase } from './base.js';
import { client, createUser, TINY_JPG, TINY_PNG } from './client.js';
import { localDate, addDays, weekOf } from '../domain/dates.js';

export const DEMO_PASSWORD = 'demo-dcl-2026';
const ACCOUNTS = [
  ['lucia', 'Lucía (demo) · Dirección', 'direccion'], ['luis', 'Luis (demo) · Coordinación', 'coordinacion'], ['supervisor', 'Supervisor Uno (demo)', 'supervisor'], ['supervisor2', 'Supervisor Dos (demo)', 'supervisor'],
  ['auxiliar', 'Auxiliar administrativa (demo)', 'auxiliar'], ['tesoreria', 'Tesorería (demo)', 'tesoreria'], ['admin', 'Administración técnica (demo)', 'admin_tecnico'], ['auditor', 'Auditoría (demo)', 'auditor'],
  ['contratista', 'Cuadrilla Norte (demo) · Contratista', 'contratista'], ['contratista2', 'Instaladores Sur (demo) · Contratista', 'contratista'], ['cliente', 'Arquitectura Ficticia (demo) · Cliente', 'cliente'],
];

export async function seedDemo(config, { keepOpen = false } = {}) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const app = await buildApp({ ...config, demo: true }, { create: { dataset: 'demo', organizationName: 'DCL Instalaciones (DEMOSTRACIÓN)' } });
  const { store, auth } = app;
  store.tx({ action: 'semilla_base' }, (tx) => { seedBase(tx); tx.insert('settings', { key: 'demo.accounts', value: { v: ACCOUNTS.map(([username, name]) => ({ username, name })) }, description: 'Cuentas del conjunto de demostración.', requiresDecision: false }); });
  const server = await app.listen(0, '127.0.0.1'); const base = `http://127.0.0.1:${server.address().port}`;
  const U = {}; const mk = (username, name, role, extra = {}) => { U[username] = createUser(store, auth, { username, name, role, password: DEMO_PASSWORD, ...extra }); };
  for (const [u, n, r] of ACCOUNTS.filter((a) => ['direccion', 'auxiliar', 'tesoreria', 'admin_tecnico', 'auditor'].includes(a[2]))) mk(u, n, r);
  const as = async (u) => { const c = client(base); await c.login(u, DEMO_PASSWORD); return c; };
  try {
    const L = await as('lucia');
    const today = localDate(); const w0 = weekOf(today), w1 = weekOf(addDays(w0.start, -7)), w2 = weekOf(addDays(w0.start, -14));
    const o = await L.get('/api/options?sets=units,methods,categories,voucherTypes');
    const unit = Object.fromEntries(o.units.map((u) => [u.label, u.id])), method = Object.fromEntries(o.methods.map((m) => [m.kind, m.id])), cat = Object.fromEntries(o.categories.map((m) => [m.label, m.id])), voucher = Object.fromEntries(o.voucherTypes.map((m) => [m.label, m.id]));
    const party = async (name, flags) => (await L.post('/api/catalog/parties', { name, ...flags })).id;
    const cli1 = await party('Arquitectura Ficticia Uno (DEMO)', { isClient: true }), cli2 = await party('Desarrollos Ejemplo (DEMO)', { isClient: true });
    const con1 = await party('Cuadrilla Norte (DEMO)', { isContractor: true }), con2 = await party('Instaladores Sur (DEMO)', { isContractor: true });
    const sup1 = await party('Adhesivos Ejemplo (DEMO)', { isSupplier: true }), sup2 = await party('Ferretería Ejemplo (DEMO)', { isSupplier: true });
    await L.post('/api/catalog/contacts', { partyId: cli1, name: 'Arq. Persona Ficticia', position: 'Representante', isRepresentative: true });
    const workers = []; for (const n of ['Trabajador Ejemplo A', 'Trabajador Ejemplo B', 'Trabajador Ejemplo C']) workers.push((await L.post('/api/catalog/workers', { name: `${n} (DEMO)`, contractorId: con1, payAccountPending: n.endsWith('C') })).id);
    const crew = (await L.post('/api/catalog/crews', { name: 'Cuadrilla de pisos (DEMO)', contractorId: con1 })).id;
    for (const w of workers.slice(0, 2)) await L.post('/api/catalog/crewMemberships', { crewId: crew, workerId: w, validFrom: w2.start });

    const work = async (name, code, clientId, extra = {}) => { const id = (await L.post('/api/works', { name, code, clientId, startDate: addDays(w2.start, -30), ...extra })).id; await L.patch(`/api/works/${id}`, { status: 'activa' }); return id; };
    const A = await work('Residencia Mirador (DEMO)', 'DEMO-01', cli1, { address: 'Calle Ficticia 100', consolidation: 'incluida', paymentTerms: 'Estimaciones quincenales; pago a 15 días (ejemplo)' });
    const B = await work('Torre Jardín (DEMO)', 'DEMO-02', cli2, { consolidation: 'incluida' });
    const C = await work('Proyecto por clasificar (DEMO)', 'DEMO-03', cli2, { consolidation: 'pendiente_clasificar', consolidationNote: 'Ejemplo de operación cuyo tratamiento aún no está validado.' });
    const loc = async (w, name, kind, parentId) => (await L.post(`/api/works/${w}/locations`, { name, kind, parentId })).id;
    const aS1 = await loc(A, 'Sótano 1', 'nivel'), aPB = await loc(A, 'Planta baja', 'nivel'), aPA = await loc(A, 'Planta alta', 'nivel');
    const aLobby = await loc(A, 'Vestíbulo', 'zona', aPB), aBano = await loc(A, 'Baño principal', 'habitacion', aPA), aFach = await loc(A, 'Fachada alberca', 'superficie', aPB);
    const bT = await loc(B, 'Torre A', 'edificio'), bN1 = await loc(B, 'Nivel 1', 'nivel', bT), bN2 = await loc(B, 'Nivel 2', 'nivel', bT); await loc(C, 'General', 'zona');

    const concept = async (name, catalog, u, extra = {}) => (await L.post('/api/catalog/concepts', { name, catalog, unitId: unit[u], evidencePolicy: 'opcional', ...extra })).id;
    const K = { piso: await concept('Instalación de piso', 'contratacion', 'm2', { family: 'Pisos' }), muro: await concept('Instalación de muro', 'contratacion', 'm2', { family: 'Muros' }), imper: await concept('Impermeabilización de muro', 'contratacion', 'm2', { family: 'Impermeabilización', hiddenWork: true }), canto: await concept('Canto pulido', 'contratacion', 'ml', { family: 'Detalles' }), inglete: await concept('Inglete', 'contratacion', 'ml', { family: 'Detalles' }), sellado: await concept('Limpieza y sellado', 'contratacion', 'm2', { family: 'Limpieza' }), detalle: await concept('Detalle por lote', 'contratacion', 'lote', { family: 'Detalles' }), sinTarifa: await concept('Maniobra especial (sin tarifa definida)', 'contratacion', 'lote', { family: 'Maniobras' }) };
    const V = { piso: await concept('Suministro e instalación de piso de mármol', 'comercial', 'm2'), muro: await concept('Instalación de muro de mármol', 'comercial', 'm2'), imper: await concept('Impermeabilizante en muros', 'comercial', 'm2'), sellado: await concept('Limpieza y sellado de baño', 'comercial', 'm2'), canto: await concept('Canto pulido en cubiertas', 'comercial', 'ml') };
    await L.post('/api/catalog/conceptLinks', { contractConceptId: K.piso, commercialConceptId: V.piso, note: 'Ejemplo: el alcance comercial incluye material; no es relación uno a uno.' });
    const from = addDays(w2.start, -60);
    for (const [c, p] of [[K.piso, '350'], [K.muro, '420'], [K.imper, '120'], [K.canto, '85'], [K.inglete, '110'], [K.sellado, '60'], [K.detalle, '500']]) await L.post('/api/rates', { circuit: 'contratacion', conceptId: c, price: p, validFrom: from, includes: 'Mano de obra y herramienta (ejemplo)' });
    await L.post('/api/rates', { circuit: 'contratacion', conceptId: K.piso, price: '365', validFrom: from, workId: B, contractorId: con2, includes: 'Tarifa específica de obra y contratista (ejemplo)' });
    for (const [c, p] of [[V.piso, '1280'], [V.muro, '1400'], [V.imper, '350'], [V.sellado, '270'], [V.canto, '600']]) await L.post('/api/rates', { circuit: 'comercial', conceptId: c, price: p, validFrom: from });
    for (const [name, cost] of [['Detalle sencillo', '500'], ['Detalle medio', '1000'], ['Detalle complejo', '1500']]) await L.post('/api/catalog/detailLevels', { code: `N${cost}`, name: `${name} (ejemplo de configuración)`, costAmount: cost, currency: 'MXN', note: 'Importe de ejemplo: no es precio obligatorio ni equivale al precio de venta.' });

    mk('supervisor', 'Supervisor Uno (demo)', 'supervisor', { scope: 'asignadas' }); mk('supervisor2', 'Supervisor Dos (demo)', 'supervisor', { scope: 'asignadas' }); mk('luis', 'Luis (demo) · Coordinación', 'coordinacion', { scope: 'asignadas' });
    mk('contratista', 'Cuadrilla Norte (demo) · Contratista', 'contratista', { partyId: con1 }); mk('contratista2', 'Instaladores Sur (demo) · Contratista', 'contratista', { partyId: con2 }); mk('cliente', 'Arquitectura Ficticia (demo) · Cliente', 'cliente', { partyId: cli1 });
    const asg = (w, b) => L.post(`/api/works/${w}/assignments`, { validFrom: from, ...b });
    await asg(A, { kind: 'supervisor', userId: U.supervisor }); await asg(B, { kind: 'supervisor', userId: U.supervisor2 }); await asg(A, { kind: 'coordinador', userId: U.luis }); await asg(B, { kind: 'coordinador', userId: U.luis });
    await asg(A, { kind: 'contratista', partyId: con1 }); await asg(B, { kind: 'contratista', partyId: con2 }); await asg(B, { kind: 'contratista', partyId: con1 }); await asg(A, { kind: 'cuadrilla', crewId: crew }); await asg(A, { kind: 'cliente', partyId: cli1 });
    const cash = (await L.post('/api/catalog/accounts', { code: 'CAJA', name: 'Caja general (demo)', kind: 'efectivo', currency: 'MXN', openingBalance: '250000', openingDate: from })).id;
    const bank = (await L.post('/api/catalog/accounts', { code: 'BANCO', name: 'Banco (demo)', kind: 'banco', currency: 'MXN', openingBalance: '900000', openingDate: from })).id;
    const P = {}; for (const w of [w2, w1, w0]) P[w.code] = (await L.post('/api/periods', { year: w.year, week: w.week })).id;

    // Contrato y presupuesto de la obra A (condiciones de ejemplo, marcadas como no validadas).
    await L.post(`/api/works/${A}/contracts`, { taxRate: '16', taxLabel: 'IVA 16 % (ejemplo)', advanceKind: 'porcentaje', advancePct: '10', advanceBase: 'subtotal del presupuesto (ejemplo)', amortizationPct: '10', amortizationBase: 'subtotal', retentionPct: '5', retentionBase: 'subtotal', retentionRelease: 'Al cierre de la obra (ejemplo)', dueDays: 15, termsValidated: false, notes: 'Condiciones ficticias para la demostración.' });
    const bud = await L.post(`/api/works/${A}/budgets`, { name: 'Presupuesto Residencia Mirador (DEMO)', taxTreatment: 'Importes antes de impuestos', conditions: 'Vigencia de 30 días (ejemplo).\nNo incluye andamios (ejemplo).' });
    await L.put(`/api/budget-versions/${bud.id}/items`, { items: [
      { chapter: 'PISOS INTERIORES', locationId: aS1, conceptId: V.piso, description: 'Piso de mármol en sótano 1', unitId: unit.m2, qty: '135', price: '1280', includes: 'material, adhesivo y cortes' },
      { chapter: 'PISOS INTERIORES', locationId: aPB, conceptId: V.piso, description: 'Piso de mármol en planta baja', unitId: unit.m2, qty: '240', price: '1280', includes: 'material, adhesivo y cortes' },
      { chapter: 'FACHADA', locationId: aFach, conceptId: V.imper, description: 'Impermeabilizante en muro de fachada', unitId: unit.m2, qty: '90', price: '350' },
      { chapter: 'FACHADA', locationId: aFach, conceptId: V.muro, description: 'Muro de mármol en fachada alberca', unitId: unit.m2, qty: '90', price: '1400' },
      { chapter: 'BAÑOS', locationId: aBano, conceptId: V.canto, description: 'Canto pulido en cubierta de baño', unitId: unit.ml, qty: '18', price: '600' },
      { chapter: 'BAÑOS', locationId: aBano, conceptId: V.sellado, description: 'Limpieza y sellado de baño principal', unitId: unit.m2, qty: '78.3', price: '270' },
    ] });
    await L.post(`/api/budget-versions/${bud.id}/transition`, { to: 'enviado' }); await L.post(`/api/budget-versions/${bud.id}/transition`, { to: 'aceptado', acceptedByName: 'Arq. Persona Ficticia (demo)' });
    const bi = Object.fromEntries((await L.get(`/api/budget-versions/${bud.id}`)).items.map((i) => [i.description, i.id]));

    const S1 = await as('supervisor'), S2 = await as('supervisor2'), LU = await as('luis'), C1 = await as('contratista'), C2 = await as('contratista2'), AX = await as('auxiliar'), TE = await as('tesoreria'), CL = await as('cliente');
    const photo = async (who, workId, entryId, name, clientVisible) => { const a = await who.upload(name, TINY_JPG, { kind: 'foto', workId }); const l = await who.post('/api/evidence', { attachmentId: a.id, objectType: 'progressEntry', objectId: entryId, caption: 'Fotografía de ejemplo (demo)' }); if (clientVisible) await L.patch(`/api/evidence/${l.id}`, { clientVisible: true }); return a.id; };
    const capture = async (who, e, { validate = true, evidence = false, visible = false } = {}) => { const r = await who.post('/api/progress', { submit: true, ...e }); if (evidence) await photo(who, e.workId, r.id, 'evidencia-demo.jpg', visible); if (validate) await LU.post(`/api/progress/${r.id}/review`, { decision: 'validar' }); return r.id; };
    const day = (w, n) => { const dd = addDays(w.start, n); return dd > today ? today : dd; };
    const receipt = async () => (await TE.upload('recibo-demo.jpg', TINY_JPG, { kind: 'comprobante' })).id;
    const pay = async (ob, amount, { account = cash, m = method.efectivo, date, reference } = {}) => { const p = await TE.post('/api/disbursements', { date, accountId: account, methodId: m, amount, reference, applications: [{ obligationId: ob, amount }] }); await L.post(`/api/disbursements/${p.id}/authorize`, {}); await TE.post(`/api/disbursements/${p.id}/confirm`, { receiptAttachmentId: await receipt(), deliveredByName: 'Tesorería (demo)', reference }); return p.id; };

    // ── Semana −2: cerrada y pagada ──
    const e21 = await capture(S1, { workId: A, locationId: aS1, conceptId: K.piso, contractorId: con1, crewId: crew, executionDate: day(w2, 3), budgetItemId: bi['Piso de mármol en sótano 1'], generator: [{ label: 'Estacionamiento', length: '8.5', width: '4.2' }, { label: 'Pasillo', length: '6', width: '1.5', deduction: '0.8' }] }, { evidence: true, visible: true });
    const e22 = await capture(S1, { workId: A, locationId: aFach, conceptId: K.imper, contractorId: con1, executionDate: day(w2, 4), qty: '40', budgetItemId: bi['Impermeabilizante en muro de fachada'], description: 'Trabajo que quedará oculto bajo el mármol' }, { evidence: true, visible: true });
    await capture(S2, { workId: B, locationId: bN1, conceptId: K.piso, contractorId: con2, executionDate: day(w2, 4), qty: '62.5' });
    const est = async (workId, contractorId, w, gen = {}) => { const e = await L.post('/api/c-estimates', { workId, contractorId, periodId: P[w.code] }); await LU.post(`/api/c-estimates/${e.id}/generate`, gen); await LU.post(`/api/c-estimates/${e.id}/transition`, { to: 'revision_interna' }); return e.id; };
    const send = (id) => LU.post(`/api/c-estimates/${id}/transition`, { to: 'revision_contratista' });
    const ecA2 = await est(A, con1, w2), ecB2 = await est(B, con2, w2);
    await send(ecA2); await C1.post(`/api/c-estimates/${ecA2}/accept`, {}); await send(ecB2); await C2.post(`/api/c-estimates/${ecB2}/accept`, {});
    const obA2 = (await L.post(`/api/c-estimates/${ecA2}/authorize`, {})).obligationId, obB2 = (await L.post(`/api/c-estimates/${ecB2}/authorize`, {})).obligationId;
    await L.post(`/api/obligations/${obA2}/components`, { kind: 'nomina_bancaria', amount: '6000', support: 'Dispersión bancaria de ejemplo', authorize: true });
    await L.post('/api/closes', { periodId: P[w2.code] });
    const stA2 = await L.get(`/api/obligations/${obA2}`), stB2 = await L.get(`/api/obligations/${obB2}`);
    await pay(obA2, '6000', { account: bank, m: method.transferencia, date: w2.end, reference: 'DEMO-TRF-001' }); await pay(obA2, stA2.cashPlanned, { date: w2.end }); await pay(obB2, stB2.cashPlanned, { date: w2.end });

    // ── Semana −1: observación conciliada, descuento, anticipo aplicado, pago parcial ──
    const e11 = await capture(S1, { workId: A, locationId: aS1, conceptId: K.piso, contractorId: con1, executionDate: day(w1, 2), qty: '15.79', budgetItemId: bi['Piso de mármol en sótano 1'] }, { evidence: true });
    const e12 = await capture(S1, { workId: A, locationId: aPB, conceptId: K.piso, contractorId: con1, executionDate: day(w1, 3), qty: '25.24', budgetItemId: bi['Piso de mármol en planta baja'] }, { evidence: true, visible: true });
    await capture(S1, { workId: A, locationId: aFach, conceptId: K.muro, contractorId: con1, executionDate: day(w1, 4), qty: '22', budgetItemId: bi['Muro de mármol en fachada alberca'] });
    await capture(S2, { workId: B, locationId: bN2, conceptId: K.piso, contractorId: con2, executionDate: day(w1, 3), qty: '48' });
    const ecA1 = await est(A, con1, w1, { groupBy: 'concepto' }); await send(ecA1);
    const docA1 = await C1.get(`/api/c-estimates/${ecA1}`); const pisoItem = docA1.items.find((i) => i.allocations.length === 2);
    const obs = await C1.post(`/api/c-estimates/${ecA1}/observe`, { itemId: pisoItem.id, allocationId: pisoItem.allocations.find((a) => a.location.startsWith('Planta baja')).id, proposedQty: '42.03', text: 'En planta baja faltó medir el vestíbulo (1 m² más).' });
    await C1.post(`/api/c-estimates/${ecA1}/accept`, { itemIds: docA1.items.filter((i) => i.id !== pisoItem.id).map((i) => i.id) });
    await L.post(`/api/observations/${obs.id}/resolve`, { resolution: 'aceptada', note: 'Se verificó en sitio la medición del vestíbulo.' }); await C1.post(`/api/c-estimates/${ecA1}/accept`, {});
    const obA1 = (await L.post(`/api/c-estimates/${ecA1}/authorize`, {})).obligationId;
    const adv = await TE.post('/api/disbursements', { kind: 'anticipo', date: day(w1, 1), accountId: cash, methodId: method.efectivo, amount: '3000', beneficiaryId: con1, note: 'Anticipo de ejemplo autorizado por dirección' });
    await L.post(`/api/disbursements/${adv.id}/authorize`, {}); await TE.post(`/api/disbursements/${adv.id}/confirm`, { receiptAttachmentId: await receipt() });
    const advId = (await L.get('/api/contractor-advances')).items[0].id;
    await L.post(`/api/obligations/${obA1}/apply-advance`, { advanceId: advId, amount: '2000' });
    await L.post(`/api/obligations/${obA1}/components`, { kind: 'descuento', amount: '350', support: 'Descuento de ejemplo con soporte documental (demo)', authorize: true });
    const ecB1 = await est(B, con2, w1); await send(ecB1); await C2.post(`/api/c-estimates/${ecB1}/accept`, {}); const obB1 = (await L.post(`/api/c-estimates/${ecB1}/authorize`, {})).obligationId;
    await L.post('/api/closes', { periodId: P[w1.code] });
    await pay(obA1, '10000', { date: w1.end }); await pay(obB1, '8000', { date: w1.end });

    // ── Semana en curso: abierta, con pendientes de todo tipo ──
    await capture(S1, { workId: A, locationId: aLobby, conceptId: K.piso, contractorId: con1, executionDate: day(w0, 1), mode: 'acumulado', qty: '18.5', description: 'Medición acumulada del vestíbulo' });
    await capture(S1, { workId: A, locationId: aBano, conceptId: K.canto, contractorId: con1, executionDate: day(w0, 2), qty: '12.4', budgetItemId: bi['Canto pulido en cubierta de baño'] });
    await capture(S1, { workId: A, locationId: aFach, conceptId: K.imper, contractorId: con1, executionDate: day(w0, 2), qty: '28', budgetItemId: bi['Impermeabilizante en muro de fachada'] }, { validate: false });
    await capture(S1, { workId: A, locationId: aBano, conceptId: K.sinTarifa, contractorId: con1, executionDate: day(w0, 2), qty: '1', description: 'Subida de placas con equipo especial' });
    await S1.post('/api/progress', { workId: A, locationId: aPA, conceptId: K.inglete, contractorId: con1, executionDate: day(w0, 3), qty: '9.6', description: 'Borrador sin enviar' });
    await capture(S2, { workId: B, locationId: bN2, conceptId: K.piso, contractorId: con2, executionDate: day(w0, 1), qty: '30' }, { validate: false });
    const ecA0 = await est(A, con1, w0); await send(ecA0);
    for (const [i, w] of workers.slice(0, 2).entries()) { const wd = await (i ? LU : S1).post('/api/workdays', { workerId: w, date: day(w0, 1), qty: '1', rate: '650', allocations: i ? [{ workId: A, qty: '0.5' }, { workId: B, qty: '0.5' }] : [{ workId: A, qty: '1' }], note: 'Raya de ejemplo' }); if (!i) await LU.post(`/api/workdays/${wd.id}/decide`, { decision: 'aprobar' }); }
    // Adicional con costo autorizado y cobro pendiente (importe expuesto), y otro por valorar.
    const ad1 = await S1.post('/api/additionals', { workId: A, locationId: aBano, date: day(w0, 1), description: 'Reposición de dos piezas dañadas por otro contratista en regadera', kind: 'reposicion', executorId: con1, executed: true, qty: '1', unitId: unit.lote, requesterName: 'Residente de obra (demo)' });
    const ph = await S1.upload('adicional-demo.jpg', TINY_JPG, { kind: 'foto', workId: A }); await S1.post('/api/evidence', { attachmentId: ph.id, objectType: 'additional', objectId: ad1.id });
    await LU.post(`/api/additionals/${ad1.id}/operation`, { status: 'validado' }); await L.post(`/api/additionals/${ad1.id}/cost`, { amount: '1500' });
    await S1.post('/api/additionals', { workId: A, locationId: aFach, date: day(w0, 2), description: 'Apertura adicional para instalación eléctrica en fachada', kind: 'cambio_solicitado', executorId: con1, executed: false, urgency: 'urgente' });
    await S1.post('/api/incidents', { workId: A, additionalId: ad1.id, title: 'Proteger regadera hasta entrega', responsibleId: U.supervisor, dueDate: addDays(today, 3) });

    // ── Cliente: anticipo con comisión, estimación aprobada parcialmente, factura y cobro parcial ──
    await AX.post('/api/receipts', { kind: 'anticipo', date: day(w2, 0), accountId: bank, methodId: method.transferencia, clientId: cli1, workId: A, grossAmount: '65000', commission: '6500', netAmount: '58500', reference: 'DEMO-ANT-01', commissionNature: 'pendiente de validar' });
    const k1 = await L.post('/api/k-estimates', { workId: A, periodFrom: w2.start, periodTo: w1.end }); await L.post(`/api/k-estimates/${k1.id}/generate`, {});
    await L.post(`/api/k-estimates/${k1.id}/transition`, { to: 'revision_interna' }); await L.post(`/api/k-estimates/${k1.id}/transition`, { to: 'enviada' });
    const seen = await CL.get(`/api/k-estimates/${k1.id}`);
    const ap = await CL.post(`/api/k-estimates/${k1.id}/respond`, { decision: 'aceptar', version: 1, items: seen.items.map((i) => (i.description.includes('fachada alberca') ? { itemId: i.id, status: 'diferida' } : { itemId: i.id, status: 'aceptada' })) });
    await AX.post('/api/invoices', { folio: 'DEMO-F-001', clientId: cli1, workId: A, date: today, total: ap.total, links: [{ kEstimateId: k1.id, amount: ap.total }] });
    await AX.post('/api/receipts', { date: today, accountId: bank, methodId: method.transferencia, clientId: cli1, workId: A, grossAmount: '40000', reference: 'DEMO-TRF-CL-01', applications: [{ kEstimateId: k1.id, amount: '40000' }] });
    const k2 = await L.post('/api/k-estimates', { workId: A, periodFrom: w0.start, periodTo: today }); await L.post(`/api/k-estimates/${k2.id}/generate`, {});
    const co = await L.post(`/api/works/${A}/change-orders`, { kind: 'aditiva', changeType: 'concepto_nuevo', reason: 'Pasos de ventana solicitados por el cliente (ejemplo)', items: [{ description: 'Pasos de ventana', unitId: unit.ml, qtyDelta: '13.27', price: '600', locationId: aPB }] });
    await L.post(`/api/change-orders/${co.id}/decide`, { status: 'en_revision' });

    // ── Costos: gasto compartido, caja chica e insumos ──
    const g1 = await AX.post('/api/expenses', { supplierId: sup1, docDate: day(w1, 1), description: 'Adhesivo para piso, 60 bultos (demo)', categoryId: cat.Adhesivo, voucherTypeId: voucher.Factura, subtotal: '15000', tax: '2400', total: '17400', reference: 'DEMO-A-100', allocations: [{ target: 'obra', workId: A, method: 'porcentaje', pct: '50' }, { target: 'obra', workId: B, method: 'porcentaje', pct: '30' }, { target: 'administracion', method: 'porcentaje', pct: '20' }] });
    const fac = await AX.upload('factura-demo.jpg', TINY_JPG, { kind: 'comprobante' }); await AX.patch(`/api/expenses/${g1.id}`, { attachmentId: fac.id });
    const obG = (await L.post(`/api/expenses/${g1.id}/status`, { status: 'autorizado' })).obligationId;
    await pay(obG, '5000', { date: day(w1, 2) }); await pay(obG, '12400', { account: bank, m: method.transferencia, date: day(w1, 3), reference: 'DEMO-TRF-002' });
    await AX.post('/api/expenses', { supplierId: sup2, docDate: day(w0, 1), description: 'Discos de corte y esponjas (demo)', categoryId: cat['Otros insumos'], total: '1280', reference: 'NOTA-55', allocations: [{ target: 'obra', workId: A, amount: '1280' }] });
    await AX.post('/api/expenses', { supplierId: sup2, docDate: day(w0, 2), description: 'Cortadora de mármol (equipo, demo)', categoryId: cat['Activos o inversiones'], subtotal: '18000', tax: '2880', total: '20880', reference: 'DEMO-EQ-9' });
    const fund = await L.post('/api/petty-funds', { name: 'Residencia Mirador (demo)', responsibleId: U.supervisor, authorizedAmount: '5000', date: from });
    await TE.post(`/api/petty-funds/${fund.id}/movements`, { kind: 'entrega', date: day(w1, 0), amount: '5000', accountId: cash });
    const pg = await AX.post('/api/expenses', { supplierId: sup2, docDate: day(w1, 2), description: 'Cinta y plástico de protección (demo)', categoryId: cat['Otros insumos'], total: '640', pettyFundId: fund.id, allocations: [{ target: 'obra', workId: A, amount: '640' }] });
    await L.post(`/api/expenses/${pg.id}/status`, { status: 'autorizado' }); await AX.post(`/api/petty-funds/${fund.id}/movements`, { kind: 'comprobacion', date: day(w1, 3), expenseId: pg.id });
    const adh = (await L.post('/api/catalog/supplies', { name: 'Adhesivo gris (demo)', unitId: unit.bulto })).id, sel = (await L.post('/api/catalog/supplies', { name: 'Sellador (demo)', unitId: unit.cubeta })).id;
    await AX.post('/api/supplies/movements', { supplyId: sel, kind: 'inventario_inicial', date: from, qty: '6' }); await AX.post('/api/supplies/movements', { supplyId: adh, kind: 'recepcion', date: day(w1, 1), qty: '60', expenseId: g1.id });
    await AX.post('/api/supplies/movements', { supplyId: adh, kind: 'entrega_obra', date: day(w1, 2), qty: '30', workId: A }); await AX.post('/api/supplies/movements', { supplyId: adh, kind: 'consumo', date: day(w1, 4), qty: '22', workId: A });
    await S1.post('/api/supplies/requests', { workId: A, supplyId: sel, qty: '2', reason: 'Sellado de baño principal', neededDate: addDays(today, 2) });
    await TE.post('/api/cash/transfers', { fromAccountId: bank, toAccountId: cash, date: day(w1, 0), amount: '60000', reference: 'DEMO-RETIRO-01' });

    // ── Plano con zona señalada, documentos emitidos y línea base de tiempo ──
    const planAtt = await L.upload('plano-demo.png', TINY_PNG, { kind: 'plano', workId: A }); const plan = await L.post(`/api/works/${A}/plans`, { name: 'Planta baja (demo)', attachmentId: planAtt.id, discipline: 'Acabados' });
    const pv = (await L.get(`/api/works/${A}/plans`)).items.find((p) => p.id === plan.id).versions[0];
    await L.post(`/api/plan-versions/${pv.id}/annotations`, { shape: 'poligono', page: 1, points: [[0.2, 0.2], [0.7, 0.2], [0.7, 0.6], [0.2, 0.6]], label: 'Piso de planta baja estimado', locationId: aPB, links: [{ objectType: 'kEstimate', objectId: k1.id }, { objectType: 'progressEntry', objectId: e12 }] });
    for (const [type, id, audience] of [['estimacion_contratista', ecA1, 'contratista'], ['cierre_semanal', (await L.get(`/api/closes/board?periodId=${P[w1.code]}`)).closes[0].id, 'interno'], ['estimacion_cliente', k1.id, 'cliente'], ['presupuesto', bud.id, 'cliente']]) { const dd = await L.post('/api/documents/issue', { type, id, audience }); if (audience !== 'interno') await L.post(`/api/documents/${dd.id}/publish`, {}); }
    for (const [u, m] of [[L, 210], [LU, 150]]) await u.post('/api/activity-logs', { activity: 'preparacion_cierre', date: w1.end, minutes: m, periodId: P[w1.code], note: 'Medición declarada de ejemplo' });
    void e21; void e22; void e11; void C;
  } catch (e) { store.close(); throw e; } finally { await new Promise((r) => server.close(r)); server.closeAllConnections?.(); }
  if (keepOpen) return { store, auth };
  store.close(); return null;
}
