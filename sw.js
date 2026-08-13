// ERGOX POST — Service Worker (offline shell)
const CACHE = 'ergox-v3-1';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './lead.html',
  './privacidad.html',
  './assets/css/app.css',
  './js/app.js',
  './js/config.js',
  './js/core/util.js',
  './js/core/security.js',
  './js/core/migrations.js',
  './js/core/db.js',
  './js/core/ui.js',
  './js/core/tasas.js',
  './js/providers/local.js',
  './js/providers/sheets.js',
  './js/providers/sesion.js',
  './js/content/datos.js',
  './js/views/login.js',
  './js/views/dashboard.js',
  './js/views/generador.js',
  './js/views/historial.js',
  './js/views/leads.js',
  './js/views/calendario.js',
  './js/views/planner.js',
  './js/views/creditos.js',
  './js/views/config.js',
  './js/views/admin.js',
  './js/views/informe.js',
  './js/marketing/diseno.js',
  './js/marketing/planner.js',
  './js/marketing/landing.js',
  './js/finanzas/factura.js',
  './js/finanzas/reportes.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-maskable.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // nunca cachear llamadas al backend (cross-origin) ni datos dinámicos
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((enCache) => {
      const red = fetch(e.request).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return res;
      }).catch(() => enCache);
      return enCache || red;
    })
  );
});