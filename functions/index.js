"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

if (!getApps().length) initializeApp();
const auth = getAuth();
const db = getFirestore();

const ALLOWED_ROLES = new Set([
  "president",
  "administrateur_systeme",
  "responsable_administratif",
  "responsable_financier",
  "responsable_programme",
  "coordonnateur",
  "formateur",
  "agent",
  "commissaire_aux_comptes",
  "bureau"
]);

const ALLOWED_SCOPES = new Set([
  "activities.manage", "activities.read",
  "attendance.manage", "attendance.read",
  "finance.accounts.manage", "finance.budgets.manage",
  "finance.manage", "finance.periods.manage", "finance.read", "finance.validate",
  "members.manage", "members.read",
  "programs.manage", "programs.read",
  "projects.manage", "projects.read",
  "volunteers.manage", "volunteers.read"
]);

function requireWatAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Connexion requise.");
  }
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError("permission-denied", "Une adresse e-mail vérifiée est requise.");
  }
  if (request.auth.token.watAdmin !== true) {
    throw new HttpsError("permission-denied", "Action réservée à l'administration centrale.");
  }
  return request.auth.uid;
}

function validateStaffInput(data) {
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
  const role = data.role;
  const scopes = data.scopes;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Adresse e-mail invalide.");
  }
  if (displayName.length < 2 || displayName.length > 120) {
    throw new HttpsError("invalid-argument", "Le nom doit contenir entre 2 et 120 caractères.");
  }
  if (!ALLOWED_ROLES.has(role)) {
    throw new HttpsError("invalid-argument", "Rôle non autorisé.");
  }
  if (!Array.isArray(scopes) || scopes.length > ALLOWED_SCOPES.size ||
      scopes.some(scope => typeof scope !== "string" || !ALLOWED_SCOPES.has(scope)) ||
      new Set(scopes).size !== scopes.length) {
    throw new HttpsError("invalid-argument", "La liste des permissions est invalide.");
  }
  return { email, displayName, role, scopes };
}

exports.createStaffAccount = onCall({ region: "us-central1", enforceAppCheck: true }, async request => {
  const actorUid = requireWatAdmin(request);
  const { email, displayName, role, scopes } = validateStaffInput(request.data || {});

  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      displayName,
      emailVerified: false,
      disabled: false
    });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Cette adresse possède déjà un compte Firebase.");
    }
    throw new HttpsError("internal", "Impossible de créer le compte d'accès.");
  }

  try {
    await db.collection("staffAccess").doc(userRecord.uid).create({
      email,
      displayName,
      role,
      scopes,
      active: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actorUid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorUid
    });

    const [verificationLink, passwordSetupLink] = await Promise.all([
      auth.generateEmailVerificationLink(email),
      auth.generatePasswordResetLink(email)
    ]);

    return {
      uid: userRecord.uid,
      email,
      active: false,
      verificationLink,
      passwordSetupLink,
      message: "Compte créé et désactivé. Faites vérifier l'adresse et définir le mot de passe, puis activez l'accès."
    };
  } catch (error) {
    await Promise.allSettled([
      db.collection("staffAccess").doc(userRecord.uid).delete(),
      auth.deleteUser(userRecord.uid)
    ]);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Le provisionnement a échoué ; le compte partiel a été annulé.");
  }
});

exports.listStaffAccounts = onCall({ region: "us-central1", enforceAppCheck: true }, async request => {
  requireWatAdmin(request);
  const snapshot = await db.collection("staffAccess").limit(500).get();
  const accounts = await Promise.all(snapshot.docs.map(async doc => {
    const data = doc.data();
    const user = await auth.getUser(doc.id).catch(() => null);
    return {
      uid: doc.id,
      email: typeof data.email === "string" ? data.email : (user?.email || ""),
      displayName: typeof data.displayName === "string" ? data.displayName : (user?.displayName || ""),
      role: typeof data.role === "string" ? data.role : "",
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
      active: data.active === true,
      emailVerified: user?.emailVerified === true,
      authDisabled: user?.disabled !== false
    };
  }));
  accounts.sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
  return { accounts, truncated: snapshot.size === 500 };
});

exports.setStaffAccountStatus = onCall({ region: "us-central1", enforceAppCheck: true }, async request => {
  const actorUid = requireWatAdmin(request);
  const uid = typeof request.data?.uid === "string" ? request.data.uid.trim() : "";
  const active = request.data?.active;
  if (!uid || typeof active !== "boolean" || uid === actorUid && active === false) {
    throw new HttpsError("invalid-argument", "Identifiant ou statut invalide.");
  }

  const user = await auth.getUser(uid).catch(() => null);
  if (!user) throw new HttpsError("not-found", "Compte introuvable.");
  if (active && user.emailVerified !== true) {
    throw new HttpsError("failed-precondition", "L'adresse e-mail doit être vérifiée avant activation.");
  }

  const ref = db.collection("staffAccess").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Aucun accès d'équipe n'est associé à ce compte.");

  // Fermer d'abord l'accès Firestore : une suspension prend effet immédiatement,
  // même si le compte possède encore un jeton Firebase Authentication valide.
  // En cas d'échec Auth, restaurer l'état Firestore précédent.
  const previousActive = snap.data().active === true;
  const previousDisabled = user.disabled === true;
  await ref.update({
    active,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actorUid
  });
  try {
    await auth.updateUser(uid, { disabled: !active });
  } catch (error) {
    await ref.update({
      active: previousActive,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorUid
    }).catch(() => {
      console.error("Échec de restauration du statut Firestore pour", uid);
    });
    throw new HttpsError("internal", "Le changement de statut n'a pas pu être appliqué. Vérifiez l'état du compte avant de réessayer.");
  }
  return { uid, active };
});
