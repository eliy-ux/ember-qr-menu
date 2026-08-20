const CACHE_NAME = "yoni-burger-v64";
const APP_SHELL = [
  "/",
  "/index.html",
  "/admin.html",
  "/manifest.webmanifest",
  "/assets/icons/yoni.svg",
  "/assets/css/style.css",
  "/assets/css/customer-redesign.css",
  "/assets/css/animations.css",
  "/assets/css/responsive.css",
  "/assets/css/admin.css",
  "/assets/js/app.js",
  "/assets/js/admin.js",
  "/assets/js/firebase.js",
  "/assets/js/firestore.js",
  "/assets/js/config.js",
  "/assets/js/utils.js"
];

// Helper to check if a URL is an external asset we want to cache
const isCacheableExternal = (url) => {
  const hosts = ["unsplash.com", "gstatic.com", "googleapis.com", "manuscdn.com"];
  return hosts.some(host => url.hostname.includes(host));
};

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[YONI-SW] Pre-caching app shell");
      // Use a more resilient approach: cache what we can, don't fail the whole install
      return Promise.allSettled(APP_SHELL.map(url => {
        return fetch(url).then(res => {
          if (res.ok) return cache.put(url, res);
        }).catch(err => console.warn(`[YONI-SW] Failed to cache ${url}:`, err));
      }));
    })
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

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Network-First Strategy for Navigation to prevent ERR_FAILED
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request, { ignoreSearch: true })
            .then(cached => cached || caches.match("/index.html"));
        })
    );
    return;
  }

  // Stale-While-Revalidate for Assets
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok && (url.origin === self.location.origin || isCacheableExternal(url))) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(err => {
        if (request.destination === "image") {
          // Return a generic fallback image if everything fails
          return caches.match("https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=70");
        }
        throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
