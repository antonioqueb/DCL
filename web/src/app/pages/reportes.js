// Reportería avanzada: tablero, biblioteca de reportes predefinidos, explorador de análisis
// (dimensión, serie, medidas, periodo, filtros, tipo de gráfica), desglose hasta el registro,
// exportación y reportes guardados. Todo se calcula en el servidor con el alcance de quien consulta.
import { h, clear, get, post, del, api, can, page, card, kpi, miniTable, tabs, btn, linkBtn, money, qty, date, load, formDialog, dialog, toast, showError, empty, today, go, icon, parseHash, state } from '../core.js';
import { bars, lines, donut } from '../charts.js';

const AREA_ICON = { 'Operación': 'ruler', 'Mano de obra': 'hardhat', Pagos: 'banknote', Clientes: 'sheet', Costos: 'receipt', 'Caja y bancos': 'landmark', Control: 'shield' };
const CHARTS = { bar: 'Barras', stack: 'Apiladas', hbar: 'Horizontales', line: 'Líneas', area: 'Área', donut: 'Dona', table: 'Solo tabla' };
// Biblioteca: [área, título, descripción, conjunto, agrupar por, medidas, gráfica, extras]
const R = (area, title, desc, dataset, groupBy, measures, chart, x = {}) => ({ id: `${dataset}.${groupBy}.${measures[0]}.${x.seriesBy || ''}.${chart}.${JSON.stringify(x.filters || '')}`, area, title, desc, config: { dataset, groupBy, measures, chart, ...x } });
const LIBRARY = [
  R('Operación', 'Avances por obra', 'Número de capturas por obra y estado.', 'avances', 'work', ['n'], 'stack', { seriesBy: 'status' }),
  R('Operación', 'Avances por semana', 'Capturas por semana operativa y estado.', 'avances', '_periodo', ['n'], 'stack', { seriesBy: 'status', bucket: 'semana' }),
  R('Operación', 'Metros cuadrados instalados por obra', 'Cantidad vigente de avances medidos en m².', 'avances', 'work', ['qty'], 'bar', { filters: { unit: ['m2'], status: ['validado'] } }),
  R('Operación', 'Metros cuadrados por semana', 'Ritmo de instalación validada en m².', 'avances', '_periodo', ['qty'], 'area', { bucket: 'semana', filters: { unit: ['m2'], status: ['validado'] } }),
  R('Operación', 'Metros cuadrados por contratista', 'Producción validada por contratista.', 'avances', 'contractor', ['qty'], 'hbar', { filters: { unit: ['m2'], status: ['validado'] } }),
  R('Operación', 'Metros lineales por concepto', 'Cantos, ingletes y otros conceptos lineales.', 'avances', 'concept', ['qty'], 'hbar', { filters: { unit: ['ml'], status: ['validado'] } }),
  R('Operación', 'Producción por concepto y obra', 'Capturas por concepto, separadas por obra.', 'avances', 'concept', ['n'], 'stack', { seriesBy: 'work' }),
  R('Operación', 'Capturas por supervisor', 'Carga de captura por supervisor y estado.', 'avances', 'author', ['n'], 'stack', { seriesBy: 'status' }),
  R('Operación', 'Evidencia por obra', 'Avances con evidencia completa, faltante o con excepción.', 'avances', 'work', ['n'], 'stack', { seriesBy: 'evidence' }),
  R('Operación', 'Avances pendientes de validar', 'Reportados que esperan revisión, por obra.', 'avances', 'work', ['n'], 'hbar', { filters: { status: ['reportado', 'borrador'] } }),
  R('Operación', 'Ejecución sin estimar al cliente', 'Cantidad validada que aún no entra a una estimación comercial.', 'avances', 'work', ['unbilledQty'], 'bar', { seriesBy: 'unit', filters: { status: ['validado'] } }),
  R('Operación', 'Ejecución pagada y pendiente de cobro', 'Avances incluidos en pago al contratista según su situación de cobro.', 'avances', 'billed', ['n'], 'donut', { filters: { status: ['validado'], paid: ['si', 'parcial'] } }),
  R('Operación', 'Avances por ubicación', 'Dónde se concentra el trabajo dentro de las obras.', 'avances', 'location', ['n'], 'hbar', { limit: 20 }),
  R('Operación', 'Tipo de trabajo', 'Ordinario, adicional y retrabajo.', 'avances', 'workType', ['n'], 'donut'),
  R('Operación', 'Adicionales por obra', 'Costo autorizado, precio al cliente e importe expuesto.', 'adicionales', 'work', ['cost', 'sale', 'exposure'], 'bar'),
  R('Operación', 'Adicionales por tipo', 'Trabajo nuevo, daño, reposición, retrabajo y cambios.', 'adicionales', 'kind', ['n'], 'donut'),
  R('Operación', 'Adicionales: decisión de cobro', 'Situación comercial de cada adicional.', 'adicionales', 'saleStatus', ['cost'], 'bar'),
  R('Operación', 'Exposición por obra', 'Costo autorizado sin cobro asegurado. No es pérdida comprobada.', 'adicionales', 'work', ['exposure'], 'hbar', { filters: { exposed: ['si'] } }),
  R('Operación', 'Adicionales por mes', 'Evolución del costo autorizado de adicionales.', 'adicionales', '_periodo', ['cost'], 'line', { bucket: 'mes' }),

  R('Mano de obra', 'Mano de obra por semana', 'Importe de partidas por semana operativa.', 'mano_obra', '_periodo', ['amount'], 'bar', { bucket: 'semana' }),
  R('Mano de obra', 'Mano de obra por semana y obra', 'Composición semanal por obra.', 'mano_obra', '_periodo', ['amount'], 'stack', { seriesBy: 'work', bucket: 'semana' }),
  R('Mano de obra', 'Mano de obra por contratista', 'Importe total por contratista.', 'mano_obra', 'contractor', ['amount'], 'hbar'),
  R('Mano de obra', 'Mano de obra por obra y contratista', 'Quién trabaja en cada obra y por cuánto.', 'mano_obra', 'work', ['amount'], 'stack', { seriesBy: 'contractor' }),
  R('Mano de obra', 'Mano de obra por concepto', 'Conceptos que concentran el pago.', 'mano_obra', 'concept', ['amount'], 'hbar'),
  R('Mano de obra', 'Autorizado frente a importe total', 'Qué parte de lo estimado ya está autorizada, por obra.', 'mano_obra', 'work', ['amount', 'authorized'], 'bar'),
  R('Mano de obra', 'Partidas por estado', 'Pendientes, observadas, acordadas, autorizadas y diferidas.', 'mano_obra', 'itemStatus', ['amount'], 'donut'),
  R('Mano de obra', 'Estimaciones por estado', 'Importe en cada etapa del flujo.', 'mano_obra', 'status', ['amount'], 'bar'),
  R('Mano de obra', 'Partidas sin tarifa', 'Partidas pendientes de valorar, por obra.', 'mano_obra', 'work', ['n'], 'hbar', { filters: { valued: ['no'] } }),
  R('Mano de obra', 'Trabajo ordinario, adicional y retrabajo', 'Importe por tipo de trabajo y obra.', 'mano_obra', 'work', ['amount'], 'stack', { seriesBy: 'workType' }),
  R('Mano de obra', 'Método de cálculo', 'Cantidad, jornada, lote o importe fijo.', 'mano_obra', 'method', ['amount'], 'donut'),
  R('Mano de obra', 'Mano de obra mensual', 'Tendencia mensual del importe.', 'mano_obra', '_periodo', ['amount'], 'area', { bucket: 'mes' }),
  R('Mano de obra', 'Jornadas por trabajador', 'Jornadas u horas e importe por persona.', 'jornadas', 'who', ['qty'], 'hbar'),
  R('Mano de obra', 'Jornadas por obra', 'Distribución de jornadas entre obras.', 'jornadas', 'work', ['amount'], 'bar', { seriesBy: 'status' }),

  R('Pagos', 'Saldo por beneficiario', 'Pagado confirmado y saldo pendiente.', 'obligaciones', 'beneficiary', ['paid', 'balance'], 'stack'),
  R('Pagos', 'Saldo por obra', 'Lo autorizado pendiente de pago por obra.', 'obligaciones', 'work', ['balance'], 'hbar'),
  R('Pagos', 'Composición de la liquidación por semana', 'Efectivo, banco, descuentos y anticipos.', 'obligaciones', 'week', ['cashPlanned', 'bankPlanned', 'discounts', 'advances'], 'stack'),
  R('Pagos', 'Descuentos y anticipos por contratista', 'Lo que reduce el neto por pagar.', 'obligaciones', 'beneficiary', ['discounts', 'advances'], 'bar', { filters: { kind: ['contratista'] } }),
  R('Pagos', 'Obligaciones por estado de pago', 'Sin pago, parcial, pagado o con reverso.', 'obligaciones', 'payStatus', ['gross'], 'donut'),
  R('Pagos', 'Obligaciones vencidas', 'Saldo vencido por beneficiario.', 'obligaciones', 'beneficiary', ['balance'], 'hbar', { filters: { overdue: ['vencida'] } }),
  R('Pagos', 'Contratistas frente a proveedores', 'Bruto autorizado y saldo por tipo de beneficiario.', 'obligaciones', 'kind', ['gross', 'balance'], 'bar'),
  R('Pagos', 'Pagos por medio', 'Efectivo, transferencia y cheque.', 'desembolsos', 'method', ['confirmed'], 'donut'),
  R('Pagos', 'Pagos por semana', 'Desembolsos confirmados por semana y medio.', 'desembolsos', '_periodo', ['confirmed'], 'stack', { seriesBy: 'method', bucket: 'semana' }),
  R('Pagos', 'Pagos por beneficiario', 'A quién se le ha pagado.', 'desembolsos', 'beneficiary', ['confirmed'], 'hbar'),
  R('Pagos', 'Pagos por cuenta', 'De qué cuenta sale el dinero.', 'desembolsos', 'account', ['confirmed'], 'bar'),
  R('Pagos', 'Desembolsos por estado', 'Preparados, autorizados, confirmados y revertidos.', 'desembolsos', 'status', ['amount'], 'bar'),
  R('Pagos', 'Pagos sin comprobante', 'Desembolsos por estado según tengan comprobante.', 'desembolsos', 'status', ['n'], 'stack', { seriesBy: 'receipt' }),

  R('Clientes', 'Propuesto y aceptado por obra', 'Lo estimado al cliente frente a lo que aceptó.', 'estimaciones_cliente', 'work', ['proposed', 'accepted'], 'bar'),
  R('Clientes', 'Estimado por capítulo', 'Capítulos del presupuesto que más se han estimado.', 'estimaciones_cliente', 'chapter', ['proposed', 'accepted'], 'bar'),
  R('Clientes', 'Estimaciones al cliente por estado', 'Importe propuesto en cada etapa.', 'estimaciones_cliente', 'status', ['proposed'], 'donut'),
  R('Clientes', 'Partidas aceptadas, diferidas y rechazadas', 'Resultado de la revisión del cliente.', 'estimaciones_cliente', 'itemStatus', ['proposed'], 'bar'),
  R('Clientes', 'Estimado por mes', 'Importe propuesto y aceptado por mes.', 'estimaciones_cliente', '_periodo', ['proposed', 'accepted'], 'line', { bucket: 'mes' }),
  R('Clientes', 'Estimado por cliente', 'Importe aceptado por cliente.', 'estimaciones_cliente', 'client', ['accepted'], 'hbar'),
  R('Clientes', 'Cuentas por cobrar por antigüedad', 'Saldo según fecha de vencimiento.', 'cobranza', 'aging', ['balance'], 'bar'),
  R('Clientes', 'Cobrado y saldo por obra', 'Estimaciones aprobadas por el cliente.', 'cobranza', 'work', ['collected', 'balance'], 'stack'),
  R('Clientes', 'Saldo por cliente', 'Cuánto debe cada cliente.', 'cobranza', 'client', ['balance'], 'hbar'),
  R('Clientes', 'Facturado frente a aprobado', 'Total aprobado, facturado y cobrado por obra.', 'cobranza', 'work', ['total', 'invoiced', 'collected'], 'bar'),
  R('Clientes', 'Del subtotal al total por estimación', 'Subtotal, impuestos, amortización y retención.', 'cobranza', 'estimate', ['subtotal', 'tax', 'amortization', 'retention'], 'bar'),
  R('Clientes', 'Cobros por mes', 'Bruto, comisión y neto recibido.', 'cobros', '_periodo', ['gross', 'commission', 'net'], 'bar', { bucket: 'mes' }),
  R('Clientes', 'Cobros y anticipos por cliente', 'Importe bruto por tipo.', 'cobros', 'client', ['gross'], 'stack', { seriesBy: 'kind' }),
  R('Clientes', 'Comisiones descontadas', 'Comisiones por cliente (naturaleza por validar).', 'cobros', 'client', ['commission'], 'hbar'),
  R('Clientes', 'Presupuesto vigente y ejecución por obra', 'Vigente, ejecutado valorizado y pendiente.', 'presupuesto', 'work', ['currentAmount', 'executedAmount', 'pendingAmount'], 'bar'),
  R('Clientes', 'Presupuesto por capítulo', 'Vigente y ejecutado por capítulo.', 'presupuesto', 'chapter', ['currentAmount', 'executedAmount'], 'bar'),
  R('Clientes', 'Partidas por seguimiento', 'Sin ejecución, en proceso, completas y excedidas.', 'presupuesto', 'state', ['currentAmount'], 'donut'),
  R('Clientes', 'Partidas presupuestadas sin ejecución', 'Importe pendiente que sigue visible, por obra.', 'presupuesto', 'work', ['pendingAmount'], 'hbar', { filters: { state: ['pendiente'] } }),

  R('Costos', 'Costos por obra y origen', 'Mano de obra autorizada y gastos autorizados.', 'costos', 'work', ['amount'], 'stack', { seriesBy: 'source' }),
  R('Costos', 'Costos por categoría', 'En qué se gasta.', 'costos', 'category', ['amount'], 'donut'),
  R('Costos', 'Costos por obra y categoría', 'Estructura de costo de cada obra.', 'costos', 'work', ['amount'], 'stack', { seriesBy: 'category' }),
  R('Costos', 'Costos por mes', 'Costo reconocido por mes y origen.', 'costos', '_periodo', ['amount'], 'stack', { seriesBy: 'source', bucket: 'mes' }),
  R('Costos', 'Costos por contratista o proveedor', 'Terceros que concentran el costo.', 'costos', 'party', ['amount'], 'hbar'),
  R('Costos', 'Costo semanal', 'Tendencia semanal del costo reconocido.', 'costos', '_periodo', ['amount'], 'area', { bucket: 'semana' }),
  R('Costos', 'Gastos por proveedor', 'Importe asignado por proveedor.', 'gastos', 'supplier', ['amount'], 'hbar'),
  R('Costos', 'Gastos por categoría', 'Importe por categoría de gasto.', 'gastos', 'category', ['amount'], 'bar'),
  R('Costos', 'Gastos por destino', 'Obras, administración, stock y sin distribuir.', 'gastos', 'target', ['amount'], 'bar', { seriesBy: 'category' }),
  R('Costos', 'Gastos por estado', 'Borrador, revisado, autorizado y cancelado.', 'gastos', 'status', ['amount'], 'donut'),
  R('Costos', 'Gastos por estado de pago', 'Importe asignado y pagado.', 'gastos', 'payStatus', ['amount', 'paid'], 'bar'),
  R('Costos', 'Gastos por mes', 'Evolución mensual por categoría.', 'gastos', '_periodo', ['amount'], 'stack', { seriesBy: 'category', bucket: 'mes' }),
  R('Costos', 'Gastos por clasificación', 'Instalación, administración, comercial, activos.', 'gastos', 'class', ['amount'], 'donut'),
  R('Costos', 'Comprobantes sin adjuntar', 'Gastos por estado según tengan comprobante.', 'gastos', 'status', ['n'], 'stack', { seriesBy: 'voucher' }),
  R('Costos', 'Calidad fiscal de los comprobantes', 'Con y sin desglose de impuestos.', 'gastos', 'quality', ['amount'], 'donut'),
  R('Costos', 'Insumos por movimiento', 'Recepciones, entregas, consumos y devoluciones.', 'insumos', 'supply', ['qty'], 'stack', { seriesBy: 'kind' }),
  R('Costos', 'Consumo de insumos por obra', 'Cantidad consumida por obra e insumo.', 'insumos', 'work', ['qty'], 'bar', { seriesBy: 'supply', filters: { kind: ['consumo'] } }),

  R('Caja y bancos', 'Entradas y salidas por mes', 'Movimientos confirmados.', 'caja', '_periodo', ['inflow', 'outflow'], 'bar', { bucket: 'mes' }),
  R('Caja y bancos', 'Flujo neto por semana', 'Entradas menos salidas.', 'caja', '_periodo', ['net'], 'line', { bucket: 'semana' }),
  R('Caja y bancos', 'Flujo por clasificación', 'Operación, inversión, financiamiento y transferencias.', 'caja', 'flowClass', ['inflow', 'outflow'], 'bar'),
  R('Caja y bancos', 'Movimientos por cuenta', 'Entradas y salidas de cada cuenta.', 'caja', 'account', ['inflow', 'outflow'], 'bar'),
  R('Caja y bancos', 'Salidas por tipo', 'Pagos, transferencias, retiros y comisiones.', 'caja', 'type', ['outflow'], 'donut', { filters: { direction: ['salida'] } }),
  R('Caja y bancos', 'Entradas por contraparte', 'Quién aporta el efectivo.', 'caja', 'counterparty', ['inflow'], 'hbar', { filters: { direction: ['entrada'] } }),
  R('Caja y bancos', 'Salidas por contraparte', 'A quién se paga.', 'caja', 'counterparty', ['outflow'], 'hbar', { filters: { direction: ['salida'] } }),
  R('Caja y bancos', 'Efectivo frente a banco', 'Entradas y salidas por tipo de cuenta.', 'caja', 'accountKind', ['inflow', 'outflow'], 'bar'),
  R('Caja y bancos', 'Flujo operativo mensual', 'Solo movimientos de operación.', 'caja', '_periodo', ['net'], 'area', { bucket: 'mes', filters: { flowClass: ['operacion'] } }),

  R('Control', 'Días hasta autorizar', 'Promedio de días del fin de semana a la autorización, por obra.', 'tiempos', 'work', ['daysToAuthorize'], 'bar'),
  R('Control', 'Días hasta el primer pago', 'Promedio de días de la autorización al primer pago confirmado.', 'tiempos', 'contractor', ['daysToPay'], 'hbar'),
  R('Control', 'Tiempos del proceso por semana', 'Días a autorizar y a pagar por semana.', 'tiempos', 'week', ['daysToAuthorize', 'daysToPay'], 'line'),
  R('Control', 'Actividad por persona', 'Operaciones registradas por usuario.', 'actividad', 'actor', ['n'], 'hbar'),
  R('Control', 'Actividad por día', 'Volumen de operaciones por día.', 'actividad', '_periodo', ['n'], 'area', { bucket: 'dia' }),
  R('Control', 'Actividad por acción', 'Qué operaciones se realizan más.', 'actividad', 'action', ['n'], 'hbar', { limit: 20 }),
  R('Control', 'Actividad por hora del día', 'En qué horario se trabaja en el sistema.', 'actividad', 'hour', ['n'], 'bar', { sort: 'key', limit: 24 }),
  R('Control', 'Altas, cambios y eventos por persona', 'Tipo de operación por usuario.', 'actividad', 'actor', ['n'], 'stack', { seriesBy: 'kind' }),
];
const TABLERO = ['Mano de obra por semana y obra', 'Costos por obra y categoría', 'Cuentas por cobrar por antigüedad', 'Saldo por beneficiario', 'Entradas y salidas por mes', 'Propuesto y aceptado por obra', 'Avances por semana', 'Exposición por obra'];

