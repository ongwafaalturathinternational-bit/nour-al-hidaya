/*
 * WAT Connect — cache de l'interface installable.
 * Seules les pages et ressources statiques publiques sont précachées.
 * Aucune donnée privée, réponse Firestore ou requête d'authentification
 * n'est mise en cache par ce service worker.
 */
const CACHE_NAME = "wat-connect-shell-v6";
const APP_FILES = [
  "./",
  "./index.html",
  "./portail.html",
  "./site-institutionnel.html",
  "./nour-al-hidaya.html",
  "./administration.html",
  "./programmes.html",
  "./activites.html",
  "./projets.html",
  "./club-khuddam.html",
  "./club-khuddam-inscription.html",
  "./club-khuddam-espace.html",
  "./firebase-init.js",
  "./wat-brand.css",
  "./wat-brand-nour.css",
  "./manifest.json",
  "./manifest-nour.json",
  "./icon-192.png",
  "./icon-512.png",
  "./wat-icon-192.png",
  "./wat-icon-512.png",
  "./nour-icon-192.png",
  "./nour-icon-512.png"
];

// Seuls les SDK Firebase statiques et versionnés sont autorisés au cache externe.
// Aucune API, donnée Firestore, authentification ou réponse métier n'est mise en cache.
const EXTERNAL_ASSETS = [
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore-compat.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await cache.addAll(APP_FILES);
        await Promise.allSettled(EXTERNAL_ASSETS.map(async asset => {
          const response = await fetch(asset, { mode: "no-cors" });
          if (response && (response.ok || response.type === "opaque")) {
            await cache.put(asset, response);
          }
        }));
      })
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
  if (EXTERNAL_ASSETS.includes(url.href)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response && (response.ok || response.type === "opaque")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }))
    );
    return;
  }
  if (url.origin !== scope.origin) return;

  const appUrls = new Set(APP_FILES.map(file => new URL(file, scope).href));
  // Ne pas transformer une navigation vers une URL non gérée en page d'accueil :
  // seules les pages explicitement autorisées bénéficient du fallback hors ligne.
  if (!appUrls.has(url.href)) return;

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
