const CACHE_NAME = "yoni-burger-v91-showcase";
const ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./assets/css/style.css?v=yoni-speed-91",
  "./assets/css/admin.css?v=yoni-speed-91",
  "./assets/css/customer-redesign.css?v=yoni-speed-91",
  "./assets/js/app.js?v=yoni-speed-91",
  "./assets/js/admin.js?v=yoni-speed-91",
  "./assets/js/utils.js",
  "./assets/icons/yoni.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // Skip cross-origin and Firebase requests to avoid issues
  if (!event.request.url.startsWith(self.location.origin) || event.request.url.includes("firestore") || event.request.url.includes("firebase")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
