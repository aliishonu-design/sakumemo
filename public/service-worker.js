// サクメモ Service Worker - オフライン対応
const CACHE_NAME = 'sakumemo-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

// インストール時: アプリの基本ファイルをキャッシュ
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(()=>{}))
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

  // Supabase API・外部API（天気・地図など）はネットワーク優先（キャッシュしない）
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('open-meteo') ||
    url.hostname.includes('openstreetmap') ||
    e.request.method !== 'GET'
  ) {
    return; // ブラウザのデフォルト動作（ネットワーク）に任せる
  }

  // アプリのファイル（JS/CSS/HTML/画像）はキャッシュ優先＋裏で更新
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          // 正常なレスポンスのみキャッシュ更新
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached); // オフライン時はキャッシュを返す
      return cached || fetchPromise;
    })
  );
});