let META = null; const VALUES = new Map();
async function meta() { if (!META) { const d = await get('/api/analytics/datasets'); META = { buckets: d.buckets, list: d.items, by: Object.fromEntries(d.items.map((x) => [x.code, x])) }; } return META; }
const available = (m) => LIBRARY.filter((r) => m.by[r.config.dataset]);
const href = (config, title) => `#/reportes/explorar?c=${encodeURIComponent(JSON.stringify({ ...config, title }))}`;
const fmtM = (m, v) => (v === null || v === undefined ? 'No disponible' : m.type === 'money' ? money(v) : m.type === 'count' ? Number(v).toLocaleString('es-MX') : qty(v, m.type === 'avg' ? 1 : 2));
const rTabs = (cur) => tabs([{ key: 'tablero', label: 'Tablero', href: '#/reportes' }, { key: 'biblioteca', label: 'Biblioteca', href: '#/reportes/biblioteca' }, { key: 'explorar', label: 'Explorador', href: '#/reportes/explorar' }, { key: 'guardados', label: 'Mis reportes', href: '#/reportes/mis-reportes' }, { key: 'listados', label: 'Listados operativos', href: '#/reportes/listados' }, can('results.view') && { key: 'resultados', label: 'Resultados', href: '#/reportes/resultados' }], cur);

