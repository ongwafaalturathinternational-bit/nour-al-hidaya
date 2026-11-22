# Nour Al-Hidaya — plan de centralisation dans WAT Connect

**Version :** 2.2  
**Statut :** proposition de réalisation en branche de travail — non déployée  
**Base technique :** WAT Connect, Firebase et application Nour Al-Hidaya existante

## 1. Décision d'architecture

WAT Connect est l'unique plateforme de gestion et de pilotage de Nour Al-Hidaya. L'application Nour Al-Hidaya (PWA/APK) reste l'interface pédagogique des apprenants et ne maintient aucun registre administratif autonome.

Les données de référence sont centralisées. L'APK et les interfaces de terrain consomment les services sécurisés de WAT Connect. Les interfaces peuvent être distinctes, mais elles ne créent pas de bases métier parallèles.

## 2. Périmètre fonctionnel global

Le module Nour Al-Hidaya de WAT Connect doit couvrir progressivement :

1. Référentiel des bénéficiaires et inscriptions.
2. Mosquées, sites, groupes, classes et périodes.
3. Équipe pédagogique : enseignants, agents, responsables et affectations.
4. Catalogue des cours, leçons, niveaux et ressources.
5. Séances, présences et suivi des activités pédagogiques.
6. Exercices, devoirs, corrections et évaluations.
7. Progression individuelle et validation des acquis.
8. Attestations/certifications après validation autorisée.
9. Protection des apprenants, consentements et signalements à accès restreint.
10. Tableaux de bord, statistiques et rapports.

Chaque sous-module doit disposer de permissions explicites, de filtres par programme/site/groupe et d'une piste d'audit adaptée.

## 3. Deux voies d'inscription, un seul registre

### 3.1 Inscription assistée par un agent

- L'agent se connecte à WAT Connect avec un compte d'équipe actif.
- Son périmètre détermine les sites et opérations qu'il peut gérer.
- Il recherche d'abord un dossier existant.
- Il peut créer une fiche si aucun doublon confirmé n'existe.
- Il peut associer le bénéficiaire à une mosquée, un groupe et une période selon ses droits.
- L'auteur, le site, la date serveur et le consentement applicable sont conservés.

### 3.2 Auto-inscription publique

- Le bénéficiaire peut s'inscrire directement depuis un formulaire public WAT Connect, sans agent et sans compte d'équipe.
- Aucun rattachement à une mosquée n'est obligatoire.
- Le formulaire est utilisable sur téléphone et ordinateur.
- Un représentant légal effectue la démarche lorsque le bénéficiaire est mineur; le consentement correspondant est recueilli.
- Une adresse e-mail et un compte Firebase Auth ne sont pas des conditions d'existence du dossier.
- Les coordonnées de contact sont facultatives lorsque les règles de suivi et de récupération le permettent.
- Le dossier arrive par défaut au statut « en attente de vérification ».
- L'auto-inscription ne permet jamais de créer un compte d'équipe, un profil enseignant ou un droit administratif.

### 3.3 Référentiel commun

Les deux parcours alimentent le même registre central. Un bénéficiaire peut ensuite être associé à un ou plusieurs programmes, sites, groupes ou périodes sans créer plusieurs identités.

Le système conserve la provenance (auto-inscription ou agent), les consentements, l'historique des changements et le statut de validation. Les correspondances possibles sont signalées aux personnes habilitées; aucune fusion automatique ne se fonde uniquement sur un nom ressemblant.

## 4. Modèle de données cible

Les collections sont des propositions à harmoniser avec les règles Firestore et les données existantes avant toute migration.

- `beneficiaries/{beneficiaryId}` : identifiant opaque, nom d'affichage minimal, statut, provenance, dates et métadonnées de validation.
- `beneficiaryPrivate/{beneficiaryId}` : coordonnées et informations personnelles strictement nécessaires, avec accès plus restrictif.
- `beneficiaryEnrollments/{enrollmentId}` : associations à un programme, site/mosquée facultatif, groupe, niveau et période.
- `beneficiaryAccess/{beneficiaryId}` : liaison serveur facultative vers un compte Auth vérifié, sans faire de l'UID l'identifiant primaire.
- `learningProfiles/{beneficiaryId}` : paramètres pédagogiques et progression autorisée.
- `learningGroups/{groupId}` : groupe, site, niveau, période et responsable.
- `learningStaffAssignments/{assignmentId}` : affectations limitées dans le temps et dans le périmètre.
- `learningSessions/{sessionId}` et `learningAttendance/{recordId}` : séances et présences.
- `learningAssessments/{assessmentId}` et `learningResults/{resultId}` : évaluations et résultats.
- `learningAuditLogs/{eventId}` : journal append-only écrit côté serveur pour les actions sensibles.

Ne pas dupliquer dans un document général les données personnelles ou de protection qui exigent un accès spécialisé.

## 5. Permissions indicatives

Les permissions seront des scopes explicites, non déduits du seul nom du rôle :

