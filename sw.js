const CACHE_NAME = "yoni-burger-v55";
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/css/style.css?v=yoni-speed-55",
  "./assets/css/customer-redesign.css?v=yoni-speed-55",
  "./assets/css/animations.css?v=yoni-speed-55",
  "./assets/css/responsive.css?v=yoni-speed-55",
  "./assets/js/app.js?v=yoni-speed-55",
  "./assets/js/firebase.js?v=yoni-speed-55",
  "./assets/js/firestore.js?v=yoni-speed-55",
  "./assets/js/config.js",
  "./assets/js/utils.js",
  "./manifest.webmanifest",
  "./assets/icons/yoni.svg"
];

const debugLog = (...args) => console.log("%c[YONI-SPEED]", "color: #ff6600; font-weight: bold;", ...args);

self.addEventListener("install", event => {
  debugLog("Installing version:", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        debugLog("Pre-caching app shell...");
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  debugLog("Activating...");
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => {
        debugLog("Cleaning old cache:", key);
        return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Strategy for static assets and page: Stale-While-Revalidate
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        // Only cache successful local responses or images
        if (networkResponse.ok && (
          url.origin === self.location.origin || 
          url.hostname.includes("unsplash.com") || 
          url.hostname.includes("gstatic.com") ||
          url.hostname.includes("googleapis.com")
        )) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(err => {
        debugLog("Fetch failed (offline?):", url.pathname);
        // Offline fallback for navigation
        if (request.mode === "navigate" && !url.pathname.includes("admin.html")) {
          return caches.match("./index.html");
        }
        throw err;
      });

      if (cachedResponse) {
        debugLog("Serving from cache:", url.pathname);
        return cachedResponse;
      }

      debugLog("Fetching from network:", url.pathname);
      return fetchPromise;
    })
  );
});