// Dibuja el resultado de una consulta con la gráfica elegida.
function draw(el, res, config, onClick) {
  const cats = res.rows.map((r) => String(r.label).replace(' (DEMO)', '')); const main = res.measures[0]; const isMoney = main.type === 'money'; const chart = config.chart || 'bar';
  const series = res.series ? res.series.map((s) => ({ name: String(s.name).replace(' (DEMO)', ''), data: s.data })) : res.measures.map((m) => ({ name: m.label, data: res.rows.map((r) => r[m.key]) }));
  const click = onClick ? (name, seriesName, idx) => onClick(res.rows[idx] ?? res.rows.find((r) => String(r.label).replace(' (DEMO)', '') === name), seriesName) : undefined;
  if (chart === 'donut') return donut(el, { label: config.title, money: isMoney, data: res.rows.map((r) => ({ name: String(r.label).replace(' (DEMO)', ''), value: r[main.key] })), onClick: click });
  if (chart === 'line' || chart === 'area') return lines(el, { label: config.title, categories: cats, series, money: isMoney, area: chart === 'area', onClick: click });
  return bars(el, { label: config.title, categories: cats, series, money: isMoney, stacked: chart === 'stack', horizontal: chart === 'hbar', onClick: click });
}

// ───────── Tablero ─────────
async function tablero() {
  const p = page('Reportes', { sub: 'Tablero general. Cada gráfica se abre en el explorador para cambiar dimensiones, filtros y periodo, o desglosar hasta el registro.', actions: [linkBtn('Biblioteca de reportes', '#/reportes/biblioteca'), linkBtn('Nuevo análisis', '#/reportes/explorar', 'primary')] });
  p.body.append(rTabs('tablero')); const m = await meta(); const grid = h('div', { class: 'chart-grid' }); p.body.append(grid);
  const picks = TABLERO.map((t) => available(m).find((r) => r.title === t)).filter(Boolean);
  if (!picks.length) grid.append(empty('Sin información disponible', 'Su perfil no tiene conjuntos de datos para analizar.'));
  for (const r of picks) { const box = h('div', {}); const c = card(r.title, h('p', { class: 'card-desc' }, r.desc), box, h('div', { class: 'actions' }, linkBtn('Abrir en el explorador', href(r.config, r.title), 'small ghost'))); grid.append(c);
    post('/api/analytics/query', r.config).then((res) => { if (!res.rows.length) { box.append(empty('Sin datos', 'Aún no hay registros para esta gráfica.')); return; } draw(box, res, { ...r.config, title: r.title }, () => go(href(r.config, r.title))); }).catch(() => box.append(h('p', { class: 'muted small' }, 'No disponible.'))); }
  return p.el;
}

