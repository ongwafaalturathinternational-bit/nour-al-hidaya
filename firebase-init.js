/* Configuration publique de l'application Firebase WAT Connect.
 * Ne jamais placer ici de clé privée ou de compte de service.
 */
(function () {
  "use strict";

  function installNetworkNotice() {
    if (!document.body || document.getElementById("wat-network-notice")) return;
    const notice = document.createElement("div");
    notice.id = "wat-network-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.style.cssText = "display:none;padding:9px 14px;background:#fff3cd;color:#664d03;border-bottom:1px solid #ead28a;font:14px/1.4 system-ui,sans-serif;text-align:center";
    document.body.prepend(notice);
    const refresh = () => {
      const offline = !navigator.onLine;
      const persistenceUnavailable = window.WATFirebase?.persistenceStatus === "unavailable";
      notice.style.display = offline || persistenceUnavailable ? "block" : "none";
      const persistenceEnabled = window.WATFirebase?.persistenceEnabled === true;
      notice.textContent = offline
        ? (persistenceEnabled
          ? "Mode hors connexion : les données déjà consultées restent disponibles. Les modifications sont mises en attente et seront synchronisées au retour du réseau. La première connexion nécessite Internet."
          : "Connexion Internet indisponible. Le cache hors connexion n'est pas disponible sur ce navigateur. Aucune modification ne sera synchronisée sans réseau.")
        : (window.WATFirebase?.persistenceStatus === "unavailable"
          ? "Mode hors connexion indisponible sur cet appareil. Les fonctions en ligne restent accessibles."
          : "");
    };
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    refresh();
    window.WATRefreshNetworkNotice = refresh;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installNetworkNotice, { once: true });
  } else {
    installNetworkNotice();
  }
  try {
    if (!window.firebase || !window.firebase.auth) {
      window.WATFirebase = { ready: false, reason: "sdk-unavailable" };
      return;
    }
    // Le staging n'est sélectionné que sur son domaine dédié.
    // Toute autre origine, y compris l'application Android, reste en production.
    const isStagingHost = window.location.hostname === "wat-connect-staging.ongwafaalturathinternational.workers.dev";
    const environment = isStagingHost ? "staging" : "production";
    const configs = {
      production: {
        apiKey: "AIzaSyAe_jeqGoLp4wXmKZEfF2uDrAb_qnWNi8I",
        authDomain: "wat-connect.firebaseapp.com",
        projectId: "wat-connect",
        storageBucket: "wat-connect.firebasestorage.app",
        messagingSenderId: "595497756883",
        appId: "1:595497756883:web:c95c93a3365a98aa44cc26"
      },
      staging: {
        apiKey: "AIzaSyB1rJ45mhUjjlgVNYo_yy6M1zCm-gc5Rgs",
        authDomain: "wat-connect-staging.firebaseapp.com",
        projectId: "wat-connect-staging",
        storageBucket: "wat-connect-staging.firebasestorage.app",
        messagingSenderId: "180737630773",
        appId: "1:180737630773:web:e5c94e044c3a6a7ce9477c"
      }
    };
    const firebaseConfig = configs[environment];
    const existingApp = window.firebase.apps.length ? window.firebase.app() : null;
    if (existingApp && existingApp.options?.projectId !== firebaseConfig.projectId) {
      throw new Error("Firebase est déjà initialisé sur un autre projet.");
    }
    const app = existingApp || window.firebase.initializeApp(firebaseConfig);
    const db = window.firebase.firestore();
    const offlinePages = new Set(["", "index.html", "administration.html", "programmes.html", "activites.html", "projets.html", "club-khuddam.html"]);
    const pageName = window.location.pathname.split("/").pop();
    let persistenceEnabled = false;
    let persistenceStatus = offlinePages.has(pageName) ? "initializing" : "disabled";
    const persistenceReady = offlinePages.has(pageName)
      ? db.enablePersistence({ synchronizeTabs: true })
          .then(() => { persistenceEnabled = true; persistenceStatus = "enabled"; return true; })
          .catch(error => {
            persistenceStatus = "unavailable";
            console.warn("Cache hors connexion indisponible :", error.code || error.message);
            return false;
          })
      : Promise.resolve(false);
    window.WATFirebase = {
      ready: true,
      app: app,
      auth: window.firebase.auth(),
      db: db,
      projectId: firebaseConfig.projectId,
      environment: environment,
      persistenceReady: persistenceReady,
      get persistenceEnabled() { return persistenceEnabled; },
      get persistenceStatus() { return persistenceStatus; },
      async signOutSafely() {
        if (persistenceEnabled) {
          if (!navigator.onLine) throw new Error("Reconnectez-vous pour synchroniser les modifications en attente et effacer les données locales avant la déconnexion.");
          await db.waitForPendingWrites();
          await db.terminate();
          await db.clearPersistence();
        }
        await window.firebase.auth().signOut();
        window.location.assign("index.html");
      }
    };
    persistenceReady.then(() => window.WATRefreshNetworkNotice?.());
  } catch (error) {
    console.error("Initialisation Firebase impossible :", error);
    window.WATFirebase = { ready: false, reason: "initialization-error" };
  }
})();
