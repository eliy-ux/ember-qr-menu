const CACHE_NAME = "yoni-burger-v51";
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/css/style.css?v=yoni-speed-51",
  "./assets/css/customer-redesign.css?v=yoni-speed-51",
  "./assets/css/animations.css?v=yoni-speed-51",
  "./assets/css/responsive.css?v=yoni-speed-51",
  "./assets/js/app.js?v=yoni-speed-51",
  "./assets/js/firebase.js?v=yoni-speed-51",
  "./assets/js/firestore.js?v=yoni-speed-51",
  "./assets/js/config.js",
  "./assets/js/utils.js",
  "./manifest.webmanifest",
  "./assets/icons/yoni.svg"
];

// High-performance caching strategy: Stale-While-Revalidate
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and external requests (except Google Fonts/Unsplash)
  if (request.method !== "GET") return;

  // Strategy for static assets and page: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        // Only cache successful local responses or images
        if (networkResponse.ok && (url.origin === self.location.origin || url.hostname.includes("unsplash.com") || url.hostname.includes("gstatic.com"))) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation
        if (request.mode === "navigate" && !url.pathname.includes("admin.html")) {
          return caches.match("./index.html");
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
