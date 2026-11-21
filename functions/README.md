# Provisionnement sécurisé des comptes WAT Connect

## Périmètre
Ces fonctions sont destinées à **wat-connect-staging**. Elles ne doivent pas être déployées en production avant validation distincte.

## Sécurité
- Les fonctions exigent une session Firebase Auth, un e-mail vérifié, le custom claim `watAdmin: true` et App Check.
- Le navigateur ne reçoit jamais de privilège Admin SDK.
- Les rôles et scopes sont validés par listes autorisées.
- Un nouveau compte d'équipe est créé inactif. L'activation est refusée tant que l'adresse n'est pas vérifiée.
- Les documents `staffAccess` sont écrits uniquement par Admin SDK ; les règles Firestore client restent fermées en écriture.
- Le claim administrateur n'est jamais attribuable par une fonction callable.

## Initialisation unique de l'administrateur staging
1. Vérifier l'adresse `ongwafaalturathinternational@gmail.com` dans Firebase Authentication.
2. Exécuter le script `scripts/bootstrap-wat-admin.js` depuis un environnement de confiance authentifié par Application Default Credentials, avec le projet explicitement fixé à `wat-connect-staging` et l'UID du compte.
3. Déconnecter puis reconnecter le compte afin de renouveler son jeton.
4. Déployer les fonctions uniquement sur staging et tester avec Firebase Emulator avant toute ouverture.

Le script refuse tout projet autre que `wat-connect-staging`, vérifie l'adresse et exige que l'e-mail soit vérifié. Aucune clé de service ne doit être ajoutée au dépôt.

## Invitation
`createStaffAccount` crée le compte Auth et un document `staffAccess` inactif. Elle renvoie un lien de vérification et un lien de définition du mot de passe à remettre à la personne concernée par un canal privé. Ne jamais publier ces liens dans un ticket, un journal ou un canal collectif.

## Activation / suspension
`setStaffAccountStatus` permet à l'administrateur de confiance d'activer ou suspendre un accès. L'activation exige un e-mail vérifié. La suspension désactive également le compte Firebase Authentication.

## Limites actuelles
Ces endpoints constituent la couche serveur ; l'interface d'administration doit encore les appeler avec App Check initialisé. Les fonctions ne sont pas déployées par ce changement.
