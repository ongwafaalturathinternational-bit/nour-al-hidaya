/*
 * WAT Connect — cache de l'interface installable.
 * Seules les pages et ressources statiques publiques sont précachées.
 * Aucune donnée privée, réponse Firestore ou requête d'authentification
 * n'est mise en cache par ce service worker.
 *
 * Règles de sûreté appliquées :
 * - toutes les lectures sont confinées au cache applicatif CACHE_NAME ;
 *   un cache tiers de la même origine n'est jamais consulté ni modifié ;
 * - toute requête portant un en-tête Authorization ou Range est exclue du
 *   service worker avant toute lecture et toute écriture, SDK externes inclus ;
 * - aucune réponse 206, non-ok, `private`, `no-store`, `no-cache`,
 *   `Vary: *` / `Vary: Authorization`, ni obtenue avec un en-tête
 *   Authorization n'est écrite en cache ;
 * - les réponses déjà présentes en cache sont revalidées avant d'être servies :
 *   une ancienne réponse privée, non stockable, partielle (206) ou issue d'une
 *   redirection suivie non autorisée n'est jamais restituée ;
 * - une redirection suivie n'est jamais stockée au runtime ; seule la racine
 *   vers index.html du même périmètre est admise au précache et normalisée ;
 * - l'installation initiale récupère et valide toutes les réponses avant
 *   écriture ; une réponse private/no-store/no-cache fait échouer l'installation
 *   sans laisser d'entrée partielle (rollback des écritures déjà effectuées) ;
 * - tout échec de `Cache.put` (quota, stockage indisponible, réponse non
 *   clonable) est absorbé : la réponse réseau déjà obtenue reste valide ;
 * - hors connexion sans ressource en cache, une réponse 503 explicite est
 *   renvoyée à la place d'une redirection arbitraire ; cette page est
 *   trilingue (français, anglais, arabe) et ne dépend d'aucune ressource réseau.
 *
 * MIGRATION v6 -> v7 (lot 002) :
 * La version v7 remplace v6 car les règles de stockage ont changé (filtrage
 * private/no-store/no-cache dès l'installation, revalidation des entrées
 * servies, exclusion Authorization/Range, refus des redirections suivies).
 * Le cache v6 est propriétaire (OWNED_CACHE_NAME) : `activate` le supprime,
 * puis le nouveau worker précache l'interface dans v7. Aucune donnée métier
 * n'est migrée, le cache ne contenant que des ressources statiques publiques.
 *
 * Dépendances à synchroniser AVANT tout changement de version :
 * - tests/service-worker-regression.test.mjs : lit CACHE_NAME depuis sw.js et
 *   contient les scénarios de migration (v6 -> version courante) ;
 * - tests/service-worker-cache.test.mjs : lit CACHE_NAME depuis sw.js ;
 * - scripts de build / modèles de déploiement : contrôler les références au
 *   cache v6 dans le dépôt complet avant intégration et recette.
 */
const CACHE_NAME = "wat-connect-shell-v7";
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

// Caches hérités dont ce service worker est propriétaire. Le motif est strict :
// un cache tiers dont le nom commence seulement par le même préfixe est préservé.
const OWNED_CACHE_NAME = /^(?:wat-connect-shell|nour-al-hidaya-shell)-v\d+(?:-embedded)?$/;

const OFFLINE_HTML = [
  "<!doctype html>",
  '<html lang="fr">',
  "<head>",
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="color-scheme" content="light dark">',
  "<title>WAT Connect — hors connexion / offline / غير متصل</title>",
  "<style>",
  ":root { color-scheme: light dark; }",
  "body { font-family: system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif;",
  "  margin: 0; padding: 2rem; line-height: 1.5; }",
  "main { max-width: 42rem; margin: 0 auto; }",
  "section { margin-bottom: 2rem; }",
  "section[lang=\"ar\"] { text-align: right; }",
  "h1 { font-size: 1.5rem; }",
  "</style>",
  "</head>",
  "<body>",
  "<main>",
  '<section lang="fr">',
  "<h1>WAT Connect est momentanément hors connexion</h1>",
  "<p>Cette page n'est pas encore disponible dans le cache local de l'appareil.</p>",
  "<p>Rétablissez la connexion, puis rechargez la page pour reprendre le service.</p>",
  "</section>",
  '<section lang="en">',
  "<h1>WAT Connect is temporarily offline</h1>",
  "<p>This page is not yet available in the device's local cache.</p>",
  "<p>Restore your connection, then reload the page to resume service.</p>",
  "</section>",
  '<section lang="ar" dir="rtl">',
  "<h1>WAT Connect غير متصل مؤقتًا</h1>",
  "<p>هذه الصفحة غير متوفرة بعد في ذاكرة التخزين المؤقت المحلية للجهاز.</p>",
  "<p>أعد الاتصال بالشبكة، ثم أعد تحميل الصفحة لمتابعة الخدمة.</p>",
  "</section>",
  "</main>",
  "</body>",
  "</html>"
].join("\n");

