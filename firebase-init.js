/* Configuration publique de l'application Firebase WAT Connect.
 * Ne jamais placer ici de clé privée ou de compte de service.
 */
(function () {
  "use strict";
  try {
    if (!window.firebase || !window.firebase.auth) {
      window.WATFirebase = { ready: false, reason: "sdk-unavailable" };
      return;
    }
    const firebaseConfig = {
      apiKey: "AIzaSyAe_jeqGoLp4wXmKZEfF2uDrAb_qnWNi8I",
      authDomain: "wat-connect.firebaseapp.com",
      projectId: "wat-connect",
      storageBucket: "wat-connect.firebasestorage.app",
      messagingSenderId: "595497756883",
      appId: "1:595497756883:web:c95c93a3365a98aa44cc26"
    };
    const app = window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(firebaseConfig);
    window.WATFirebase = {
      ready: true,
      app: app,
      auth: window.firebase.auth(),
      projectId: firebaseConfig.projectId
    };
  } catch (error) {
    console.error("Initialisation Firebase impossible :", error);
    window.WATFirebase = { ready: false, reason: "initialization-error" };
  }
})();
