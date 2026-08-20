// Yoni Burger Emergency Kill Switch - v65
// This Service Worker will unregister itself and clear all caches to fix ERR_FAILED

self.addEventListener("install", event => {
  console.log("[YONI-KILL] Emergency unregistering...");
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then(clients => {
        clients.forEach(client => {
          if (client.url && "navigate" in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});

// Pass through all requests to the network directly
self.addEventListener("fetch", event => {
  return; // Default browser behavior
});
