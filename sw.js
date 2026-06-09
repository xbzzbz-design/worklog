/* WorkLog service worker — enables PWA install + offline, without serving stale HTML */
const CACHE = 'worklog-v4';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  const isHTML = req.mode === 'navigate' ||
    req.url.endsWith('.html') ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // Network-first for HTML so a deploy is picked up immediately; fall back to cache offline.
    // `cache: 'reload'` bypasses the browser's HTTP cache (GitHub Pages sets a
    // ~10-min max-age on HTML) so a fresh deploy isn't masked by a stale page.
    e.respondWith(
      fetch(req, { cache: 'reload' }).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for static assets (content-hashed by Vite, or ?v= busted).
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
