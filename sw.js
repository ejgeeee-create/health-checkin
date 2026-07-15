/* Service worker: precache the app shell, runtime-cache fonts.
   Bump CACHE_VERSION on every deploy to push updates. */

const CACHE_VERSION = 'checkin-v1';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Google Fonts: cache-first with runtime fill, so the app works offline
  // after the first online load.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) =>
        cache.match(event.request).then(
          (hit) =>
            hit ||
            fetch(event.request).then((res) => {
              cache.put(event.request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // App shell: cache-first, network fallback.
  if (event.request.method === 'GET' && url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request))
    );
  }
});
