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
- Commande `npm run test:learning-api` étendue à toute la suite NH-1.

## Tests

Suite locale Node.js exécutée sur les sources correspondantes :
- 9 tests Worker : réussis ;
- 6 tests de configuration : réussis.

**Total : 15 tests réussis, 0 échec.**

## Limites importantes

Le validateur de configuration est une préparation isolée : il n'est pas encore raccordé au chemin d'exécution du Worker et ne prouve ni l'identité Firebase ni l'accès Firestore. Aucun échange OAuth, aucune vérification cryptographique de Firebase ID token, aucun appel Firestore, aucune validation Turnstile, aucune limitation de débit et aucune écriture métier ne sont encore implémentés.

Les routes restent donc toutes désactivées. Même si des variables sont présentes, le service ne doit pas accepter d'inscription.

## Conditions avant activation

1. Créer une identité de service dédiée au seul projet staging et valider ses privilèges minimaux.
2. Enregistrer les secrets dans le magasin Cloudflare du Worker staging, jamais dans Git ou dans l'APK.
3. Implémenter OAuth serveur, vérification des ID tokens, contrôle des scopes et adaptateur Firestore.
4. Ajouter Turnstile, limites de débit, idempotence, audit et tests d'intégration.
5. Effectuer une revue de sécurité et présenter les résultats avant tout déploiement.

Aucune configuration Wrangler, règle Firestore, donnée réelle, identité IAM ou facturation n'a été modifiée. Aucun Worker n'a été téléversé ou déployé.
