# Lot 8 — Projets et Club Khuddam Al-Turath

## Objet

Compléter le premier bloc opérationnel WAT Connect en reliant les programmes, les projets, les activités, les présences et les bénévoles du Club Khuddam Al-Turath (« Ensemble au service du bien »).

## Périmètre fonctionnel

### Projets
- Registre des projets distinct du catalogue des programmes.
- Code court, description, période, statut et rattachement facultatif à un programme.
- Statuts : planifié, en cours, suspendu, terminé.
- Affectation d'un ou plusieurs bénévoles à un projet, avec rôle et état de l'affectation.
- Conservation de l'historique : aucune suppression depuis le portail.

### Club Khuddam Al-Turath
- Trois catégories : occasionnel, engagé, contributeur.
- Fiche bénévole : nom, coordonnées facultatives, compétences, intérêts, disponibilités et statut.
- Statuts de dossier : en attente, actif, inactif, suspendu, rejeté.
- Affectation à des projets et participation aux activités via les feuilles de présence.
- Depuis le module Activités, un gestionnaire disposant aussi de volunteers.read ou volunteers.manage peut sélectionner directement un bénévole actif du Club pour enregistrer sa présence; son identifiant de fiche est conservé comme référence.
- L'historique des présences d'une activité affiche le nom, le type de participant et le statut de présence.
- Données privées, accessibles uniquement avec les périmètres volunteers.read ou volunteers.manage.
- Les contributions financières détaillées restent dans le futur module Finances. Le registre du Club ne collecte aucune pièce ou écriture financière.

## Sécurité

- projects.read / projects.manage protègent les projets et les affectations.
- volunteers.read / volunteers.manage protègent le registre privé.
- Les rôles seuls ne donnent aucun droit.
- Les fiches ne sont pas supprimables; les statuts servent à conserver l'historique.
- Une candidature publique ne crée jamais un accès d'équipe. L'approbation par un gestionnaire autorisé est nécessaire avant création d'une fiche bénévole active.
- Les règles Firestore et les tests négatifs doivent vérifier l'absence d'accès anonyme.

## Mode hors connexion et synchronisation

- Le shell PWA conserve les pages publiques et les ressources statiques des modules Projets, Activités et Club. Le service worker ne met jamais en cache les réponses Firestore, les comptes, les présences, les candidatures ou les données privées.
- Sur les écrans opérationnels authentifiés, Firestore active le cache IndexedDB multi-onglets. Les documents déjà consultés restent lisibles hors connexion et les écritures Firestore acceptées localement sont mises en attente puis synchronisées automatiquement au retour du réseau.
- La première authentification, le premier chargement des données et les actions nécessitant une réponse serveur exigent une connexion. Le formulaire public de candidature reste soumis à la vérification du compte et à la disponibilité du service.
- Le bandeau réseau distingue l'absence de connexion du cas où le navigateur ne prend pas en charge le cache persistant. Les écrans attendent la fin de l'initialisation du cache avant de lire les données.
- Pour protéger les données personnelles stockées sur l'appareil, la déconnexion attend le traitement des écritures en attente, termine Firestore, efface le cache local puis ferme la session. Hors connexion, la déconnexion est bloquée afin de ne pas perdre silencieusement les écritures en attente; l'utilisateur doit retrouver le réseau pour synchroniser et effacer les données.
- Le cache persistant contient des données privées déjà consultées sur l'appareil : l'accès hors connexion doit être réservé aux appareils de confiance, protégés par verrouillage et non partagés. Les règles Firestore restent appliquées par le serveur lors de la synchronisation; un affichage local en attente ne vaut pas validation serveur.
- Le mode PWA installable ne nécessite pas d'abonnement de plateforme. Le paquet APK Android reste une étape de conditionnement/signature distincte; il ne doit pas être présenté comme généré ni publié tant que l'artefact signé n'a pas été construit et testé.

## Limites actuelles

- Le registre interne et les affectations sont implémentés dans ce lot de travail.
- Le formulaire public de candidature est ajouté : création/connexion à un compte, vérification obligatoire de l'e-mail et consentement explicite avant dépôt.
- Les responsables autorisés peuvent examiner les candidatures, accepter ou refuser; une acceptation crée une fiche bénévole dans le registre du Club.
- Les notifications automatiques et la synchronisation hors ligne restent à réaliser.
- Les affectations sont enregistrées par projet; la présence effective à une activité reste tracée dans le module Activités, avec sélection directe des bénévoles du Club lorsque le périmètre d'accès le permet.
- Aucune donnée réelle de bénévole n'est préchargée.

## Validation

Le lot ne doit pas être fusionné ni déployé en production avant que les tests de règles Firestore, les tests de syntaxe, et une vérification manuelle avec des comptes de test aux périmètres distincts soient réussis.
