// Kill-switch service worker.
//
// A prior experiment at phoenix/priv/static/sw.js registered a PWA worker
// whose fetch handler responded with `undefined` on cache miss, stranding
// every browser that had ever loaded the retired smoke-test UI at
// http://localhost:8910/. Vite HMR and ESM module loading both collapse
// when a SW surfaces "unexpected error" for arbitrary GETs.
//
// This file evicts that worker and any successor registered against the
// same scope. It is safe to leave in place forever — on clean browsers it
// is a no-op, on dirty browsers it unregisters itself on activation.
//
// Install  → skipWaiting so we replace the running worker immediately
// Activate → claim clients, nuke every cache, unregister self, reload
// Fetch    → deliberately NOT handled so requests go straight to network
//
// See openspec/changes/kill-stale-pwa-service-worker/ for full context.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      await self.registration.unregister();

      const windowClients = await self.clients.matchAll({ type: 'window' });
      for (const client of windowClients) {
        client.navigate(client.url);
      }
    })()
  );
});
