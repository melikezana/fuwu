/* FUWU service worker: uygulama kabuğu hızı ve çevrimdışı sayfa.
 * Kişisel veri, API yanıtı veya HTML sayfası önbelleğe alınmaz; yalnızca sürümlü statik dosyalar. */
const VERSION = "fuwu-sw-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/fuwu-icon-192.png", "/icons/fuwu-icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !key.startsWith(VERSION)).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/fonts/");
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Sayfa geçişleri: her zaman ağdan; bağlantı yoksa çevrimdışı sayfası.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Sürümlü (hash'li) statik dosyalar: önce önbellek.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(request).then(cached =>
          cached || fetch(request).then(response => {
            if (response.ok && response.type === "basic") cache.put(request, response.clone());
            return response;
          }),
        ),
      ),
    );
  }
});
