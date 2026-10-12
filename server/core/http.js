// Servidor HTTP mínimo: enrutador, sesión por cookie, contexto de permisos, cuerpo JSON o binario,
// archivos estáticos únicamente desde web/. Nunca se sirven colecciones ni adjuntos por ruta estática.
import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { AppError, unauthenticated, forbidden, invalid } from './errors.js';
import { buildAccess } from './auth.js';
import { toCsv } from './csv.js';
import { renderPdf } from '../pdf/render.js';
import { fmtDate, fmtInstant } from '../domain/dates.js';
import * as d from '../domain/decimal.js';
import { DecimalError } from '../domain/decimal.js';

const MIME = { '.woff2': 'font/woff2', '.woff': 'font/woff', '.mjs': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const COOKIE = 'dcl_sesion';

export function createApp({ store, auth, config, webDir }) {
  const routes = [];
  const add = (method, pattern, handler, opts = {}) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ method, pattern, re, keys, handler, opts });
  };
  const app = {
    store, auth, config, routes,
    get: (p, h, o) => add('GET', p, h, o), post: (p, h, o) => add('POST', p, h, o), put: (p, h, o) => add('PUT', p, h, o), patch: (p, h, o) => add('PATCH', p, h, o), del: (p, h, o) => add('DELETE', p, h, o),
  };

  function cookieOf(req) {
    const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.cookie || '');
    return m ? m[1] : null;
  }
  app.setSession = (res, token) => res.setHeader('Set-Cookie', `${COOKIE}=${token || ''}; HttpOnly; SameSite=Lax; Path=/${config.secureCookies ? '; Secure' : ''}${token ? '' : '; Max-Age=0'}`);

  async function readBody(req, limit) {
    const chunks = []; let size = 0;
    for await (const ch of req) { size += ch.length; if (size > limit) throw new AppError(413, 'demasiado_grande', `El archivo o la solicitud excede el máximo permitido (${Math.round(limit / 1048576)} MB).`); chunks.push(ch); }
    return Buffer.concat(chunks);
  }

  function send(res, status, body, headers = {}) {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': buf.length, 'Cache-Control': 'no-store', ...headers });
    res.end(buf);
  }

  // Estáticos: solo la interfaz compilada. Recursos con huella → caché larga; todo comprimido y memorizado.
  const staticCache = new Map();
  function serveStatic(req, res, pathname) {
    let rel = decodeURIComponent(pathname); let base = webDir;
    // Visor de PDF para planos: se sirve desde la dependencia instalada, no desde Internet.
    if (rel.startsWith('/vendor/pdfjs/')) { base = path.join(config.root, 'node_modules', 'pdfjs-dist', 'build'); rel = rel.slice('/vendor/pdfjs'.length); }
    else if (rel === '/' || !path.extname(rel)) rel = '/index.html';
    const file = path.join(base, path.normalize(rel));
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'no_encontrado', message: 'Recurso no encontrado.' });
    const stat = fs.statSync(file); const ext = path.extname(file); const key = `${file}:${stat.mtimeMs}`;
    let entry = staticCache.get(key);
    if (!entry) { const raw = fs.readFileSync(file); const zip = /\.(html|js|mjs|css|svg|json|webmanifest)$/.test(ext) && raw.length > 1024; entry = { raw, gz: zip ? zlib.gzipSync(raw, { level: 9 }) : null, br: zip ? zlib.brotliCompressSync(raw) : null }; staticCache.set(key, entry); }
    const accept = req.headers['accept-encoding'] || ''; const enc = entry.br && /\bbr\b/.test(accept) ? 'br' : entry.gz && /\bgzip\b/.test(accept) ? 'gzip' : null; const buf = enc === 'br' ? entry.br : enc === 'gzip' ? entry.gz : entry.raw;
    const immutable = rel.startsWith('/_astro/') || base !== webDir;
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache', Vary: 'Accept-Encoding' };
    if (enc) headers['Content-Encoding'] = enc;
    res.writeHead(200, headers); res.end(req.method === 'HEAD' ? undefined : buf);
  }

  app.handle = async (req, res) => {
    const url = new URL(req.url, 'http://local');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:; object-src 'none'; frame-src 'self' blob:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'metodo', message: 'Método no permitido.' });
      return serveStatic(req, res, url.pathname);
    }
    try {
      let match = null, params = {};
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(url.pathname);
        if (m) { match = r; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); break; }
      }
      if (!match) throw new AppError(404, 'no_encontrado', 'Ruta no disponible.');
      if (req.method !== 'GET' && req.headers['x-dcl-solicitud'] !== '1') throw forbidden('Solicitud no reconocida por la aplicación.');
      const token = cookieOf(req);
      const sess = auth.session(token);
      let db = store.view();
      let user = sess ? db.get('users', sess.userId) : null;
      if (user && (user.status !== 'activo' || (user.sessionEpoch || 0) !== sess.epoch)) { auth.destroy(token); user = null; }
      if (!user && !match.opts.public) throw unauthenticated();
      let acc = user ? buildAccess(db, user) : null;
      let body = null;
      if (req.method !== 'GET') {
        if (match.opts.raw) body = await readBody(req, config.maxUploadBytes);
        else {
          const buf = await readBody(req, 4 * 1048576);
          if (buf.length) { try { body = JSON.parse(buf.toString('utf8')); } catch { throw invalid('La solicitud no tiene un formato válido.'); } }
          body = body || {};
        }
      }
      const query = Object.fromEntries(url.searchParams);
      let txCount = 0;
      const c = {
        req, res, params, query, body, user, config, store, auth, token, app,
        ip: req.socket.remoteAddress,
        get db() { return db; },
        get acc() { return acc; },
        // Operación atómica con actor real, motivo e idempotencia por solicitud.
        tx(action, fn, opts = {}) {
          const key = req.headers['idempotency-key'];
          const result = store.tx({ actor: user ? { id: user.id, name: user.name } : { id: null, name: 'sistema' }, action, reason: opts.reason ?? (body && !Buffer.isBuffer(body) ? body.reason : null) ?? null, onBehalfOf: opts.onBehalfOf || null, idempotencyKey: key ? `${key}#${txCount++}` : undefined }, fn);
          db = store.view(); if (user) { user = db.get('users', user.id); acc = buildAccess(db, user); }
          return result;
        },
      };
      if (match.opts.perm && !acc.can(match.opts.perm)) throw forbidden(undefined, { permission: match.opts.perm });
      if (match.opts.demoOnly && store.dataset !== 'demo') throw forbidden('Esta acción solo existe en el conjunto de demostración.');
      const out = await match.handler(c);
      if (res.writableEnded) return;
      if (out && out.__file) {
        const f = out.__file;
        res.writeHead(200, { 'Content-Type': f.mime, 'Content-Length': f.buffer.length, 'Cache-Control': 'private, no-store', 'Content-Disposition': `${f.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name || 'archivo')}`, 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" });
        return res.end(f.buffer);
      }
      send(res, out?.__status || 200, out === undefined ? { ok: true } : out);
    } catch (e) {
      if (e instanceof AppError) return send(res, e.status, e.toJSON());
      if (e instanceof DecimalError) return send(res, 422, { error: 'validacion', message: e.message });
      console.error('[error]', req.method, url.pathname, e);
      send(res, 500, { error: 'interno', message: 'Ocurrió un error inesperado. No se guardó ningún cambio de esta operación.' });
    }
  };
  app.listen = (port, host) => new Promise((resolve) => { const srv = http.createServer(app.handle); srv.listen(port, host, () => resolve(srv)); });
  return app;
}

