# Recette fonctionnelle — bloc opérationnel WAT Connect

Ce document sert à valider le lot Projets, Activités, Présences et Club Khuddam avant toute fusion. Il ne remplace pas les tests automatisés et ne prétend pas qu'un essai sur téléphone a déjà été effectué.

## 1. Préparation

- Utiliser un compte d'équipe vérifié avec les périmètres strictement nécessaires.
- Préparer au moins deux bénévoles actifs, un bénévole inactif et une candidature publique en attente.
- Préparer un projet de test et deux activités liées à ce projet.
- Utiliser d'abord l'environnement de test prévu pour WAT Connect. Ne pas effectuer ces essais avec des données réelles de bénéficiaires.

## 2. Club Khuddam Al-Turath

- Ouvrir le registre et vérifier les trois catégories : Occasionnel, Engagé et Contributeur.
- Créer une fiche bénévole, modifier ses compétences et disponibilités, puis vérifier les filtres et les indicateurs.
- Vérifier qu'un compte sans le périmètre `volunteers.read` ne peut pas consulter le registre.
- Déposer une candidature depuis le formulaire public avec un compte vérifié et le consentement requis.
- Vérifier que la candidature apparaît « En attente » et n'entre pas encore dans le registre.
- Avec `volunteers.manage`, accepter une candidature puis vérifier la création d'une seule fiche active.
- Refuser une autre candidature et vérifier qu'aucune fiche bénévole n'est créée.
- Vérifier qu'une seconde tentative de traitement d'une candidature déjà traitée est rejetée.

## 3. Projets et affectations

- Créer un projet, renseigner son code, sa description, ses dates et son statut.
- Lier le projet à un programme lorsque le compte possède le droit de lecture correspondant.
- Affecter un bénévole actif avec une mission.
- Vérifier qu’une seconde affectation du même bénévole dans le même projet met à jour la fiche existante au lieu de créer un doublon.
- Faire évoluer l'affectation de « Proposée » à « Confirmée », puis « Retirée ».
- Vérifier qu'un bénévole inactif ne peut pas être sélectionné pour une nouvelle affectation.
- Vérifier qu'un compte sans `projects.manage` ne peut ni créer un projet ni modifier une affectation.

## 4. Activités et feuilles de présence

- Créer une activité sans projet, puis une activité liée au projet de test.
- Enregistrer une présence, une absence et une absence excusée.
- Vérifier que chaque ligne est reliée à l'identifiant de l'activité et que le changement de statut ne change ni l'activité ni l'identité du participant.
- Vérifier le filtrage, les totaux et l'export CSV.
- Vérifier qu'un compte sans `attendance.manage` reste en lecture seule.
- Vérifier qu'un compte sans `attendance.read` ne voit pas les feuilles de présence.

## 5. Essai hors connexion — PWA

À effectuer sur le téléphone Android qui servira aux équipes :

1. Ouvrir WAT Connect avec Internet et se connecter avec le compte d'équipe autorisé.
2. Visiter successivement Projets, Activités et Club Khuddam afin que les données nécessaires soient mises en cache.
3. Installer l'application depuis le navigateur si l'invite PWA est proposée.
4. Activer le mode avion, fermer puis relancer l'application.
5. Vérifier que le shell et les données déjà consultées restent accessibles. La première connexion et les données jamais consultées nécessitent Internet.
6. Créer une fiche ou modifier une donnée de test autorisée hors connexion. Vérifier que l'interface indique clairement l'absence de réseau.
7. Rétablir Internet et attendre la synchronisation. Recharger la page et vérifier que la modification est présente une seule fois.
8. Tenter une déconnexion alors que l'appareil est hors ligne : elle doit être bloquée afin de ne pas effacer les écritures en attente.
9. Une fois reconnecté, se déconnecter normalement et vérifier que le cache privé est effacé.

## 6. Points de vigilance et critères de validation

- Le cache hors connexion ne rend pas les données instantanément révocables : un appareil utilisé hors ligne doit être verrouillé et réservé à une personne autorisée.
- Le formulaire public de candidature reste dépendant d'Internet et de la vérification de l'adresse e-mail.
- L'APK généré est une version de débogage. Il faut l'installer et l'essayer physiquement avant de considérer la distribution Android comme validée.
- Aucun essai réel ne doit être fait avec des informations personnelles de bénéficiaires sans cadre de protection et autorisations appropriés.

Le lot est prêt pour validation fonctionnelle lorsque les scénarios ci-dessus sont exécutés avec succès, notamment le cycle hors connexion / reconnexion sur un téléphone réel.
