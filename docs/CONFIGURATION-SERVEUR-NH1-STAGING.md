# Préparation de la connexion NH-1 — Cloudflare staging et Firebase

**Statut : préparation du contrat de configuration uniquement.** Aucune connexion à Firebase n'est ouverte et aucune donnée n'est lue ou écrite.

## Cible strictement autorisée

- Worker cible : `wat-connect-staging`.
- Projet Firebase/Firestore attendu : `wat-connect-staging`.
- Base Firestore : `(default)`.
- L'environnement `production` et le projet Firebase `wat-connect` sont explicitement rejetés par le validateur NH-1.

Le fichier `.firebaserc` utilise `demo-wat-connect` par défaut, réserve l'alias explicite `staging` à `wat-connect-staging` et ne définit aucun alias de production. Les scripts de développement et de test ciblent le projet Emulator fictif; le script de déploiement Firebase ne fait pas partie de cette préparation.

## Contrat de configuration

Variables non secrètes du Worker staging :
- `WAT_ENV=staging`
- `FIREBASE_PROJECT_ID=wat-connect-staging`

Secrets à enregistrer uniquement dans le magasin de secrets Cloudflare du Worker staging :
- `FIREBASE_CLIENT_EMAIL` : adresse de l'identité de service dédiée ;
- `FIREBASE_PRIVATE_KEY` : clé privée PKCS#8 de cette identité ;
- `TURNSTILE_SECRET_KEY` : secret de validation anti-robot.

Ne jamais mettre une clé privée dans Git, une variable de configuration publique, le navigateur, le dépôt APK ou un message ChatGPT. Ne jamais réutiliser une identité de production dans staging.

## Privilèges Firebase attendus

Créer une identité de service dédiée au Worker NH-1, limitée au projet staging. Lui attribuer uniquement les permissions Firestore nécessaires au registre NH-1, idéalement via un rôle personnalisé minimal après validation des opérations exactes. Ne pas utiliser une clé de compte propriétaire, éditeur général ou administrateur Firebase.

La création de l'identité, l'attribution IAM et la génération de la clé restent à effectuer dans le projet Firebase/Google Cloud staging. Aucun secret n'est présent dans le dépôt.

## Contrôles déjà préparés dans le code

- Le validateur refuse tout environnement autre que `staging`.
- Il refuse tout projet Firebase autre que `wat-connect-staging`.
- Il vérifie le format de l'adresse de compte de service, de la clé PEM et la présence du secret Turnstile.
- Il normalise les retours à la ligne PEM échappés.
- Les diagnostics ne reproduisent jamais les valeurs secrètes.
- Les routes NH-1 restent fermées en `503`, même si les variables existent : le validateur n'est pas une preuve d'authentification ni une connexion Firestore.

## Travaux techniques restant avant toute activation

1. Implémenter l'obtention et le renouvellement OAuth serveur à partir de l'identité de service.
2. Implémenter l'accès Firestore REST limité aux collections NH-1.
3. Vérifier cryptographiquement les Firebase ID tokens des agents, puis revérifier leur état actif et leurs scopes côté serveur.
4. Implémenter la validation Turnstile côté serveur pour les inscriptions publiques.
5. Ajouter les limites de débit, limites de taille, idempotence, détection de doublons et journal d'audit.
6. Ajouter les tests d'intégration contre un projet staging isolé et vérifier les règles Firestore.
7. Faire une revue de sécurité avant d'autoriser les écritures.

**Aucun déploiement, aucune création IAM, aucune génération de clé, aucun changement de facturation et aucune écriture Firestore ne sont autorisés par cette préparation.**
