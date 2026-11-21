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
1. Exécuter le script `scripts/bootstrap-wat-admin.js` depuis un environnement de confiance authentifié par Application Default Credentials, avec le projet explicitement fixé à `wat-connect-staging` et l'UID du compte.
2. Si l'adresse n'est pas encore vérifiée, le script génère un lien de confirmation à ouvrir dans un navigateur ; relancer ensuite la même commande.
3. Une fois l'adresse vérifiée, le script attribue le claim `watAdmin`.
4. Déconnecter puis reconnecter le compte afin de renouveler son jeton.
5. Déployer les fonctions uniquement sur staging et tester avec Firebase Emulator avant toute ouverture.

Le script refuse tout projet autre que `wat-connect-staging` et vérifie que l'UID fourni correspond à l'adresse administrateur autorisée. Aucune clé de service ne doit être ajoutée au dépôt.

## Invitation
`createStaffAccount` crée le compte Auth et un document `staffAccess` inactif. Elle renvoie un lien de vérification et un lien de définition du mot de passe à remettre à la personne concernée par un canal privé. Ne jamais publier ces liens dans un ticket, un journal ou un canal collectif.

## Activation / suspension
`setStaffAccountStatus` permet à l'administrateur de confiance d'activer ou suspendre un accès. L'activation exige un e-mail vérifié. La suspension désactive également le compte Firebase Authentication.

## Limites actuelles
La page `staff-accounts.html` est intégrée et initialise App Check côté client lorsque sa clé reCAPTCHA est renseignée. Les fonctions ne sont pas déployées par ce changement.

## Interface de gestion des comptes

La page `staff-accounts.html` fournit le registre, la création et l'activation/suspension des comptes. Elle vérifie le claim `watAdmin` avant d'afficher les outils et appelle les fonctions dans `us-central1`.

### Configuration App Check obligatoire avant utilisation

1. Dans Firebase Console, ouvrir le projet **wat-connect-staging**.
2. Aller dans **App Check**, enregistrer l'application Web WAT Connect avec le fournisseur **reCAPTCHA v3**.
3. Ajouter le domaine de staging autorisé dans la configuration reCAPTCHA.
4. Copier la clé de site publique reCAPTCHA v3 et la placer dans la balise meta `wat-recaptcha-site-key` de `staff-accounts.html`.
5. Activer l'application Web dans App Check, puis tester le jeton App Check depuis le site staging.
6. Déployer les fonctions uniquement sur staging et exécuter les tests de bout en bout avant toute utilisation réelle.

Tant que la clé n'est pas configurée, la page affiche un message explicite et n'appelle pas les fonctions. Ne jamais désactiver `enforceAppCheck` pour contourner ce prérequis. La clé de site reCAPTCHA est publique ; aucun secret serveur ou jeton administrateur ne doit être placé dans le HTML.

La page n'est pas reliée à un lien public de navigation. Elle est affichée dans l'espace membre uniquement au compte possédant le claim `watAdmin`.
