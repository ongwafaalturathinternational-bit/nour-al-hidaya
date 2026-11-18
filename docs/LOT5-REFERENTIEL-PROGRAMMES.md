 # Lot 5 — Référentiel des programmes WAT

## Fonctionnalité

WAT Connect accueille un premier référentiel institutionnel des programmes de l’ONG. Il permet aux responsables autorisés de créer une fiche programme, de la rechercher et de faire évoluer son statut.

## Champs

- Nom et code court du programme.
- Domaine : éducation, action sociale, humanitaire, formation ou autre.
- Description.
- Statut : planifié, actif, suspendu ou terminé.
- Dates facultatives de début et de fin.
- Auteur et horodatages des créations/mises à jour.

## Accès

- `programs.read` : consultation.
- `programs.manage` : création et changement de statut.

Le compte doit aussi être actif dans `staffAccess`. Les règles Firestore vérifient ces périmètres côté serveur. Les programmes ne sont pas supprimables depuis l’application.

## Portée

Ce registre est le socle de pilotage des programmes permanents et périodiques de WAT. Il ne constitue pas encore le suivi détaillé des projets, budgets, bénéficiaires, activités ou indicateurs, qui seront ajoutés dans des modules distincts.
