// サクメモ Service Worker - オフライン対応（v3）
const CACHE_NAME = 'sakumemo-v4';

// インストール時: 即座に有効化
self.addEventListener('install', () => {
  self.skipWaiting();
});

// 有効化時: 古いキャッシュを削除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // http / https 以外（chrome-extension など）は扱わない
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // GET 以外、外部API、別オリジンはネットワークに任せる
  if (
    req.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('open-meteo') ||
    url.hostname.includes('openstreetmap')
  ) {
    return;
  }

  // HTML（ページ本体）は「ネットワーク優先」: 常に最新を取得し、最新のJS参照を保つ
  // オフライン時のみキャッシュした /app を返す
  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put('/app', clone); } catch (err) {}
          });
          return res;
        })
        .catch(() => caches.match('/app'))
    );
    return;
  }

  // それ以外（ハッシュ付きJS/CSS/画像など）は「キャッシュ優先＋裏で更新」
  // ファイル名にハッシュが付くため、古いファイルは自然に使われなくなる
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try { cache.put(req, clone); } catch (err) {}
            });
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
