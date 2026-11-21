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
    // Les aperçus de branche et le Worker dédié utilisent Firebase staging.
    // Les domaines normaux et les APK ordinaires restent en production.
    // Seul le build Android de test peut injecter WAT_FIREBASE_ENV=staging ;
    // aucun paramètre d'URL ne peut changer l'environnement.
    const hostname = window.location.hostname;
    const isStagingHost = hostname === "wat-connect-staging.ongwafaalturathinternational.workers.dev"
      || hostname.endsWith("-nour-al-hidaya.ongwafaalturathinternational.workers.dev");
    const requestedEnvironment = window.WAT_FIREBASE_ENV;
    const environment = isStagingHost || requestedEnvironment === "staging" ? "staging" : "production";
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
    // Si un autre script a déjà initialisé Firebase sur un projet différent,
    // on bloque plutôt que de connecter silencieusement le mauvais environnement.
    if (existingApp && existingApp.options.projectId !== firebaseConfig.projectId) {
      throw new Error("Firebase est déjà initialisé sur un autre projet.");
    }
    const app = existingApp || window.firebase.initializeApp(firebaseConfig);
    // App Check est initialisé avant Auth/Firestore lorsqu'une page le requiert.
    // La clé Enterprise de l'écran d'administration n'est valable que sur le projet staging.
    let appCheckReady = false;
    const appCheckMeta = typeof document.querySelector === "function"
      ? document.querySelector('meta[name="wat-recaptcha-site-key"]')
      : null;
    const appCheckSiteKey = appCheckMeta ? appCheckMeta.content.trim() : "";
    if (appCheckSiteKey) {
      if (environment !== "staging" || firebaseConfig.projectId !== "wat-connect-staging") {
        throw new Error("App Check reCAPTCHA Enterprise est réservé à WAT Connect staging.");
      }
      if (!window.firebase.appCheck || !window.firebase.appCheck.ReCaptchaEnterpriseProvider) {
        throw new Error("Le fournisseur Firebase App Check reCAPTCHA Enterprise n'est pas disponible.");
      }
      const appCheck = window.firebase.appCheck();
      appCheck.activate(new window.firebase.appCheck.ReCaptchaEnterpriseProvider(appCheckSiteKey), true);
      appCheckReady = true;
    }
    window.WATFirebase = {
      ready: true,
      app: app,
      auth: window.firebase.auth(),
      db: window.firebase.firestore(),
      projectId: firebaseConfig.projectId,
      environment: environment,
      appCheckReady: appCheckReady
    };
  } catch (error) {
    console.error("Initialisation Firebase impossible :", error);
    window.WATFirebase = { ready: false, reason: "initialization-error" };
  }
})();
