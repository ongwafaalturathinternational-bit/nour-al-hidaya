# WAT Connect / Nour Al-Hidaya — modèle de données proposé

## Objectif

Préparer la migration du prototype local vers Firebase sans ouvrir prématurément les données personnelles. Ce document décrit le modèle cible ; la matrice de permissions reste une proposition. Les règles actuellement déployées ne couvrent que le profil personnel de l'apprenant.

## Principes obligatoires

- Firebase Authentication identifie chaque personne ; aucun PIN ou mot de passe n'est conservé dans un document Firestore.
- Le rôle affiché par le navigateur n'est jamais une preuve d'autorisation.
- Les droits sont vérifiés par des règles Firestore et, pour les opérations sensibles, par un environnement serveur de confiance.
- Collecter le minimum nécessaire. Éviter de stocker des notes sensibles d'accompagnement religieux ou des informations concernant des mineurs sans nécessité, consentement et règles de conservation définies.
- Aucun accès public aux collections privées.
- Les fichiers privés devront être stockés dans Firebase Storage avec des règles dédiées ; un nom de fichier seul n'est pas un téléversement.

## Collections envisagées

### `users/{uid}`
Profil minimal lié à l'identifiant Firebase Authentication :
- `displayName` : nom d'affichage ou pseudonyme ;
- `role` : rôle attribué par un administrateur autorisé ;
- `status` : actif, suspendu ou en attente ;
- `createdAt`, `updatedAt` : horodatages serveur.

Le champ `role` ne doit pas être modifiable librement par son propriétaire. Les rôles élevés (administrateur, bureau, coordonnateur) devront être attribués par un mécanisme de confiance.

### `learners/{learnerId}`
Dossier pédagogique minimal :
- `uid` : compte Authentication associé, si la personne possède un compte ;
- `displayName` : nom d'affichage/pseudonyme ;
- `countryCode`, `commune`, `mosqueId` : uniquement si nécessaires à l'organisation ;
- `status` : état administratif de l'inscription ;
- `createdAt`, `updatedAt`.

Ne pas ajouter par défaut date de naissance complète, adresse précise, données de santé, ou détails personnels de conversion/accompagnement.

### `groups/{groupId}`
- `name`, `mosqueId`, `teacherUids`, `learnerIds`, `status`.

### `sessions/{sessionId}`
- `groupId`, `teacherUid`, `startsAt`, `endsAt`, `status`.
- Les présences doivent être enregistrées séparément avec accès limité.

### `attendance/{recordId}`
- `sessionId`, `learnerId`, `status`, `recordedBy`, `recordedAt`.
- Pas de géolocalisation par défaut.

### `courses/{courseId}` et `assignments/{assignmentId}`
Contenus pédagogiques, exercices et devoirs. Séparer le contenu public des soumissions individuelles.

### `auditLogs/{logId}`
Journal des opérations sensibles, écrit uniquement par un environnement de confiance. Ne pas autoriser les clients à créer eux-mêmes des événements d'audit réputés fiables.

## Matrice de permissions à valider

| Profil | Accès envisagé |
|---|---|
| Apprenant | Lire les contenus publiés et ses propres résultats ; soumettre ses propres devoirs |
| Formateur | Voir les apprenants de ses groupes ; gérer les séances et présences de ses groupes |
| Agent | Créer une inscription en attente ; ne pas consulter les dossiers non nécessaires |
| Parrain | Accéder uniquement aux bénéficiaires qui lui sont explicitement affectés ; notes minimales |
| Coordonnateur | Suivi opérationnel selon périmètre autorisé |
| Bureau / administrateur | Accès administratif selon mandat, avec journalisation et contrôle renforcé |

Cette matrice doit être approuvée par WAT avant d'écrire les règles d'accès positives.

## Synchronisation hors connexion — conception

Une inscription saisie hors connexion doit rester dans une file locale clairement identifiée comme « en attente ». À la reconnexion :
1. authentifier l'utilisateur ;
2. envoyer chaque élément avec un identifiant unique généré à l'avance ;
3. vérifier côté serveur que l'utilisateur a le droit de créer cet élément ;
4. prévenir les doublons ;
5. marquer l'élément comme synchronisé seulement après confirmation du serveur ;
6. afficher et conserver les erreurs pour reprise.

Les données privées ne doivent pas être ajoutées au cache général du Service Worker.

## État actuel et prochaine validation

- Les règles Firestore déployées autorisent chaque utilisateur authentifié à créer, lire et modifier son propre document `users/{uid}` dans les limites des champs définis.
- Les suppressions sont limitées aux profils dont le rôle est `apprenant`.
- Toutes les autres collections et tous les autres documents restent interdits par défaut.
- Le déploiement de ces règles sur le projet `wat-connect` a réussi le 18 novembre 2026.
- Le modèle ci-dessus est à valider avant toute règle permissive.
- Aucun raccordement Firestore ni test d'authentification n'est prétendu à ce stade.
