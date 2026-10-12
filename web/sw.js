// Instalable: guarda solo la interfaz (nunca datos de la empresa). Las consultas a /api siempre van al servidor.
const SHELL = 'dcl-interfaz-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/css/app.css', '/icons/icon.svg']))); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // sin copia de datos
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
