// サクメモ Service Worker v5
const CACHE = 'sakumemo-v5';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // http/https以外は無視
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 外部API・別オリジンは無視
  if (url.origin !== self.location.origin) return;

  // GETのみ処理
  if (e.request.method !== 'GET') return;

  const isNav = e.request.mode === 'navigate';

  if (isNav) {
    // HTMLはネットワーク優先、失敗時のみキャッシュ
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // JS/CSS/画像はキャッシュ優先
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
  }
});