// ───────── Biblioteca ─────────
async function biblioteca() {
  const m = await meta(); const all = available(m); const p = page('Biblioteca de reportes', { crumb: h('a', { href: '#/reportes' }, 'Reportes'), sub: `${all.length} reportes predefinidos. Cada uno es un punto de partida: en el explorador puede cambiar agrupación, medidas, periodo y filtros, y guardarlo como propio.`, actions: linkBtn('Nuevo análisis', '#/reportes/explorar', 'primary') });
  const areas = [...new Set(all.map((r) => r.area))]; let area = ''; let text = ''; const list = h('div', { class: 'stack' });
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Área' }); const paint = () => { seg.replaceChildren(...['', ...areas].map((a) => h('button', { type: 'button', 'aria-pressed': String(area === a), onclick: () => { area = a; paint(); render(); } }, a || 'Todas'))); };
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const render = () => { const q = norm(text); const rows = all.filter((r) => (!area || r.area === area) && (!q || norm(`${r.title} ${r.desc} ${m.by[r.config.dataset].title}`).includes(q))); clear(list);
    if (!rows.length) list.append(empty('Sin coincidencias', 'Pruebe con otra palabra o cree un análisis nuevo.', linkBtn('Nuevo análisis', '#/reportes/explorar', 'primary')));
    for (const a of areas) { const rs = rows.filter((r) => r.area === a); if (!rs.length) continue; list.append(h('div', { class: 'lib-area' }, icon(AREA_ICON[a] || 'chart'), a, h('small', {}, `${rs.length} reporte${rs.length === 1 ? '' : 's'}`)), h('div', { class: 'lib' }, rs.map((r) => h('a', { href: href(r.config, r.title) }, h('span', { class: 'ic' }, icon(r.config.chart === 'donut' ? 'chart' : r.config.chart === 'line' || r.config.chart === 'area' ? 'chart' : 'chart')), h('div', {}, h('b', {}, r.title), h('span', {}, r.desc)))))); } };
  paint(); render();
  p.body.append(rTabs('biblioteca'), h('div', { class: 'tools' }, h('div', { class: 'input-icon grow' }, icon('search'), h('input', { type: 'search', placeholder: 'Buscar reporte…', 'aria-label': 'Buscar reporte', oninput: (e) => { text = e.target.value; render(); } })), seg), list);
  return p.el;
}

