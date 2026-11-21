# Lot 7 — Activités WAT et feuilles de présence

## Objectif

Fournir un outil opérationnel commun pour planifier les activités de l'ONG Wafa Al-Turath et consigner les présences sans exposer ces données publiquement.

## Fonctionnalités présentes

- Page `activites.html`, accessible depuis le portail WAT Connect selon les périmètres attribués.
- Création, consultation, modification et suivi des activités.
- Champs : intitulé, description, catégorie, date, lieu, statut et rattachement facultatif à un projet.
- Catégories : formation, humanitaire, social, réunion, sensibilisation et autre.
- Statuts : planifiée, réalisée, annulée.
- Feuille de présence par activité : référence du participant, nom affiché, type et statut (présent, absent, excusé).
- Sélection directe d'un bénévole actif du Club Khuddam lorsque le compte possède aussi le périmètre Club requis.
- Recherche et filtres des présences; export CSV de la liste filtrée lorsque le droit de lecture est disponible.
- Aucun effacement depuis le client : l'historique est conservé.

## Séparation des droits

- `activities.read` : consulter les activités.
- `activities.manage` : créer et modifier les activités.
- `attendance.read` : consulter les présences.
- `attendance.manage` : enregistrer et corriger les présences.

La page actuelle est un écran commun Activités / Présences : son ouverture exige un périmètre Activités. L'accès à la feuille de présence exige en plus le périmètre Présences correspondant. Ainsi, un compte qui possède uniquement `attendance.read` ou `attendance.manage` ne dispose pas encore d'une vue autonome Présences. Ce choix d'interface ne donne aucun droit supplémentaire dans Firestore. Une vue autonome reste un arbitrage fonctionnel distinct.

La sélection d'un bénévole du Club exige également `volunteers.read` ou `volunteers.manage`. Les droits projets seuls ne révèlent pas le registre privé des bénévoles.

## Modèle Firestore réellement utilisé

- `activities/{activityId}` : données d'activité et métadonnées de création/mise à jour.
- `attendance/{recordId}` : enregistrement individuel, avec `activityId` comme référence vers l'activité.

Les présences sont dans une collection de premier niveau, et non dans une sous-collection `activities/{activityId}/attendance`. Les règles contrôlent l'existence de l'activité référencée, les champs autorisés, les catégories/statuts, les horodatages serveur et l'identité du compte auteur.

## Mode hors connexion et limites

- Les modules opérationnels attendent l'initialisation du cache Firestore IndexedDB multi-onglets. Les documents déjà consultés peuvent rester disponibles hors connexion et les écritures mises en attente sont synchronisées au retour du réseau.
- La déconnexion attend les écritures en attente, termine Firestore et efface le cache local. Si le réseau est absent ou si le cache ne peut pas être effacé, la déconnexion sécurisée peut être bloquée afin d'éviter de perdre silencieusement des écritures ou de laisser des données locales.
- Le cache IndexedDB n'est pas un coffre local chiffré au niveau applicatif. Les appareils utilisés doivent être fiables, protégés par verrouillage et non partagés. Ne pas y saisir hors connexion des dossiers sensibles de bénéficiaires.
- La référence participant reste une valeur saisie librement, sauf lorsqu'un bénévole du Club est sélectionné. Elle ne garantit pas encore un lien vérifié vers un dossier central de membre, apprenant ou bénéficiaire.
- Les statistiques consolidées multi-programmes et l'export PDF restent à développer.

## Validation

Les tests automatisés de règles Firestore, de syntaxe et de parcours applicatifs sont exécutés dans GitHub Actions. Ils ne remplacent pas la recette manuelle avec des comptes de test aux périmètres distincts ni les essais sur un appareil Android réel. Aucun test terrain ne doit utiliser de données réelles de bénéficiaires avant validation de la protection locale.
