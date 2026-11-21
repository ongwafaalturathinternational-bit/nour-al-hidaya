 # Lot 4 — Annuaire institutionnel sécurisé

## Fonctionnalité livrée

Le premier module métier de WAT Connect est l’annuaire des membres, fondateurs et bénévoles. Il est accessible depuis le tableau de bord d’équipe aux comptes qui possèdent un périmètre d’accès adapté.

## Périmètres d’accès

- `members.read` : consultation de l’annuaire en lecture seule.
- `members.manage` : consultation, création, modification des fiches et changement de statut.

Un compte doit également être présent dans `staffAccess` avec `active: true`. Le rôle seul ne donne aucun accès. Les permissions sont vérifiées par Firestore, pas uniquement par l’interface.

## Fiche membre

Champs conservés : nom complet, catégorie (fondateur, membre, bénévole), fonction, e-mail et téléphone. Les champs de contact sont facultatifs. Aucune note personnelle ou donnée sensible n’est prévue dans ce premier annuaire.

Les fiches peuvent être modifiées, désactivées ou réactivées, mais pas supprimées depuis l’application afin de préserver l’historique. Les modifications conservent les champs de création et actualisent l’auteur et l’horodatage de mise à jour. La recherche fonctionne sur le nom, la fonction et les contacts ; des filtres permettent de réduire la liste par catégorie et statut.

## Activation manuelle sécurisée

L’administration centrale attribue les périmètres via l’écran sécurisé `staff-accounts.html`, après vérification de l’identité et de l’adresse e-mail. Les fonctions serveur exigent App Check et le claim `watAdmin`. Aucun formulaire public ne permet de s’accorder ces droits. L'écran `staff-accounts.html` utilise une clé de site reCAPTCHA Enterprise (Fraud Defense) dédiée au projet `wat-connect-staging`. Le SDK App Check est initialisé avant Auth et Firestore ; l'écran refuse de fonctionner si le projet courant n'est pas le staging ou si App Check n'a pas été initialisé. La clé de site est publique et ne remplace jamais une clé secrète. L'application Enforcement reste désactivée jusqu'à validation des tests et observation des métriques.

## Tests

Les tests couvrent les accès Firestore (gestionnaire, lecture seule, absence de périmètre, compte désactivé, interdiction de suppression et validation des champs) ainsi que la syntaxe et les interactions du formulaire de gestion. Les contrôles CI récents compilent les règles et exécutent l’ensemble des tests Firestore. Aucun déploiement de règles en production n’est effectué.