// ───────── Explorador ─────────
function range(kind) { const t = today(); if (kind === 'mes') return { from: `${t.slice(0, 7)}-01`, to: t }; if (kind === 'anio') return { from: `${t.slice(0, 4)}-01-01`, to: t }; if (kind === '90d') { const d = new Date(`${t}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 90); return { from: d.toISOString().slice(0, 10), to: t }; } return { from: '', to: '' }; }
async function explorar(_, query) {
  const m = await meta(); if (!m.list.length) { const p0 = page('Explorador', {}); p0.body.append(empty('Sin conjuntos de datos', 'Su perfil no tiene información para analizar.')); return p0.el; }
  let cfg; try { cfg = query.c ? JSON.parse(query.c) : null; } catch { cfg = null; }
  if (!cfg || !m.by[cfg.dataset]) { const ds0 = m.list[0]; cfg = { dataset: ds0.code, groupBy: ds0.dims[0].key, measures: [ds0.measures[0].key], chart: 'bar' }; }
  cfg.filters = cfg.filters || {}; cfg.measures = cfg.measures?.length ? cfg.measures : [m.by[cfg.dataset].measures[0].key]; cfg.chart = cfg.chart || 'bar'; cfg.bucket = cfg.bucket || 'mes';
  const p = page(cfg.title || 'Explorador de análisis', { crumb: h('a', { href: '#/reportes' }, 'Reportes'), sub: 'Elija qué medir, cómo agruparlo y en qué periodo. Pulse una barra o un renglón para ver los registros que lo componen.' });
  const out = h('div', { class: 'stack' }); const cfgBox = h('div', {}); const chips = h('div', { class: 'row' }); let last = null; let seq = 0;
  const sync = () => history.replaceState(null, '', `#/reportes/explorar?c=${encodeURIComponent(JSON.stringify(cfg))}`);
  const change = (patch, redrawConfig = false) => { Object.assign(cfg, patch); sync(); if (redrawConfig) config(); run(); };
  const ds = () => m.by[cfg.dataset];
  const sel = (label, value, opts, on, { empty: emptyLabel } = {}) => h('label', { class: 'f' }, label, h('select', { onchange: (e) => on(e.target.value) }, emptyLabel ? h('option', { value: '' }, emptyLabel) : null, opts.map((o) => h('option', { value: o.id, selected: String(o.id) === String(value ?? '') }, o.label))));
  function config() {
    const d0 = ds(); const dims = [...(d0.hasDate ? [{ id: '_periodo', label: `Periodo (${d0.dateLabel.toLowerCase()})` }] : []), ...d0.dims.map((x) => ({ id: x.key, label: x.label }))]; const usesPeriod = cfg.groupBy === '_periodo' || cfg.seriesBy === '_periodo';
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Tipo de gráfica' }, Object.entries(CHARTS).map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String(cfg.chart === k), onclick: () => change({ chart: k }, true) }, l)));
    const quick = h('div', { class: 'seg', role: 'group', 'aria-label': 'Periodo rápido' }, [['mes', 'Este mes'], ['90d', '90 días'], ['anio', 'Este año'], ['todo', 'Todo']].map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String((cfg.quick || 'todo') === k), onclick: () => change({ ...range(k), quick: k }, true) }, l)));
    clear(cfgBox).append(card(null, h('div', { class: 'rp-config' },
      sel('Conjunto de datos', cfg.dataset, m.list.map((x) => ({ id: x.code, label: `${x.area} · ${x.title}` })), (v) => { const n = m.by[v]; change({ dataset: v, groupBy: n.dims[0].key, seriesBy: null, measures: [n.measures[0].key], filters: {}, title: null }, true); p.el.querySelector('h1').textContent = 'Explorador de análisis'; }),
      sel('Agrupar por', cfg.groupBy, dims, (v) => change({ groupBy: v, seriesBy: cfg.seriesBy === v ? null : cfg.seriesBy }, true)),
      sel('Separar en series', cfg.seriesBy, dims.filter((x) => x.id !== cfg.groupBy), (v) => change({ seriesBy: v || null }, true), { empty: 'Sin series' }),
      sel('Medida', cfg.measures[0], d0.measures.map((x) => ({ id: x.key, label: x.label })), (v) => change({ measures: [v, ...cfg.measures.slice(1).filter((k) => k !== v)] }, true)),
      cfg.seriesBy ? null : sel('Comparar con', cfg.measures[1], d0.measures.filter((x) => x.key !== cfg.measures[0]).map((x) => ({ id: x.key, label: x.label })), (v) => change({ measures: v ? [cfg.measures[0], v] : [cfg.measures[0]] }, true), { empty: 'Sin comparación' }),
      usesPeriod ? sel('Periodicidad', cfg.bucket, Object.entries(m.buckets).map(([id, label]) => ({ id, label })), (v) => change({ bucket: v })) : null,
      d0.hasDate ? h('label', { class: 'f' }, 'Desde', h('input', { type: 'date', value: cfg.from || '', onchange: (e) => change({ from: e.target.value, quick: 'x' }, true) })) : null,
      d0.hasDate ? h('label', { class: 'f' }, 'Hasta', h('input', { type: 'date', value: cfg.to || '', onchange: (e) => change({ to: e.target.value, quick: 'x' }, true) })) : null,
      sel('Mostrar', cfg.limit || 15, [5, 10, 15, 25, 50, 100].map((n) => ({ id: n, label: `Primeros ${n}` })), (v) => change({ limit: Number(v) }))),
      h('div', { class: 'row' }, seg, d0.hasDate ? quick : null, h('span', { class: 'tools spacer' }), btn('Filtro', addFilter, 'small', 'filter'), btn('Guardar', save, 'small', 'plus'), btn('Exportar', exportCsv, 'small', 'download')), chips));
    drawChips();
  }
  async function values() { if (!VALUES.has(cfg.dataset)) VALUES.set(cfg.dataset, (await get(`/api/analytics/datasets/${cfg.dataset}/values`)).values); return VALUES.get(cfg.dataset); }
  function drawChips() { const d0 = ds(); clear(chips).append(...Object.entries(cfg.filters).filter(([, v]) => v?.length).map(([k, vals]) => { const dm = d0.dims.find((x) => x.key === k); const vv = VALUES.get(cfg.dataset)?.[k]; const names = vals.map((v) => vv?.find((x) => x.id === v)?.label || v); return h('span', { class: 'fchip' }, h('span', {}, `${dm?.label || k}: ${names.join(', ')}`), h('button', { type: 'button', 'aria-label': `Quitar filtro ${dm?.label || k}`, onclick: () => { const f = { ...cfg.filters }; delete f[k]; change({ filters: f }, true); } }, icon('x'))); })); }
  async function addFilter() {
    const d0 = ds(); const vals = await values(); let key = d0.dims.find((x) => vals[x.key])?.key; const picked = new Set(); const list = h('div', { class: 'checks' });
    const paint = () => { picked.clear(); for (const v of cfg.filters[key] || []) picked.add(v); list.replaceChildren(...(vals[key] || []).map((v) => h('label', {}, h('input', { type: 'checkbox', checked: picked.has(v.id), onchange: (e) => { if (e.target.checked) picked.add(v.id); else picked.delete(v.id); } }), h('span', {}, v.label), h('small', {}, String(v.n))))); };
    const body = h('div', { class: 'stack' }, sel('Dimensión', key, d0.dims.filter((x) => vals[x.key]).map((x) => ({ id: x.key, label: x.label })), (v) => { key = v; paint(); }), list); paint();
    const ok = await dialog({ title: 'Filtrar', text: 'Marque los valores que desea incluir. Sin marcar ninguno, la dimensión no se filtra.', body, actions: [{ label: 'Cancelar', value: false }, { label: 'Aplicar', value: true, primary: true }] });
    if (ok) { const f = { ...cfg.filters }; if (picked.size) f[key] = [...picked]; else delete f[key]; change({ filters: f }, true); }
  }
  async function save() {
    const r = await formDialog({ title: 'Guardar reporte', text: 'Queda en "Mis reportes" con esta configuración. Los datos se calculan cada vez que se abre.', fields: [{ key: 'name', label: 'Nombre', required: true, value: cfg.title || `${ds().title} por ${last?.groupLabel || ''}`.trim(), wide: true }, { key: 'description', label: 'Descripción', type: 'textarea' }, { key: 'shared', label: 'Compartir con el equipo (cada quien verá solo lo que su perfil permite)', type: 'check' }], submit: (v) => post('/api/analytics/saved', { ...v, config: { ...cfg, title: v.name } }) });
    if (r) toast('Reporte guardado en "Mis reportes".', 'ok');
  }
  async function exportCsv() { try { const res = await api('POST', '/api/analytics/export', cfg, { raw: true }); const blob = await res.blob(); const a = h('a', { href: URL.createObjectURL(blob), download: `${cfg.title || cfg.dataset}.csv` }); document.body.append(a); a.click(); a.remove(); } catch (e) { showError(e); } }
  async function drill(row, seriesName) {
    if (!row || row.key === '__otros') { toast('"Otros" agrupa varios valores: aumente "Mostrar" para verlos por separado.'); return; }
    const filters = { ...cfg.filters, [cfg.groupBy]: [row.key] }; const s = cfg.seriesBy && last?.series?.find((x) => String(x.name).replace(' (DEMO)', '') === seriesName); if (s) filters[cfg.seriesBy] = [s.key];
    try { const r = await post('/api/analytics/rows', { ...cfg, filters }); const cols = r.columns.filter((c) => r.items.some((i) => i[c.key] !== null && i[c.key] !== undefined && i[c.key] !== '' && i[c.key] !== '0.00' && i[c.key] !== '0.0000') && c.key !== cfg.groupBy).slice(0, 8);
      await dialog({ title: `${last.groupLabel}: ${row.label}${s ? ` · ${s.name}` : ''}`, text: `${r.total} registro${r.total === 1 ? '' : 's'}${r.total > r.items.length ? ` (se muestran ${r.items.length})` : ''}. Abra cualquiera para llegar al documento de origen.`, wide: true, body: miniTable([...cols, { key: 'x', label: '', render: (i) => h('a', { class: 'btn small', href: i.href, onclick: () => document.querySelector('dialog[open]')?.closeDialog?.(null) }, 'Abrir') }], r.items),
        actions: [{ label: 'Exportar detalle', run: async () => { const res = await api('POST', '/api/analytics/rows', { ...cfg, filters, format: 'csv' }, { raw: true }); const blob = await res.blob(); const a = h('a', { href: URL.createObjectURL(blob), download: 'detalle.csv' }); document.body.append(a); a.click(); a.remove(); return false; } }, { label: 'Cerrar', value: null, primary: true }] }); } catch (e) { showError(e); }
  }
  async function run() {
    const my = ++seq; let res; try { res = await post('/api/analytics/query', cfg); } catch (e) { if (my === seq) { clear(out).append(h('div', { class: 'note bad' }, e.message)); } return; } if (my !== seq) return; last = res;
    const pivot = !!res.series; clear(out);
    for (const w of res.warnings) out.append(h('div', { class: 'note warn' }, w));
    out.append(h('div', { class: 'cards' }, res.measures.map((mm) => kpi({ label: mm.label, value: fmtM(mm, res.totals[mm.key]), period: mm.type === 'avg' ? 'Promedio del conjunto filtrado' : 'Total del conjunto filtrado' })), kpi({ label: 'Registros analizados', value: res.records.toLocaleString('es-MX'), period: `Al ${date(res.asOf)}` })));
    if (!res.rows.length) { out.append(card(null, empty('Sin datos', 'Ningún registro coincide con el periodo y los filtros.'))); return; }
    if (cfg.chart !== 'table') { const el = h('div', { class: 'chart big' }); out.append(card(null, draw(el, res, cfg, drill))); el.classList.add('big'); }
    const main = res.measures[0]; const t = (mm) => ({ money: 'money', qty: 'qty', avg: 'qty', count: 'int' }[mm.type]);
    const cols = pivot ? [{ key: 'label', label: res.groupLabel }, ...res.series.map((s, i) => ({ key: `s${i}`, label: String(s.name).replace(' (DEMO)', ''), type: t(main), decimals: main.type === 'avg' ? 1 : 2 })), { key: main.key, label: 'Total', type: t(main) }]
      : [{ key: 'label', label: res.groupLabel }, ...res.measures.map((mm) => ({ key: mm.key, label: mm.label, type: t(mm), decimals: mm.type === 'avg' ? 1 : 2 })), { key: 'count', label: 'Registros', type: 'int' }, ...(main.type === 'money' || main.type === 'qty' ? [{ key: 'share', label: '% del total', render: (r) => { const tot = Number(res.totals[main.key]); return tot ? `${((Number(r[main.key] || 0) / tot) * 100).toFixed(1)} %` : 'No calculable'; } }] : [])];
    const rows = res.rows.map((r, i) => (pivot ? { ...r, ...Object.fromEntries(res.series.map((s, j) => [`s${j}`, s.data[i]])) } : r));
    const totals = pivot ? { [main.key]: res.totals[main.key] } : Object.fromEntries(res.measures.filter((mm) => mm.type !== 'avg').map((mm) => [mm.key, res.totals[mm.key]]));
    out.append(card(null, miniTable(cols, rows, { totals, onRow: (r) => drill(r) })));
  }
  config(); p.body.append(rTabs('explorar'), cfgBox, out); if (Object.keys(cfg.filters).length) values().then(drawChips).catch(() => {}); run();
  return p.el;
}

