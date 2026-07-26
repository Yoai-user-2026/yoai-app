// Yoai PWA Service Worker — 極簡版
// 暫不離線緩存(對話需即時 AI 回應),只處理版本提示

const CACHE_NAME = 'yoai-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 不緩存任何請求 — Yoai 的核心是即時對話
  // 這裡只做 network-first,失敗時可離線提示
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // 靜態資源(network-first 帶快取後備)
  if (url.origin === location.origin && (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/icons/')
  )) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request)),
    );
  }
});
