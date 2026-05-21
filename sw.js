const CACHE = 'agent-zero-v2';
const STATIC = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './icon-32.png',
];

// Install — pre-cache local files only (no external CDN — those cause redirect issues on iOS)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch — critical iOS fix: never intercept navigation requests or cross-origin requests
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Let the browser handle: navigations, cross-origin (CDN), non-GET
  if (e.request.mode === 'navigate') return;
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  // Cache-first for same-origin static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request, { redirect: 'follow' }).then(res => {
        // Only cache clean 200 responses — never opaque or redirected
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached || new Response('', { status: 404 }));
    })
  );
});
