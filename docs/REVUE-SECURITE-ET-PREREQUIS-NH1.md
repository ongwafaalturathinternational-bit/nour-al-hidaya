# NH-1 — contrôle de sécurité et prérequis d'implémentation

Date : 22 novembre 2026  
Périmètre : dépôt `nour-al-hidaya`, branche `feature/nour-central-management-foundation`.  
Statut : revue statique du dépôt ; aucun déploiement ni accès aux données réelles.

## 1. Résultats vérifiés

- `wrangler.jsonc` et `wrangler.staging.json` ne déclarent qu'un répertoire d'assets statiques. Aucun `main`, route API, binding de base de données ou service Worker métier n'est configuré.
- `package.json` ne définit ni suite de tests, ni commande de test, ni dépendance Firebase Admin, JOSE/JWT ou Vitest Workers.
- `firebase.json` ne configure que Firestore Rules et Firebase Hosting.
- `firebase-init.js` initialise le SDK Firebase côté navigateur. Il ne fournit aucune identité serveur et ne doit pas être transformé en lieu de stockage de secret.
- `scripts/prepare-capacitor-web.mjs` copie les ressources web et les SDK Firebase dans `web-dist`; ce mécanisme ne crée pas d'API serveur.
- Les règles Firestore possèdent une règle finale `match /{document=**} { allow read, write: if false; }`. Les nouvelles collections NH-1 sont donc refusées par défaut aux clients, ce qui est le comportement sûr à conserver.
- Les règles existantes autorisent encore certains parcours pédagogiques sous `users/{userId}/learning/{recordId}`. Ces données et les comptes existants doivent être audités et préservés ; ils ne sont pas équivalents au nouveau registre bénéficiaire.

## 2. Décision de sécurité

Ne pas créer une API d'inscription qui écrit directement depuis le navigateur ou l'APK dans les collections NH-1. Ne pas ouvrir les nouvelles collections dans les règles Firestore pour contourner l'absence d'API.

Le chemin serveur retenu doit vérifier côté serveur :
1. les données publiques avec schéma strict, limites de taille et normalisation ;
2. les abus (limitation de débit et protection anti-automatisation) ;
3. les jetons Firebase ID des agents et leurs autorisations/scopes ;
4. l'idempotence des soumissions et les doublons sans fusion automatique ;
5. l'audit des décisions et des accès sensibles.

Les réponses publiques doivent rester génériques et ne jamais permettre de lire ou d'énumérer les dossiers.

## 3. Prérequis bloquants avant toute écriture réelle

- Choisir et valider l'identité serveur autorisée à écrire dans Firestore staging (compte de service à privilèges minimaux ou mécanisme serveur Firebase équivalent).
- Vérifier que cette identité appartient exclusivement au projet `wat-connect-staging` pour les premiers essais.
- Définir le stockage du secret hors Git, hors APK et hors variables publiques ; aucun secret n'est présent dans le dépôt et aucun secret ne doit être ajouté ici.
- Confirmer le mécanisme de vérification Firebase ID token et la politique de révocation/expiration.
- Préparer une configuration Worker dédiée au staging, distincte des configurations d'assets statiques et de production.
- Installer une stratégie de tests automatisés adaptée au runtime choisi (tests unitaires de validation + tests d'intégration staging/émulateur).
- Vérifier les règles Firestore avec tests positifs et négatifs avant toute modification ; conserver le refus par défaut des collections NH-1 pour les clients.

Tant que ces points ne sont pas satisfaits, le serveur ne doit accepter aucune inscription réelle et l'interface publique ne doit pas afficher de confirmation laissant croire qu'un dossier a été enregistré.

## 4. Ordre de réalisation sécurisé

1. Établir le squelette API staging isolé, sans secret ni écriture.
2. Ajouter les validateurs et tests unitaires : champs obligatoires, longueurs, formats, mineurs/tuteur, valeurs interdites, payloads trop volumineux.
3. Ajouter la vérification d'identité serveur et les contrôles d'accès agent, puis les tests de refus.
4. Brancher l'écriture Firestore staging avec idempotence et journal d'audit.
5. Tester la soumission publique, la soumission agent, les rejets, les doublons, les permissions et les réponses génériques.
6. Seulement après validation, connecter le formulaire public et l'APK au point d'entrée staging.

## 5. Critères de sortie NH-1

- Aucune écriture directe client dans les collections bénéficiaires.
- Une soumission publique valide produit un reçu et un dossier en attente, sans lecture publique du dossier.
- Une soumission agent exige un jeton valide, un compte actif et le scope adéquat.
- Une répétition de requête avec la même clé d'idempotence ne crée pas un second dossier.
- Les décisions d'acceptation/refus sont authentifiées, autorisées et auditées.
- Les anciens comptes et profils apprenants ne sont ni supprimés ni convertis automatiquement.
- Tous les tests de sécurité passent sur staging avant tout déploiement.

## 6. Limites de cette revue

Cette revue est statique et limitée aux fichiers récupérés sur la branche. Elle ne prouve ni la configuration réelle du compte Cloudflare, ni l'existence de secrets staging, ni l'état des données Firebase. Aucun test d'émulateur, appel d'API, changement de règles, déploiement ou migration n'a été exécuté.
