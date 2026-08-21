const CACHE_NAME = "yoni-burger-v93-final";
const ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./assets/css/style.css?v=yoni-speed-93",
  "./assets/css/admin.css?v=yoni-speed-93",
  "./assets/css/customer-redesign.css?v=yoni-speed-93",
  "./assets/js/app.js?v=yoni-speed-93",
  "./assets/js/admin.js?v=yoni-speed-93",
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
  
  // Skip cross-origin and Firebase/Firestore requests
  if (!url.origin.includes(self.location.origin) || url.pathname.includes("firestore") || url.pathname.includes("firebase")) {
    return;
  }

  // NETWORK-FIRST for HTML files to prevent "Ghost" content flash
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

  // Cache-First for Images and Fonts
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

  // Stale-While-Revalidate for JS and CSS
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