// ── Listados: búsqueda, filtros, orden, paginación y totales sobre TODO el conjunto filtrado ──
// columns: [{ key, label, type: text|date|instant|money|qty|int|status|bool, total?: true, values?: {clave: etiqueta} }]
export function listResult(c, rows, columns, { search, defaultSort, name = 'listado', dateField } = {}) {
  const q = c.query;
  let out = rows;
  for (const [k, v] of Object.entries(q)) {
    if (!k.startsWith('f.') || v === '') continue;
    const key = k.slice(2); const set = new Set(v.split(','));
    out = out.filter((r) => set.has(String(r[key] ?? '')));
  }
  if (dateField && q.from) out = out.filter((r) => r[dateField] && r[dateField] >= q.from);
  if (dateField && q.to) out = out.filter((r) => r[dateField] && r[dateField].slice(0, 10) <= q.to);
  if (q.q) {
    const needle = norm(q.q);
    const keys = search || columns.filter((x) => !x.type || x.type === 'text' || x.type === 'status').map((x) => x.key);
    out = out.filter((r) => keys.some((k) => norm(r[k]).includes(needle)));
  }
  const sort = q.sort || defaultSort;
  if (sort) {
    const desc = sort.startsWith('-'); const key = desc ? sort.slice(1) : sort; const col = columns.find((x) => x.key === key);
    const numeric = col && ['money', 'qty', 'int'].includes(col.type);
    out = [...out].sort((a, b) => {
      const x = a[key], y = b[key];
      if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1;
      const r = numeric ? (col.type === 'int' ? x - y : d.cmp(x, y)) : String(x).localeCompare(String(y), 'es', { numeric: true });
      return desc ? -r : r;
    });
  }
  const totals = {};
  for (const col of columns) if (col.total) {
    const vals = out.map((r) => r[col.key]).filter((v) => v !== null && v !== undefined && v !== '');
    totals[col.key] = { value: d.sum(vals, col.type === 'qty' ? 4 : 2), missing: out.length - vals.length };
  }
  if (q.format === 'pdf') {
    // Listado impreso: respeta filtros, orden y las columnas visibles en pantalla.
    const want = q.cols ? q.cols.split(',') : null; const cols = (want ? columns.filter((x) => want.includes(x.key)) : columns).filter((x) => x.key && x.label).slice(0, 14); const use = cols.length ? cols : columns.slice(0, 10);
    const MAX = 1500; const title = String(q.title || name).slice(0, 90); const active = Object.keys(q).filter((k) => k.startsWith('f.') && q[k] !== '').length;
    const model = { title, audienceLabel: 'Listado · uso interno', subtitle: `Generado el ${fmtInstant(new Date().toISOString())}`, footer: 'Listado interno de DCL Instalaciones con los registros vigentes al momento de generarlo. No es un documento contable ni fiscal.',
      meta: [['Registros', String(out.length)], ['Periodo', dateField && (q.from || q.to) ? `${q.from ? fmtDate(q.from) : 'inicio'} a ${q.to ? fmtDate(q.to) : 'hoy'}` : 'Sin acotar'], ['Búsqueda', q.q || 'Sin búsqueda'], ['Filtros', active ? `${active} filtro(s) aplicados` : 'Sin filtros']],
      highlights: use.filter((x) => x.total).slice(0, 4).map((x, i) => [`Total ${x.label.toLowerCase()}`, totals[x.key].value, x.type, i === 0 ? 'primary' : undefined]),
      sections: [{ title: 'Detalle', columns: use, rows: out.slice(0, MAX), totals: use.filter((x) => x.total).map((x) => [`Total ${x.label.toLowerCase()}`, totals[x.key].value, x.type]), note: [out.length > MAX ? `Se muestran los primeros ${MAX} de ${out.length} registros; exporte a CSV para el conjunto completo.` : null, ...use.filter((x) => x.total && totals[x.key].missing).map((x) => `${totals[x.key].missing} registro(s) sin "${x.label}" no se sumaron como cero.`)].filter(Boolean).join(' ') || null }] };
    return renderPdf(model).then((buffer) => ({ __file: { buffer, mime: 'application/pdf', name: `${title}.pdf`, inline: true } }));
  }
  if (q.format === 'csv') {
    return { __file: { buffer: Buffer.from('﻿' + toCsv(out, columns, { human: true }), 'utf8'), mime: 'text/csv; charset=utf-8', name: `${name}.csv` } };
  }
  const pageSize = Math.min(Math.max(parseInt(q.pageSize, 10) || 50, 1), 500);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { items: out.slice((page - 1) * pageSize, page * pageSize), total: out.length, page, pageSize, totals, columns, sort: sort || null };
}
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
