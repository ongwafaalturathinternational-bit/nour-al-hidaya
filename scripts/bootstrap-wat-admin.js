"use strict";

// Exécuter une seule fois depuis un environnement de confiance avec
// Application Default Credentials (aucune clé de service dans le dépôt).
// Usage: GOOGLE_CLOUD_PROJECT=wat-connect-staging node scripts/bootstrap-wat-admin.js <UID>
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const uid = process.argv[2];
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const expectedEmail = "ongwafaalturathinternational@gmail.com";

if (!uid || !projectId) {
  console.error("Usage: GOOGLE_CLOUD_PROJECT=<projet-staging> node scripts/bootstrap-wat-admin.js <UID>");
  process.exit(1);
}
if (projectId !== "wat-connect-staging") {
  console.error("Refus : cette procédure initiale est limitée au projet wat-connect-staging.");
  process.exit(1);
}

async function main() {
  initializeApp({ credential: applicationDefault(), projectId });
  const auth = getAuth();
  const user = await auth.getUser(uid);
  if ((user.email || "").toLowerCase() !== expectedEmail) {
    throw new Error("L'UID fourni ne correspond pas à l'adresse administrateur autorisée.");
  }
  if (user.emailVerified !== true) {
    throw new Error("L'adresse administrateur doit d'abord être vérifiée dans Firebase Authentication.");
  }
  await auth.setCustomUserClaims(uid, { ...(user.customClaims || {}), watAdmin: true });
  console.log("Droit watAdmin attribué au compte administrateur de staging.");
  console.log("Déconnecter/reconnecter le compte pour actualiser son jeton d'authentification.");
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