function openAppCache() {
  return caches.open(CACHE_NAME);
}

function readHeader(source, name) {
  const headers = source && source.headers;
  if (!headers || typeof headers.get !== "function") return null;
  try {
    return headers.get(name);
  } catch (error) {
    return null;
  }
}

function isAuthorizedRequest(request) {
  // `!== null` : un en-tête présent mais vide reste une requête authentifiée.
  return readHeader(request, "authorization") !== null;
}

function isRangeRequest(request) {
  return readHeader(request, "range") !== null;
}

function hasDirective(value, directive) {
  if (!value) return false;
  return value.split(",").some(part => {
    const token = part.trim().toLowerCase().split("=")[0].trim();
    return token === directive;
  });
}

const NON_STORABLE_DIRECTIVES = ["no-store", "private", "no-cache"];
const NON_STORABLE_VARY = ["*", "authorization"];

function hasNonStorableHeaders(response) {
  const cacheControl = readHeader(response, "cache-control");
  if (NON_STORABLE_DIRECTIVES.some(directive => hasDirective(cacheControl, directive))) {
    return true;
  }
  const vary = readHeader(response, "vary");
  if (vary) {
    const tokens = vary.split(",").map(token => token.trim().toLowerCase());
    if (tokens.some(token => NON_STORABLE_VARY.includes(token))) return true;
  }
  return false;
}

// Les réponses opaques sont tolérées exclusivement pour les SDK autorisés.
function isExternalSdk(request) {
  const url = typeof request === "string" ? request : request && request.url;
  return EXTERNAL_ASSETS.includes(url);
}

// Seule la redirection exacte de la racine vers index.html est nécessaire.
function isAllowedShellRedirect(request, response) {
  const scope = new URL(self.registration.scope);
  const source = typeof request === "string" ? request : request && request.url;
  return response.redirected === true && response.status === 200 &&
    source === new URL("./", scope).href &&
    response.url === new URL("./index.html", scope).href;
}

// Une navigation avec redirect=manual ne doit pas recevoir une réponse dont
// la liste d'URL contient une redirection suivie. Conserver le corps et les
// en-têtes validés dans une réponse sans historique de redirection.
function normalizeShellRedirect(response) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// Une réponse n'est écrite que si elle est réellement réutilisable hors ligne.
function isStorableResponse(request, response) {
  if (!response) return false;
  // Requête authentifiée ou partielle : jamais stockable, même par défense.
  if (isAuthorizedRequest(request) || isRangeRequest(request)) return false;
  // Une redirection suivie ne doit pas être enregistrée sous l'URL d'origine.
  if (response.redirected === true) return false;
  // Redirection opaque ou erreur réseau : jamais stockables.
  if (response.type === "opaqueredirect" || response.type === "error") return false;
  // Réponse opaque : statut et en-têtes inaccessibles, cas assumé du mode no-cors.
  if (response.type === "opaque") return isExternalSdk(request);
  // 206 : refusée par la spécification CacheStorage, donc jamais proposée.
  if (response.status === 206) return false;
  // 3xx, 401, 403, 404, 5xx : transmises à la page mais jamais stockées.
  if (!response.ok) return false;
  return !hasNonStorableHeaders(response);
}

// Précache applicatif : toutes les pages sont obligatoires, donc une réponse
// non exploitable fait échouer l'installation plutôt que d'être stockée.
// Seule la redirection exacte de "./" vers "./index.html" est admise.
function isPrecacheableAppResponse(request, response) {
  if (!response) return false;
  if (isAuthorizedRequest(request) || isRangeRequest(request)) return false;
  if (response.type === "opaque" || response.type === "opaqueredirect" || response.type === "error") return false;
  if (response.status !== 200) return false;
  if (hasNonStorableHeaders(response)) return false;
  if (response.redirected === true && !isAllowedShellRedirect(request, response)) return false;
  return true;
}

// Une entrée déjà présente en cache est revalidée avant d'être servie : les
// anciennes copies privées, non stockables, partielles ou redirigées sont
// ignorées et purgées au mieux.
function isServableCachedResponse(request, response) {
  if (!response) return false;
  if (isAuthorizedRequest(request) || isRangeRequest(request)) return false;
  if (response.redirected === true && !isAllowedShellRedirect(request, response)) return false;
  if (response.type === "opaqueredirect" || response.type === "error") return false;
  if (response.type === "opaque") return isExternalSdk(request);
  if (response.status === 206) return false;
  // `ok === false` explicite : les doubles de test minimaux sans `ok` restent
  // acceptés, mais une vraie réponse non-ok n'est jamais servie depuis le cache.
  if (response.ok === false) return false;
  return !hasNonStorableHeaders(response);
}

