/* 靜態檔先快取；政府 API 永遠走網絡，唔好存舊班次。 */
const CACHE = 'hk-transit-static-v1';
const API_HOST = /etabus\.gov\.hk$|data\.gov\.hk$|weather\.gov\.hk$/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (API_HOST.test(url.hostname)) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh.ok && (req.mode === 'navigate' || url.pathname.endsWith('.webmanifest') || url.pathname.includes('/icons/'))) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      const hit = await caches.match(req);
      if (hit) return hit;
      return new Response('離線', { status: 503, statusText: 'offline' });
    }
  })());
});
