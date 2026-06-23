/* XôPedras — service worker (escopo: ./xopedras) */
const CACHE = "xopedras-cache-v1";
const ASSETS = [
  "./xopedras.html",
  "./xopedras.css",
  "./xopedras.js",
  "./xopedras.webmanifest",
  "./xopedras-icon-192.png",
  "./xopedras-icon-512.png",
  "./xopedras-icon-maskable-512.png",
  "./xopedras-apple-touch.png",
  "./xopedras-favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate para arquivos do próprio site (GET).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      if (cached) return cached;
      const fresh = await network;
      if (fresh) return fresh;
      // fallback para navegações offline sem cache
      if (req.mode === "navigate") return cache.match("./xopedras.html");
      return new Response("", { status: 504, statusText: "offline" });
    })
  );
});

// Abrir/focar o app ao tocar na notificação.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
