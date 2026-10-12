// Instalable: guarda solo la interfaz (nunca datos de la empresa). Las consultas a /api siempre van al servidor.
const SHELL = 'dcl-interfaz-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return; // sin copia de datos
  // Recursos con huella: primero la copia local. Lo demás: red, con la copia como respaldo sin conexión.
  if (url.pathname.startsWith('/_astro/')) { e.respondWith(caches.open(SHELL).then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }))); return; }
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
