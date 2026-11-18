 # Lot 7 — Activités WAT et feuilles de présence

## Objectif

Fournir un premier outil opérationnel commun pour planifier les activités de l'ONG Wafa Al-Turath et consigner les présences sans exposer ces données publiquement.

## Module livré dans ce lot

- Page activites.html, accessible depuis le portail WAT Connect selon les scopes.
- Création et consultation des activités.
- Champs : intitulé, description, catégorie, date, lieu et statut.
- Catégories : formation, humanitaire, social, réunion, sensibilisation et autre.
- Statuts : planifiée, réalisée, annulée.
- Feuille de présence par activité : référence participant, libellé, type et statut (présent, absent, excusé).
- Aucun effacement depuis le client : l'historique est conservé.

## Séparation des droits

- activities.read : consulter les activités.
- activities.manage : créer et modifier les activités.
- attendance.read : consulter les feuilles de présence.
- attendance.manage : enregistrer et corriger les présences.

Les droits activités ne donnent pas automatiquement accès aux présences. Pour utiliser la feuille de présence depuis la page, un membre de l'équipe doit également recevoir activities.read (ou activities.manage) et le scope de présence correspondant.

## Modèle Firestore

- activities/{activityId} : données d'activité et métadonnées de création/mise à jour.
- activities/{activityId}/attendance/{recordId} : enregistrement individuel de présence.

Les écritures imposent des champs autorisés, des catégories/statuts contrôlés, des horodatages serveur et l'identité du compte auteur. Les données sont accessibles uniquement aux comptes d'équipe actifs disposant des scopes correspondants.

## Limites actuelles

- La saisie des participants est manuelle ; la liaison automatique à l'annuaire des membres, aux apprenants et au registre des bénéficiaires viendra dans un lot ultérieur.
- La page affiche un résumé des présences ; l'export PDF/CSV et les statistiques consolidées seront ajoutés ultérieurement.
- La page exige une connexion Internet pour cette première version ; la saisie hors connexion sera traitée avec la stratégie de synchronisation commune.
- Les tests automatisés de règles et de syntaxe sont ajoutés au workflow GitHub Actions. La validation CI doit être vérifiée avant toute fusion.
