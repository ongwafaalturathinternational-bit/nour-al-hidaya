 # Lot 4 — Annuaire institutionnel sécurisé

## Fonctionnalité livrée

Le premier module métier de WAT Connect est l’annuaire des membres, fondateurs et bénévoles. Il est accessible depuis le tableau de bord d’équipe aux comptes qui possèdent un périmètre d’accès adapté.

## Périmètres d’accès

- `members.read` : consultation de l’annuaire en lecture seule.
- `members.manage` : consultation, création et changement de statut des fiches.

Un compte doit également être présent dans `staffAccess` avec `active: true`. Le rôle seul ne donne aucun accès. Les permissions sont vérifiées par Firestore, pas uniquement par l’interface.

## Fiche membre

Champs conservés : nom complet, catégorie (fondateur, membre, bénévole), fonction, e-mail et téléphone. Les champs de contact sont facultatifs. Aucune note personnelle ou donnée sensible n’est prévue dans ce premier annuaire.

Les fiches ne sont pas supprimables depuis l’application : elles peuvent être désactivées ou réactivées afin de préserver l’historique. Les écritures enregistrent l’auteur et les horodatages.

## Activation manuelle sécurisée

Tant qu’un processus serveur d’administration n’est pas développé, un administrateur de confiance attribue les périmètres directement dans la console Firebase, dans le document `staffAccess/{uid}`. Il ajoute `members.read` ou `members.manage` au tableau `scopes` du compte déjà vérifié. Aucun formulaire public ne permet de s’accorder ces droits.

## Tests

Le lot ajoute des tests d’accès : gestionnaire, lecture seule, absence de périmètre, compte désactivé, interdiction de suppression et validation des champs. Aucun déploiement de règles n’est effectué dans ce lot.
