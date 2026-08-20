const CACHE_NAME = "yoni-burger-v63";
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/css/style.css",
  "./assets/css/customer-redesign.css",
  "./assets/css/animations.css",
  "./assets/css/responsive.css",
  "./assets/js/app.js",
  "./assets/js/firebase.js",
  "./assets/js/firestore.js",
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

  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        // Cache successful responses from our origin or allowed external domains
        const isAllowedExternal = ["unsplash.com", "gstatic.com", "googleapis.com", "manuscdn.com"].some(d => url.hostname.includes(d));
        
        if (networkResponse.ok && (url.origin === self.location.origin || isAllowedExternal)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(err => {
        debugLog("Fetch failed:", url.href);
        
        // Navigation fallback
        if (request.mode === "navigate" && !url.pathname.includes("admin.html")) {
          return caches.match("./index.html");
        }
        
        // Image fallback
        if (request.destination === "image") {
          return caches.match("https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=70");
        }
        
        throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
