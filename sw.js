const CACHE_NAME = "yan-practice-v0.1.1";
const APP_SHELL = [
  "./", "./index.html", "./styles.css", "./characters.js", "./db.js", "./app.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png"
];
const REMOTE_ASSETS = ["https://upload.wikimedia.org/wikipedia/commons/6/64/Yan_Qinli_Stele.jpg"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    for (const url of REMOTE_ASSETS) {
      try {
        const response = await fetch(url, { mode: "no-cors", cache: "reload" });
        await cache.put(url, response);
      } catch (_) { /* App can install even if remote image is temporarily unavailable. */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (REMOTE_ASSETS.includes(url.href)) {
    event.respondWith((async () => {
      const cached = await caches.match(event.request) || await caches.match(url.href);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
        return response;
      } catch (_) { return new Response("", { status: 504 }); }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (url.origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME); await cache.put(event.request, response.clone());
      }
      return response;
    } catch (_) {
      if (event.request.mode === "navigate") return caches.match("./index.html");
      return new Response("Offline", { status: 503 });
    }
  })());
});