// ───────── Mis reportes ─────────
async function guardados() {
  const p = page('Mis reportes', { crumb: h('a', { href: '#/reportes' }, 'Reportes'), sub: 'Análisis guardados por usted o compartidos por el equipo. Se recalculan con los datos vigentes cada vez que se abren.', actions: linkBtn('Nuevo análisis', '#/reportes/explorar', 'primary') });
  p.body.append(rTabs('guardados')); const box = h('div', {}); p.body.append(box);
  await load(box, () => get('/api/analytics/saved'), (d) => { if (!d.items.length) { box.append(card(null, empty('Aún no hay reportes guardados', 'Abra un reporte de la biblioteca o cree un análisis, ajústelo y pulse "Guardar".', linkBtn('Ir a la biblioteca', '#/reportes/biblioteca', 'primary')))); return; }
    box.append(miniTable([{ key: 'name', label: 'Reporte' }, { key: 'description', label: 'Descripción' }, { key: 'owner', label: 'Creó' }, { key: 'shared', label: 'Compartido', type: 'bool' }, { key: 'updatedAt', label: 'Actualizado', type: 'instant' }, { key: 'x', label: '', render: (s) => h('div', { class: 'row' }, h('a', { class: 'btn small', href: href(s.config, s.name) }, 'Abrir'), s.mine ? btn('Eliminar', async () => { if (await dialog({ title: 'Eliminar reporte guardado', text: `"${s.name}" dejará de aparecer en la lista.`, actions: [{ label: 'Cancelar', value: false }, { label: 'Eliminar', value: true, primary: true }] })) { try { await del(`/api/analytics/saved/${s.id}`); go(`#/reportes/mis-reportes?t=${Date.now()}`); } catch (e) { showError(e); } } }, 'small ghost') : null) }], d.items, { onRow: (s) => go(href(s.config, s.name)) })); });
  return p.el;
}

export const routes = [[/^\/reportes$/, tablero], [/^\/reportes\/biblioteca$/, biblioteca], [/^\/reportes\/explorar$/, explorar], [/^\/reportes\/mis-reportes$/, guardados]];
export { state, parseHash };
