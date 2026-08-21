const CACHE_NAME = "yoni-burger-v94-splash";
const ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./assets/css/style.css?v=yoni-speed-94",
  "./assets/css/admin.css?v=yoni-speed-94",
  "./assets/css/customer-redesign.css?v=yoni-speed-94",
  "./assets/js/app.js?v=yoni-speed-94",
  "./assets/js/admin.js?v=yoni-speed-94",
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
  const url = new URL(event.request.url);
  
  if (!url.origin.includes(self.location.origin) || url.pathname.includes("firestore") || url.pathname.includes("firebase")) {
    return;
  }

  if (event.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (event.request.destination === "image" || event.request.destination === "font") {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networked = fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
      
      return cached || networked;
    })
  );
});
