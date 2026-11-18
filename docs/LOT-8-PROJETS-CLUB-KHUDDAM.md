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
- Données privées, accessibles uniquement avec les périmètres volunteers.read ou volunteers.manage.
- Les contributions financières détaillées restent dans le futur module Finances. Le registre du Club ne collecte aucune pièce ou écriture financière.

## Sécurité

- projects.read / projects.manage protègent les projets et les affectations.
- volunteers.read / volunteers.manage protègent le registre privé.
- Les rôles seuls ne donnent aucun droit.
- Les fiches ne sont pas supprimables; les statuts servent à conserver l'historique.
- Une candidature publique ne crée jamais un accès d'équipe. L'approbation par un gestionnaire autorisé est nécessaire avant création d'une fiche bénévole active.
- Les règles Firestore et les tests négatifs doivent vérifier l'absence d'accès anonyme.

## Limites actuelles

- Le registre interne et les affectations sont implémentés dans ce lot de travail.
- Le formulaire public de candidature est ajouté : création/connexion à un compte, vérification obligatoire de l'e-mail et consentement explicite avant dépôt.
- Les responsables autorisés peuvent examiner les candidatures, accepter ou refuser; une acceptation crée une fiche bénévole dans le registre du Club.
- Les notifications automatiques et la synchronisation hors ligne restent à réaliser.
- Les affectations sont enregistrées par projet; la présence effective à une activité reste tracée dans le module Activités.
- Aucune donnée réelle de bénévole n'est préchargée.

## Validation

Le lot ne doit pas être fusionné ni déployé en production avant que les tests de règles Firestore, les tests de syntaxe, et une vérification manuelle avec des comptes de test aux périmètres distincts soient réussis.