// Lecture strictement confinée au cache WAT Connect. Toute indisponibilité du
// stockage est traduite en absence de copie locale, jamais en erreur propagée.
async function matchAppCache(request) {
  try {
    const cache = await openAppCache();
    const cached = await cache.match(request);
    if (!cached) return undefined;
    if (!isServableCachedResponse(request, cached)) {
      try {
        if (typeof cache.delete === "function") await cache.delete(request);
      } catch (error) {
        // Purge impossible : l'entrée reste simplement non servie.
      }
      return undefined;
    }
    return cached.redirected === true ? normalizeShellRedirect(cached) : cached;
  } catch (error) {
    return undefined;
  }
}

// Écriture défensive : ne rejette jamais, ne consomme jamais la réponse rendue
// à la page et n'interrompt pas la navigation en cas de quota insuffisant.
function writeToCache(request, response, event) {
  if (!isStorableResponse(request, response)) return;
  const write = (async () => {
    try {
      const cache = await openAppCache();
      const copy = response.clone();
      await cache.put(request, copy);
    } catch (error) {
      // Quota dépassé, stockage indisponible, réponse non clonable : abandon
      // silencieux de l'écriture, la réponse réseau reste servie.
    }
  })();
  if (event && typeof event.waitUntil === "function") {
    try {
      event.waitUntil(write);
    } catch (error) {
      // Événement déjà finalisé : l'écriture reste lancée, la réponse est intacte.
    }
  }
  return write;
}

function offlinePage() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    statusText: "Service Unavailable",
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function handleExternalAsset(request, event) {
  const cached = await matchAppCache(request);
  if (cached) return cached;
  const response = await fetch(request);
  writeToCache(request, response, event);
  return response;
}

async function handleNavigation(request, event, scope) {
  let response;
  try {
    response = await fetch(request);
  } catch (error) {
    const cached = await matchAppCache(request);
    if (cached) return cached;
    const fallback = await matchAppCache(new URL("./index.html", scope).href);
    if (fallback) return fallback;
    // Aucune ressource locale : réponse explicite et exploitable, sans redirection.
    return offlinePage();
  }
  if (response.status >= 500) {
    const cached = await matchAppCache(request);
    return cached || response;
  }
  writeToCache(request, response, event);
  return response;
}

async function handleStaticAsset(request, event) {
  const cached = await matchAppCache(request);
  if (cached) return cached;
  const response = await fetch(request);
  writeToCache(request, response, event);
  return response;
}

// Précache applicatif en deux phases : récupération et validation intégrales,
// puis écriture avec annulation au mieux. Un échec de validation ou d'écriture annule au mieux
// les entrées déjà écrites et rejette l'installation dans tous les cas, afin de
// ne jamais activer une interface incomplète.
async function precacheAppShell(cache) {
  const scope = new URL(self.registration.scope);
  const entries = [];
  for (const file of APP_FILES) {
    const url = new URL(file, scope).href;
    const response = await fetch(url);
    if (!isPrecacheableAppResponse(url, response)) {
      throw new Error(`Précache refusé pour ${file}`);
    }
    entries.push([url, response.redirected === true ? normalizeShellRedirect(response) : response]);
  }

  const written = [];
  try {
    for (const [url, response] of entries) {
      await cache.put(url, response);
      written.push(url);
    }
  } catch (error) {
    if (typeof cache.delete === "function") {
      await Promise.allSettled(written.map(url => cache.delete(url)));
    }
    throw error;
  }
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await precacheAppShell(cache);
        await Promise.allSettled(EXTERNAL_ASSETS.map(async asset => {
          try {
            const response = await fetch(asset, { mode: "no-cors" });
            if (isStorableResponse(asset, response)) {
              await cache.put(asset, response);
            }
          } catch (error) {
            // SDK indisponible ou quota atteint : l'installation applicative continue.
          }
        }));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        const stale = names.filter(name => name !== CACHE_NAME && OWNED_CACHE_NAME.test(name));
        // Une suppression en échec ne doit pas annuler le nettoyage des autres
        // caches, ni empêcher la reprise des clients par le nouveau worker.
        await Promise.allSettled(stale.map(name => caches.delete(name)));
      } catch (error) {
        // Énumération des caches impossible : aucun cache tiers n'est touché.
      }
      try {
        await self.clients.claim();
      } catch (error) {
        // La reprise des clients sera retentée par le navigateur.
      }
    })()
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  // Exclusion totale, avant toute lecture ou écriture : une requête
  // authentifiée ou partielle ne doit jamais transiter par le cache, y compris
  // lorsqu'elle cible un SDK externe explicitement autorisé.
  if (isAuthorizedRequest(request) || isRangeRequest(request)) return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (EXTERNAL_ASSETS.includes(url.href)) {
    event.respondWith(handleExternalAsset(request, event));
    return;
  }
  if (url.origin !== scope.origin) return;

  const appUrls = new Set(APP_FILES.map(file => new URL(file, scope).href));
  // Ne pas transformer une navigation vers une URL non gérée en page d'accueil :
  // seules les pages explicitement autorisées bénéficient du fallback hors ligne.
  if (!appUrls.has(url.href)) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, event, scope));
    return;
  }

  event.respondWith(handleStaticAsset(request, event));
});
