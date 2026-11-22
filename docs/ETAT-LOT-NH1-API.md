# NH-1 — squelette API et préparation de la connexion sécurisée

Date : 22 novembre 2026  
Branche : `feature/nour-central-management-foundation`  
Statut : préparation de code uniquement ; aucun déploiement.

## Livré

- Worker NH-1 fermé par défaut : routes non configurées en 503, méthodes non autorisées en 405.
- Contrat de configuration serveur dans `workers/learning-api/src/config.js`.
- Cible staging explicitement verrouillée sur `wat-connect-staging`; le projet production `wat-connect` est rejeté.
- Vérification de présence/format des variables de configuration, de l'identité de service, de la clé PEM et du secret Turnstile.
- Normalisation des retours à la ligne PEM ; diagnostics sans divulgation des valeurs secrètes.
- Guide `docs/CONFIGURATION-SERVEUR-NH1-STAGING.md` pour la future configuration Cloudflare/Firebase.
- Primitives cryptographiques isolées : assertion JWT de compte de service pour OAuth Google et vérification RS256 des Firebase ID tokens (audience, issuer, UID, expiration, émission et `auth_time`).
- Cache JWKS Google piloté par `Cache-Control`, avec actualisation si un `kid` inconnu apparaît et contrôle renforcé des claims Firebase.
- Adaptateur REST Firestore limité au projet staging, à la base `(default)` et à une liste explicite de collections WAT/Nour.
- Lectures, créations sans écrasement et mises à jour avec précondition d'existence et masque de champs ; validation stricte des chemins et des valeurs.
- Réutilisation temporaire du jeton OAuth en mémoire, sans journalisation du jeton.
- Autorisation d'équipe côté serveur : vérification du Firebase ID token, e-mail vérifié, lecture du document `staffAccess/{uid}`, état actif et scope exact.
- Validation Turnstile côté serveur : Siteverify obligatoire, token à usage unique, action et hostname exacts, fenêtre de validité de cinq minutes, refus en cas d'indisponibilité.
- Tests dédiés OAuth, jetons Firebase, Firestore, droits d'équipe et Turnstile ; clés RSA temporaires générées uniquement en mémoire.
- Commande `npm run test:learning-api` étendue à toute la suite NH-1.

## Tests

Suite locale précédemment exécutée : 15 tests réussis, 0 échec (Worker et configuration).

Suites ajoutées :
- `learning-api-google-auth.test.js` : signature OAuth, réponses mal formées, signature Firebase, verrouillage projet et expiration.
- `learning-api-firestore.test.js` : collection autorisée, encodage Firestore, précondition de mise à jour, conflits et cache OAuth.
- `learning-api-staff-auth.test.js` : authentification, e-mail vérifié, état actif et scopes.
- `learning-api-turnstile.test.js` : validation Siteverify, action, hostname, fraîcheur, réseau et IP d'origine.

La suite complète est exécutée automatiquement par GitHub Actions sur Node.js 22. Le premier passage a détecté une attente de test devenue obsolète après l'ajout du support timestamp Firestore ; elle a été corrigée. Le passage suivant a validé **34 tests sur 34**. Les nouveaux tests Turnstile sont en cours de validation sur le commit le plus récent.

## Limites importantes

Le validateur, les primitives OAuth/ID-token, l'adaptateur Firestore et le contrôle des scopes sont des modules isolés : ils ne sont pas encore raccordés au chemin d'exécution du Worker. Aucun appel réel à Google ou Firestore n'a été effectué. La validation Turnstile est codée en module isolé, mais n'est pas encore raccordée au Worker. Aucune limitation de débit, idempotence transactionnelle, journalisation métier ou inscription n'est implémentée.

Les routes restent donc toutes désactivées. Même si des variables sont présentes, le service ne doit pas accepter d'inscription.

## Conditions avant activation

1. Créer une identité de service dédiée au seul projet staging et valider ses privilèges minimaux.
2. Enregistrer les secrets dans le magasin Cloudflare du Worker staging, jamais dans Git ou dans l'APK.
3. Valider définitivement le modèle de collections/champs NH-1 et les scopes pédagogiques avec les règles Firestore existantes.
4. Raccorder les modules OAuth, ID-token, staffAccess et Firestore au Worker, sans ouvrir les routes avant les contrôles complets.
5. Raccorder Siteverify au parcours public, avec action et hostnames staging dédiés.
6. Ajouter limites de débit, création idempotente transactionnelle, audit et tests d'intégration.
7. Effectuer une revue de sécurité et présenter les résultats avant tout déploiement.

Aucune configuration Wrangler, règle Firestore, donnée réelle, identité IAM ou facturation n'a été modifiée. Aucun Worker n'a été téléversé ou déployé.
