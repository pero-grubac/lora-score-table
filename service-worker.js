const CACHE_NAME = "lora-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./fonts/playfair-display-v40-latin-600.woff2",
  "./fonts/playfair-display-v40-latin-700.woff2",
  "./fonts/source-sans-3-v19-latin-300.woff2",
  "./fonts/source-sans-3-v19-latin-regular.woff2",
  "./fonts/source-sans-3-v19-latin-600.woff2",
  "./fonts/source-sans-3-v19-latin-700.woff2",
];

// Install — cache all files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)),
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch — cache first, fall back to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        })
      );
    }),
  );
});
