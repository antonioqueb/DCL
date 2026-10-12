// Aritmética decimal exacta sobre cadenas ("322879.30"). Internamente usa BigInt escalado.
// Regla única de redondeo: mitad lejos de cero (half-up simétrico), aplicada al escalar el resultado.
// Escalas: dinero 2, cantidades 4, precios unitarios 4, porcentajes 4.

export const SCALE = { money: 2, qty: 4, price: 4, pct: 4 };
const W = 12; // escala de trabajo interna
const POW = (n) => 10n ** BigInt(n);

export class DecimalError extends Error {}

function toBig(v) {
  if (typeof v === 'bigint') return v;
  if (v === null || v === undefined || v === '') throw new DecimalError('Valor decimal faltante');
  let s = typeof v === 'number' ? numToStr(v) : String(v).trim();
  const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m || (m[2] === '' && (m[3] === undefined || m[3] === ''))) throw new DecimalError(`Valor decimal inválido: "${v}"`);
  const frac = (m[3] || '').padEnd(W, '0');
  if (frac.length > W) throw new DecimalError(`Demasiados decimales: "${v}"`);
  const b = BigInt((m[2] || '0') + frac);
  return m[1] === '-' ? -b : b;
}

function numToStr(n) {
  if (!Number.isFinite(n)) throw new DecimalError('Número no finito');
  // Los números JS solo se aceptan como entrada de conveniencia (enteros o literales cortos).
  const s = String(n);
  if (/e/i.test(s)) return n.toFixed(W);
  return s;
}

function roundTo(big, scale) {
  const div = POW(W - scale);
  const neg = big < 0n;
  let a = neg ? -big : big;
  let q = a / div;
  if ((a % div) * 2n >= div) q += 1n;
  return neg ? -q : q;
}

function out(big, scale) {
  const q = roundTo(big, scale);
  const neg = q < 0n;
  let s = (neg ? -q : q).toString().padStart(scale + 1, '0');
  const res = scale ? `${s.slice(0, -scale)}.${s.slice(-scale)}` : s;
  return neg && /[1-9]/.test(res) ? `-${res}` : res;
}

export const isDec = (v) => { try { toBig(v); return true; } catch { return false; } };
export const norm = (v, scale = 2) => out(toBig(v), scale);
export const add = (a, b, scale = 2) => out(toBig(a) + toBig(b), scale);
export const sub = (a, b, scale = 2) => out(toBig(a) - toBig(b), scale);
export const neg = (a, scale = 2) => out(-toBig(a), scale);
export const abs = (a, scale = 2) => { const x = toBig(a); return out(x < 0n ? -x : x, scale); };
export const mul = (a, b, scale = 2) => {
  const p = toBig(a) * toBig(b);
  // p está en escala 2W; se reduce a W con redondeo y luego a la escala destino en un solo paso.
  const div = POW(2 * W - scale);
  const n = p < 0n; const x = n ? -p : p;
  let q = x / div; if ((x % div) * 2n >= div) q += 1n;
  return out((n ? -q : q) * POW(W - scale), scale);
};
export const div = (a, b, scale = 4) => {
  const d = toBig(b);
  if (d === 0n) return null; // no calculable: nunca #DIV/0 ni cero
  const num = toBig(a) * POW(W) * 10n ** BigInt(scale + 1);
  const dd = d * 10n ** BigInt(scale + 1);
  // división con redondeo mitad lejos de cero a la escala pedida
  const sign = (num < 0n) !== (dd < 0n);
  const A = num < 0n ? -num : num; const B = dd < 0n ? -dd : dd;
  const unit = POW(W - scale);
  let q = (A / B) / unit; const rem = A - q * unit * B;
  if (rem * 2n >= unit * B) q += 1n;
  return out((sign ? -q : q) * unit, scale);
};
export const cmp = (a, b) => { const x = toBig(a), y = toBig(b); return x < y ? -1 : x > y ? 1 : 0; };
export const eq = (a, b) => cmp(a, b) === 0;
export const gt = (a, b) => cmp(a, b) > 0;
export const gte = (a, b) => cmp(a, b) >= 0;
export const lt = (a, b) => cmp(a, b) < 0;
export const lte = (a, b) => cmp(a, b) <= 0;
export const isZero = (a) => toBig(a) === 0n;
export const isNeg = (a) => toBig(a) < 0n;
export const isPos = (a) => toBig(a) > 0n;
export const sum = (list, scale = 2) => out(list.reduce((acc, v) => acc + toBig(v), 0n), scale);
export const min = (a, b, scale = 2) => (cmp(a, b) <= 0 ? norm(a, scale) : norm(b, scale));
export const max = (a, b, scale = 2) => (cmp(a, b) >= 0 ? norm(a, scale) : norm(b, scale));

// Importe de una partida: cantidad × precio, redondeado a centavos por partida.
export const lineAmount = (qty, price) => mul(qty, price, SCALE.money);
// Porcentaje de un importe (pct expresado como 15 = 15%).
export const pctOf = (amount, pct, scale = 2) => out((toBig(amount) * toBig(pct)) / POW(W) / 100n, scale);
// Razón a/b como porcentaje; null si el denominador no es válido.
export const ratioPct = (a, b, scale = 2) => { const r = div(a, b, scale + 4); return r === null ? null : mul(r, 100, scale); };

// Reparte un total entre pesos de forma exacta: la suma de las partes es igual al total.
// Devuelve partes y el residuo de redondeo asignado (al último peso no nulo).
export function allocate(total, weights, scale = 2) {
  const tw = weights.reduce((a, w) => a + toBig(w), 0n);
  if (tw === 0n) throw new DecimalError('La base de reparto suma cero');
  const T = toBig(total);
  const parts = weights.map((w) => toBig(out((T * toBig(w)) / tw, scale)));
  const diff = toBig(out(T, scale)) - parts.reduce((a, p) => a + p, 0n);
  let idx = -1;
  for (let i = weights.length - 1; i >= 0; i--) if (toBig(weights[i]) !== 0n) { idx = i; break; }
  if (diff !== 0n && idx >= 0) parts[idx] += diff;
  return { parts: parts.map((p) => out(p, scale)), roundingDiff: out(diff, scale), roundingIndex: diff !== 0n ? idx : null };
}

// Presentación local es-MX (solo pantalla y PDF; nunca en archivos de datos).
export function fmtMoney(v, currency = 'MXN') {
  if (v === null || v === undefined || v === '') return '—';
  const s = norm(v, 2); const n = s.startsWith('-');
  const [i, f] = (n ? s.slice(1) : s).split('.');
  return `${n ? '-' : ''}$${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${f}${currency && currency !== 'MXN' ? ' ' + currency : ''}`;
}
export function fmtQty(v, decimals = 2) {
  if (v === null || v === undefined || v === '') return '—';
  const s = norm(v, decimals); const n = s.startsWith('-');
  const [i, f] = (n ? s.slice(1) : s).split('.');
  return `${n ? '-' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${f ? '.' + f : ''}`;
}
