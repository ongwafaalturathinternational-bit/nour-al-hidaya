# NH-1 — premier squelette API et tests de sécurité

Date : 22 novembre 2026  
Branche : `feature/nour-central-management-foundation`  
Statut : code préparatoire uniquement ; aucun déploiement.

## Livré dans cette étape

- `workers/learning-api/src/index.js` : point d'entrée Worker minimal.
- `tests/learning-api-worker.test.js` : tests du comportement fermé par défaut et des méthodes HTTP.
- `package.json` : commande `npm run test:learning-api`.

Le squelette expose uniquement :
- `GET /health` : indique explicitement que le service n'est pas configuré et n'accepte aucune inscription ;
- les routes publiques, agent et revue NH-1 : répondent `503 service_not_configured` ;
- les routes de décision et d'examen des doublons : répondent également `503 service_not_configured` ;
- une méthode HTTP non autorisée : répond `405 method_not_allowed` avec l'en-tête `Allow` ;
- toute autre route : répond `404`.

Les réponses utilisent `Cache-Control: no-store` et `X-Content-Type-Options: nosniff`.

## Tests effectués

Suite Node.js exécutée sur le code ajouté :
- état de santé et en-têtes : réussi ;
- méthode incorrecte sur `/health` : réussi ;
- soumission publique refusée : réussi ;
- soumission agent refusée : réussi ;
- file de revue non exposée : réussi ;
- méthode incorrecte sur une route d'inscription : réussi ;
- route de décision maintenue désactivée : réussi ;
- route d'examen des doublons maintenue désactivée : réussi ;
- route inconnue : réussi.

Résultat : **9 tests réussis, 0 échec**.

## Ce qui n'est pas encore activé

- aucune configuration Wrangler n'a été modifiée ;
- aucun Worker Cloudflare n'a été téléversé ou déployé ;
- aucune écriture Firestore n'est implémentée ;
- aucune authentification Firebase ID token ni aucun scope agent n'est encore vérifié ;
- aucune inscription réelle n'est acceptée ;
- aucune interface APK ou WAT Connect n'appelle ce squelette.

## Condition avant passage à l'API réelle

Il faut d'abord valider l'identité serveur Firebase staging et son stockage sécurisé dans le seul Worker staging, puis implémenter et tester l'adaptateur Firestore, la vérification Firebase Auth, les scopes, l'idempotence, l'anti-abus et l'audit. Le formulaire ne sera raccordé qu'après ces validations.
