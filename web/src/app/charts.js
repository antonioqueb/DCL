// Gráficas con Apache ECharts. Se carga bajo demanda (solo en las pantallas que la usan)
// y toma colores y tipografía de los tokens del tema, también en modo oscuro.
let lib = null;
async function load() {
  if (lib) return lib;
  const [core, charts, comps, renderers] = await Promise.all([import('echarts/core'), import('echarts/charts'), import('echarts/components'), import('echarts/renderers')]);
  core.use([charts.BarChart, charts.LineChart, charts.PieChart, comps.GridComponent, comps.TooltipComponent, comps.LegendComponent, comps.DatasetComponent, renderers.CanvasRenderer]);
  lib = core; return lib;
}
// Los tokens están en oklch; el lienzo los convierte a un color que ECharts puede operar.
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
function color(name) { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = v; probe.fillRect(0, 0, 1, 1); const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data; return a === 255 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`; }
const palette = () => ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'].map(color);

export const short = (n) => { const v = Number(n) || 0; const a = Math.abs(v); const s = a >= 1e6 ? `${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)} M` : a >= 1e3 ? `${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)} k` : a.toFixed(0); return `${v < 0 ? '-' : ''}$${s}`; };
export const full = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plain = (n) => Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 });

function base(money) {
  const fg = color('--foreground'), muted = color('--muted-foreground'), border = color('--border'), pop = color('--popover');
  const axis = { axisLine: { lineStyle: { color: border } }, axisTick: { show: false }, axisLabel: { color: muted, fontSize: 11, hideOverlap: true }, splitLine: { lineStyle: { color: border, type: 'dashed' } } };
  return { fg, muted, border, axis,
    option: { color: palette(), textStyle: { fontFamily: getComputedStyle(document.body).fontFamily, color: fg }, animationDuration: 350,
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      legend: { type: 'scroll', top: 0, left: 0, right: 0, pageIconSize: 10, pageTextStyle: { color: muted }, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 16, textStyle: { color: muted, fontSize: 12 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(127,127,127,0.08)' } }, backgroundColor: pop, borderColor: border, borderWidth: 1, padding: [8, 10], textStyle: { color: fg, fontSize: 12 }, extraCssText: 'border-radius:8px;box-shadow:0 10px 30px -12px rgba(0,0,0,.3);', valueFormatter: (v) => (v === null || v === undefined ? 'No disponible' : money ? full(v) : plain(v)) } } };
}
// Monta una gráfica y la mantiene al cambiar el tamaño o el tema. build(recibe utilidades) devuelve la opción.
export function mount(el, build, onClick) {
  el.classList.add('chart'); el.setAttribute('role', 'img'); let chart = null; let dead = false; let tries = 0;
  const draw = async () => {
    const ec = await load(); if (dead || !el.isConnected) return;
    chart?.dispose(); chart = ec.init(el, null, { renderer: 'canvas' }); chart.setOption(build());
    if (onClick) { el.classList.add('clickable'); chart.on('click', (p) => onClick(p.name, p.seriesName, p.dataIndex)); }
  };
  // Primer dibujo: en cuanto el contenedor está en el documento y tiene tamaño (sin depender de eventos de redimensionado).
  const start = () => { if (dead || chart) return; if (el.isConnected && el.clientWidth > 0) draw().catch((e) => { console.error('No se pudo dibujar la gráfica', e); el.textContent = 'No se pudo dibujar la gráfica.'; }); else if (tries++ < 200) setTimeout(start, 50); };
  start();
  const onTheme = () => { if (chart) draw(); };
  const ro = new ResizeObserver(() => { if (!el.isConnected) { if (chart) { dead = true; chart.dispose(); ro.disconnect(); document.removeEventListener('dcl:tema', onTheme); } return; } chart?.resize(); });
  ro.observe(el); document.addEventListener('dcl:tema', onTheme);
  return el;
}

export function bars(el, { categories, series, stacked = false, horizontal = false, money = true, label, onClick }) {
  if (label) el.setAttribute('aria-label', label);
  return mount(el, () => { const b = base(money); const cat = { type: 'category', data: categories, ...b.axis, splitLine: { show: false }, axisLabel: { ...b.axis.axisLabel, interval: 0, width: horizontal ? 150 : categories.length <= 4 ? 200 : 96, overflow: 'truncate' } }; const val = { type: 'value', ...b.axis, axisLine: { show: false }, axisLabel: { ...b.axis.axisLabel, formatter: (v) => (money ? short(v) : plain(v)) } };
    return { ...b.option, legend: series.length > 1 ? b.option.legend : { show: false }, grid: { ...b.option.grid, top: series.length > 1 ? 36 : 12 }, xAxis: horizontal ? val : cat, yAxis: horizontal ? { ...cat, inverse: true } : val,
      series: series.map((s) => ({ name: s.name, type: 'bar', stack: stacked ? 'total' : undefined, data: s.data.map((v) => (v === null || v === undefined ? null : Number(v))), barMaxWidth: 48, itemStyle: { borderRadius: stacked ? 0 : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0], color: s.color ? color(s.color) : undefined }, emphasis: { focus: 'series' } })) }; }, onClick);
}
export function lines(el, { categories, series, money = true, area = true, label, onClick }) {
  if (label) el.setAttribute('aria-label', label);
  return mount(el, () => { const b = base(money);
    return { ...b.option, tooltip: { ...b.option.tooltip, axisPointer: { type: 'line', lineStyle: { color: b.border } } }, legend: series.length > 1 ? b.option.legend : { show: false }, grid: { ...b.option.grid, top: series.length > 1 ? 36 : 12 },
      xAxis: { type: 'category', data: categories, boundaryGap: false, ...b.axis, splitLine: { show: false } }, yAxis: { type: 'value', ...b.axis, axisLine: { show: false }, axisLabel: { ...b.axis.axisLabel, formatter: (v) => (money ? short(v) : plain(v)) } },
      series: series.map((s) => ({ name: s.name, type: 'line', smooth: 0.25, symbol: 'circle', symbolSize: 6, showSymbol: categories.length < 20, lineStyle: { width: 2 }, areaStyle: area ? { opacity: 0.1 } : undefined, data: s.data.map((v) => (v === null || v === undefined ? null : Number(v))) })) }; }, onClick);
}
export function donut(el, { data, money = true, label, onClick }) {
  if (label) el.setAttribute('aria-label', label);
  return mount(el, () => { const b = base(money);
    return { ...b.option, tooltip: { ...b.option.tooltip, trigger: 'item' }, legend: { ...b.option.legend, top: 'middle', left: 'auto', right: 0, orient: 'vertical' },
      series: [{ type: 'pie', radius: ['56%', '80%'], center: ['34%', '52%'], avoidLabelOverlap: true, label: { show: false }, itemStyle: { borderColor: color('--card'), borderWidth: 2, borderRadius: 4 }, data: data.map((x) => ({ name: x.name, value: Number(x.value) || 0 })) }] }; }, onClick);
}
