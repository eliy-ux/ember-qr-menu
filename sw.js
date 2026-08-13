const CACHE_NAME = "ember-shell-v46";
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/css/style.css?v=ember-glow-46",
  "./assets/css/customer-redesign.css?v=ember-premium-46",
  "./assets/css/animations.css?v=ember-motion-46",
  "./assets/css/responsive.css?v=hero-responsive-46",
  "./assets/js/app.js?v=ember-final-46",
  "./assets/js/firebase.js?v=ember-auth-46",
  "./assets/js/firestore.js?v=ember-features-46",
  "./assets/js/config.js",
  "./assets/js/utils.js",
  "./manifest.webmanifest",
  "./assets/icons/ember.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => { if (event.request.mode === "navigate" && !event.request.url.includes("admin.html")) return caches.match("./index.html"); return null; })));
});