- `learning.beneficiaries.read`
- `learning.beneficiaries.create`
- `learning.beneficiaries.review`
- `learning.beneficiaries.update`
- `learning.private.read`
- `learning.sites.read/manage`
- `learning.groups.read/manage`
- `learning.staff.read/manage`
- `learning.courses.read/manage`
- `learning.sessions.read/manage`
- `learning.attendance.read/manage`
- `learning.assessments.read/manage`
- `learning.results.read/manage`
- `learning.certificates.issue`
- `learning.protection.read/manage`
- `learning.reports.read/export`

L'accès est également limité par programme, site, groupe ou dossier. Les données de protection ne sont accessibles qu'aux personnes expressément habilitées. Les exports sont soumis à des droits dédiés et à la minimisation des données.

## 6. Architecture de sécurité

- Toute création publique ou sensible est validée côté serveur; aucune confiance n'est accordée aux champs de rôle envoyés par le navigateur.
- Les opérations d'agent revalident l'état du compte, les scopes et le périmètre au moment de l'exécution.
- Les écritures publiques sont limitées à un schéma strict, protégées contre l'abus et ne révèlent pas si une personne existe déjà dans le registre.
- Les règles Firestore refusent par défaut tout accès non explicitement autorisé.
- Les identifiants publics sont opaques; un QR code ne contient aucune donnée personnelle.
- Les actions de validation, correction, suspension, rapprochement et export sont journalisées.
- Les données des mineurs sont minimisées et protégées par le consentement du représentant légal lorsque requis.
- Aucun dossier réel ne doit être utilisé pour les essais; employer des données fictives.
- Aucun secret, clé de service ou privilège d'administration n'est placé dans le navigateur ou l'APK.

## 7. Hors connexion et synchronisation

Les fonctions pédagogiques hors connexion déjà disponibles ne doivent pas être confondues avec un registre administratif hors connexion.

L'inscription contenant des données personnelles ne sera activée hors connexion que sur des appareils d'équipe enrôlés, avec coffre local chiffré et clés protégées par le système d'exploitation. La persistance Firestore IndexedDB seule n'est pas un coffre chiffré suffisant.

Chaque opération différée doit avoir un identifiant idempotent, un état visible, une validation serveur à la synchronisation et un reçu. Une révocation de droits doit empêcher l'envoi ultérieur au titre d'anciens privilèges. Aucun élément en attente ne doit disparaître silencieusement.

## 8. Ordre de réalisation

### Lot NH-1 — Registre central et inscriptions
- Modèle de données et règles d'accès.
- Formulaire public d'auto-inscription.
- Interface agent dans WAT Connect.
- File de vérification et décisions : accepter, demander correction, refuser avec motif, examiner un doublon.
- Identifiant bénéficiaire et historique.
- Tests positifs et négatifs de sécurité.

### Lot NH-2 — Référentiels pédagogiques
- Sites/mosquées, groupes, classes, niveaux et périodes.
- Comptes d'enseignants et affectations par scopes.
- Catalogue des cours et ressources.

### Lot NH-3 — Exploitation pédagogique
- Séances, présences, devoirs, corrections et évaluations.
- Connexion sécurisée de l'APK au dossier pédagogique.
- Continuité hors connexion adaptée aux risques.

### Lot NH-4 — Pilotage et qualité
- Progression, validations, attestations.
- Tableaux de bord et rapports.
- Protection, audit et exports restreints.

## 9. Compatibilité et migration

- Conserver les fonctionnalités pédagogiques existantes tant que leur remplacement n'est pas testé.
- Ne pas considérer les profils de démonstration locaux comme des dossiers réels.
- Ne pas importer automatiquement les données de démonstration.
- Séparer le compte Firebase Auth, le dossier bénéficiaire et le profil pédagogique.
- Prévoir une migration contrôlée et réversible si des dossiers existants doivent être repris.
- Nour Al-Hidaya APK ne doit plus proposer de création d'un registre administratif indépendant une fois le nouveau parcours activé.

## 10. Critères d'acceptation du premier lot

Le lot NH-1 ne sera considéré comme prêt que si :

1. Un bénéficiaire peut déposer une demande sans agent, sans e-mail obligatoire et sans mosquée obligatoire.
2. Un agent autorisé peut créer un dossier dans son périmètre.
3. Les deux parcours aboutissent au même registre central.
4. Un visiteur public ne peut ni consulter les dossiers ni connaître l'existence d'un dossier précis.
5. Un bénéficiaire public ne peut pas s'approuver ni s'attribuer un rôle.
6. Les doublons possibles sont signalés sans fusion automatique.
7. Les actions de validation et de correction sont tracées.
8. Les tests vérifient les refus d'accès, les champs invalides et les abus de parcours.
9. Les règles et fonctions ne sont pas déployées sans validation explicite.
10. Aucun merge ou déploiement de production n'est inclus dans le lot.

## 11. État et limites

Ce document fixe la cible et l'ordre de travail. Il ne prétend pas que les collections, écrans, fonctions serveur ou permissions listés sont déjà livrés. Les travaux doivent être développés dans une branche isolée, testés sur staging et présentés en PR brouillon. Aucune fusion, migration de données réelles, activation payante ou publication de production sans accord explicite de la direction de WAT.
