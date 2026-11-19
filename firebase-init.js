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
      notice.style.display = offline ? "block" : "none";
      notice.textContent = offline
        ? "Connexion Internet indisponible. Certaines fonctions nécessitant Firebase ne sont pas accessibles. Ne fermez pas la page pendant une opération en cours."
        : "";
    };
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    refresh();
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
    // Production reste l'environnement par défaut. Le staging doit être demandé
    // explicitement avec ?wat-env=staging afin d'éviter toute bascule accidentelle.
    const requestedEnvironment = new URLSearchParams(window.location.search).get("wat-env");
    const environment = requestedEnvironment === "staging" ? "staging" : "production";
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
    const app = window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(firebaseConfig);
    window.WATFirebase = {
      ready: true,
      app: app,
      auth: window.firebase.auth(),
      db: window.firebase.firestore(),
      projectId: firebaseConfig.projectId,
      environment: environment
    };
  } catch (error) {
    console.error("Initialisation Firebase impossible :", error);
    window.WATFirebase = { ready: false, reason: "initialization-error" };
  }
})();
