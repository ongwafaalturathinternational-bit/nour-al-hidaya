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
- Cache JWKS Google piloté par `Cache-Control`, avec actualisation si un `kid` inconnu apparaît.
- Tests dédiés des chemins OAuth et de vérification de jetons, avec clés RSA générées uniquement en mémoire pour les tests.
- Commande `npm run test:learning-api` étendue à toute la suite NH-1.

## Tests

Suite locale précédemment exécutée : 15 tests réussis, 0 échec (Worker et configuration).

La nouvelle suite `tests/learning-api-google-auth.test.js` couvre la signature OAuth, les réponses OAuth mal formées, la signature Firebase, le verrouillage projet et l’expiration. Elle est ajoutée au script global ; elle reste à exécuter dans un environnement Node.js/Workers compatible avant toute activation.

## Limites importantes

Le validateur de configuration et les primitives OAuth/ID-token sont des modules isolés : ils ne sont pas encore raccordés au chemin d'exécution du Worker. L'échange OAuth et la vérification cryptographique disposent de code et de tests dédiés, mais ne sont pas encore exécutés sur le service réel. Aucun appel Firestore, aucune validation Turnstile, aucune limitation de débit et aucune écriture métier ne sont implémentés.

Les routes restent donc toutes désactivées. Même si des variables sont présentes, le service ne doit pas accepter d'inscription.

## Conditions avant activation

1. Créer une identité de service dédiée au seul projet staging et valider ses privilèges minimaux.
2. Enregistrer les secrets dans le magasin Cloudflare du Worker staging, jamais dans Git ou dans l'APK.
3. Implémenter OAuth serveur, vérification des ID tokens, contrôle des scopes et adaptateur Firestore.
4. Ajouter Turnstile, limites de débit, idempotence, audit et tests d'intégration.
5. Effectuer une revue de sécurité et présenter les résultats avant tout déploiement.

Aucune configuration Wrangler, règle Firestore, donnée réelle, identité IAM ou facturation n'a été modifiée. Aucun Worker n'a été téléversé ou déployé.
