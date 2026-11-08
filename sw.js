// Сервис-воркер: игра работает без интернета.
// Стратегия: сначала сеть (со сверкой с сайтом, чтобы обновления приходили сразу), если сети нет — кэш.
// При выпуске новой версии меняй номер в CACHE (и GAME_VERSION в index.html).
const CACHE = 'vihr-v14';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms){
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(r => { clearTimeout(t); resolve(r); }, err => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // проверка обновления — только напрямую с сайта, без подмены из кэша
  if (url.searchParams.has('check')){ e.respondWith(fetch(e.request.url, { cache: 'no-store' })); return; }
  // no-cache: браузер обязательно сверяется с сайтом, а не берёт старую копию из своего кэша
  e.respondWith(
    withTimeout(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }), 4000)
      .then(res => {
        if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(r => r || caches.match('./index.html')))
  );
});
