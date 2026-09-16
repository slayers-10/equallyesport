/* ══════════════════════════════════
   Equally Esport — Service Worker
   Cache offline + performances
══════════════════════════════════ */

const CACHE_NAME = 'equally-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pages/equipes.html',
  '/pages/resultats.html',
  '/pages/actualites.html',
  '/pages/palmares.html',
  '/pages/shop.html',
  '/pages/recrutement.html',
  '/pages/contact.html',
  '/pages/partenaires.html',
  '/css/variables.css',
  '/css/reset.css',
  '/css/components.css',
  '/css/main.css',
  '/js/components.js',
  '/js/particles.js',
  '/js/counter.js',
  '/js/loader.js',
  '/js/main.js',
  '/assets/logo/logo.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/manifest.json',
  '/404.html',
];

// Installation — mise en cache des assets statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation — supprimer les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — stratégie Network First pour l'API, Cache First pour les assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API → toujours réseau (pas de cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('{"ok":false,"error":"Offline"}', { headers: {'Content-Type':'application/json'} })));
    return;
  }

  // Panneau admin → toujours réseau (jamais de cache, les données/fonctionnalités doivent toujours être à jour)
  if (url.pathname.includes('admin.html') || url.pathname.startsWith('/js/admin')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // Assets statiques → Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache uniquement les requêtes http(s) — le Cache API ne supporte pas
        // les schémas comme chrome-extension:, moz-extension:, data:, etc.
        const isCacheable = response.ok
          && event.request.method === 'GET'
          && (url.protocol === 'http:' || url.protocol === 'https:');
        if (isCacheable) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => {
        // Page offline
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
