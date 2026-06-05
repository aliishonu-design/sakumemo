// サクメモ Service Worker - オフライン対応
const CACHE_NAME = 'sakumemo-v2';
const APP_SHELL = [
  '/app',
  '/index.html',
  '/manifest.webmanifest',
];

// インストール時: アプリの基本ファイルをキャッシュ
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

// 有効化時: 古いキャッシュを削除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // http / https 以外（chrome-extension など）は一切扱わない
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // GET 以外、または外部API（Supabase・天気・地図）はネットワークに任せる（キャッシュしない）
  if (
    e.request.method !== 'GET' ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('open-meteo') ||
    url.hostname.includes('openstreetmap')
  ) {
    return;
  }

  // 同一オリジンのファイルのみキャッシュ対象（クロスオリジンは対象外）
  if (url.origin !== self.location.origin) {
    return;
  }

  // アプリのファイル（JS/CSS/HTML/画像）はキャッシュ優先＋裏で更新
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          // 正常なレスポンスのみキャッシュ更新
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // put は try で囲み、失敗してもアプリに影響させない
              try { cache.put(e.request, clone); } catch (err) {}
            });
          }
          return res;
        })
        .catch(() => cached); // オフライン時はキャッシュを返す
      return cached || fetchPromise;
    })
  );
});
