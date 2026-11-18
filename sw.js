/*
 * WAT Connect — cache de l'interface installable.
 * Seules les pages et ressources statiques publiques sont précachées.
 * Aucune donnée privée, réponse Firestore ou requête d'authentification
 * n'est mise en cache par ce service worker.
 */
const CACHE_NAME = "wat-connect-shell-v1";
const APP_FILES = [
  "./",
  "./index.html",
  "./nour-al-hidaya.html",
  "./administration.html",
  "./programmes.html",
  "./activites.html",
  "./projets.html",
  "./club-khuddam.html",
  "./club-khuddam-inscription.html",
  "./firebase-init.js",
  "./manifest.json",
  "./manifest-nour.json",
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
          .filter(name => (name.startsWith("wat-connect-") || name.startsWith("nour-al-hidaya-shell-")) && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin) return;

  const appUrls = new Set(APP_FILES.map(file => new URL(file, scope).href));
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok && appUrls.has(url.href)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(new URL("./index.html", scope).href))
    );
    return;
  }

  if (!appUrls.has(url.href)) return;
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
