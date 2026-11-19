/*
 * Nour Al-Hidaya — Service Worker
 * Cache uniquement l'interface publique de l'application.
 * Les futures requêtes d'authentification, de synchronisation et de données
 * personnelles ne doivent jamais être mises en cache par ce Service Worker.
 */
const CACHE_NAME = "nour-al-hidaya-shell-v6";
const APP_FILES = [
  "./",
  "./index.html",
  "./firebase-init.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name.startsWith("nour-al-hidaya-") && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // Ne jamais intercepter les écritures (POST, PUT, DELETE, etc.).
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  // Les services externes (Firebase, authentification, API, etc.)
  // restent entièrement hors du cache de l'application.
  if (url.origin !== scope.origin) return;

  // Seuls les fichiers statiques explicitement listés sont mis en cache.
  const appUrls = new Set(APP_FILES.map(file => new URL(file, scope).href));
  const isAppNavigation = request.mode === "navigate";

  if (isAppNavigation) {
    event.respondWith(
      fetch(request)
        .then(response => response)
        .catch(() => caches.match(new URL("./index.html", scope).href))
    );
    return;
  }

  if (!appUrls.has(url.href)) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
