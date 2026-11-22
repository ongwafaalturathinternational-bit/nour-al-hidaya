# Architecture cible — inscription universelle des bénéficiaires

**Statut : proposition technique à valider — 20 novembre 2026**  
**Périmètre :** conception préalable, aucune fonction de production n'est déclarée livrée par ce document.

## 1. Décision d'architecture

L'inscription universelle doit être un service métier de Nour Al-Hidaya, et non une extension du formulaire de compte Firebase.

- Un bénéficiaire possède un dossier central même sans e-mail, téléphone, smartphone personnel ou compte Firebase Auth.
- Un agent WAT authentifié et habilité réalise la saisie assistée.
- Le dossier, l'identité d'accès et le profil pédagogique sont trois objets distincts.
- Le client ne décide jamais seul des droits, des rapprochements d'identité ou de l'approbation d'un dossier.
- Les écritures centrales sensibles passent par un service serveur contrôlé; les règles Firestore restent fermées par défaut.
- L'usage hors connexion est autorisé uniquement avec un mécanisme local de protection validé et un appareil d'équipe enrôlé.

## 2. Modèle de données proposé

Les noms ci-dessous suivent désormais le préfixe `learning` retenu par la décision technique NH-1. Les champs restent indicatifs et devront être validés avec le cahier des charges initial.

### `learningBeneficiaries/{beneficiaryId}` — dossier central

Champs possibles :
- `status` : brouillon, actif, suspendu, archivé ;
- `displayName` : nom d'usage nécessaire à l'identification opérationnelle ;
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy` ;
- `originFacilityId`, `primaryProgramIds` ;
- `identityReviewStatus` : à vérifier, vérifié, rapprochement requis.

Ne pas placer par défaut toutes les données sensibles dans un document général facilement consultable. Les données privées doivent être séparées et limitées aux rôles qui en ont besoin.

### `learningBeneficiaryPrivate/{beneficiaryId}` — informations personnelles restreintes

Contenu minimal déterminé par finalité : date de naissance ou tranche d'âge si nécessaire, contacts facultatifs, responsable légal pour mineur si requis, informations de consentement et autres champs explicitement autorisés.

Accès plus restreint que le simple droit de consulter un dossier pédagogique. Les champs médicaux, religieux sensibles ou autres informations non nécessaires ne sont pas collectés par défaut.

### `learningEnrollments/{enrollmentId}`

Association du dossier à un programme, une mosquée/structure, un groupe, une période et un parcours. Le bénéficiaire peut avoir plusieurs inscriptions sans multiplier ses dossiers.

### `learningBeneficiaryAccess/{beneficiaryId}` — liaison facultative

Lien serveur entre dossier et compte Auth lorsqu'un accès personnel est demandé et vérifié. Le compte Auth ne devient jamais l'identifiant primaire du bénéficiaire.

### `staffDevices/{deviceId}`

Registre d'appareils d'équipe enrôlés : propriétaire/équipe, statut, date d'enrôlement, dernière activité, révocation. Aucun appareil partagé ou non maîtrisé ne reçoit par défaut le droit de conserver une file de données personnelles hors connexion.

### `learningRegistrationReceipts/{operationId}` et journal d'audit

Reçus d'opérations idempotentes et événements d'audit écrits côté serveur uniquement. Les reçus empêchent qu'une reprise réseau crée plusieurs dossiers pour la même opération. Le journal conserve l'acteur, l'appareil, l'heure serveur, l'action et le résultat, sans recopier inutilement les données personnelles.

## 3. Parcours d'inscription

1. L'agent se connecte avec son compte professionnel et son périmètre actif.
2. Le système vérifie ses droits et son périmètre de structure/mosquée.
3. L'agent recherche un dossier existant avec les informations minimales autorisées.
4. Le système présente des correspondances possibles; il ne fusionne jamais automatiquement deux personnes sur la seule base d'un nom ressemblant.
5. Si aucun dossier n'est confirmé, l'agent crée une nouvelle fiche avec un identifiant opaque aléatoire.
6. Le système enregistre l'auteur, l'appareil, la structure et le consentement applicable.
7. L'agent peut associer le dossier à un programme, une classe, un groupe ou une session.
8. Une carte ou un code de recherche peut être remis. Le QR code ne contient qu'un identifiant opaque ou un jeton de recherche révocable, jamais le nom, la date de naissance, le téléphone ou une donnée de dossier.

## 4. Synchronisation hors connexion

Chaque opération locale porte au minimum :
- un `operationId` UUID aléatoire stable, créé une seule fois ;
- un `deviceId` enrôlé ;
- un `actorUid` et le périmètre observé au moment de la saisie ;
- un type d'opération et une version de schéma ;
- une date locale informative et une date serveur attribuée à réception ;
- une charge utile minimale chiffrée localement.

États visibles : brouillon, en attente, en synchronisation, synchronisé, rejeté à corriger, conflit à examiner. Aucune opération ne doit disparaître silencieusement.

À la reconnexion, le client envoie les opérations au service serveur. Le serveur :
1. authentifie l'agent et revalide ses droits actuels ;
2. vérifie que l'appareil n'est pas révoqué ;
3. valide les champs, les limites et le périmètre ;
4. consulte le reçu `operationId` pour garantir l'idempotence ;
5. applique ou rejette l'opération avec un motif exploitable ;
6. écrit le reçu et l'événement d'audit dans une transaction cohérente ;
7. renvoie l'identifiant central et le statut de synchronisation.

Si les droits de l'agent ont été retirés entre la saisie et la synchronisation, l'opération est mise en échec contrôlé et soumise à un responsable; elle n'est pas acceptée au titre d'anciens droits.

## 5. Protection locale : condition préalable, pas simple option

La persistance Firestore IndexedDB existante n'est pas un coffre local chiffré et ne doit pas être réutilisée comme file d'inscription sensible.

Architecture recommandée pour les appareils Android d'équipe :
- coffre local chiffré AES-GCM avec clé de données propre à l'appareil ;
- clé protégée par Android Keystore via une intégration native auditée ;
- déverrouillage par authentification locale/PIN selon politique de l'ONG ;
- rotation et révocation de clé, expiration de la file et effacement à la déconnexion contrôlée ;
- aucun secret ou clé maître codé en dur dans le JavaScript ou l'APK.

Pour un navigateur web générique, une clé WebCrypto non extractible stockée dans le même profil ne suffit pas, à elle seule, à garantir la protection contre l'accès au profil, une compromission XSS ou un appareil partagé. Tant qu'une protection validée équivalente n'est pas disponible, l'inscription hors connexion avec données personnelles doit être limitée aux appareils enrôlés compatibles. Le parcours web en ligne reste utilisable par les agents autorisés.

L'effacement du coffre ne doit pas être annoncé comme réussi si une autre instance/onglet détient encore le stockage ou si l'opération échoue. La déconnexion doit afficher un état explicite et proposer une procédure de fermeture contrôlée des autres sessions locales.

## 6. Rapprochement des doublons

- Ne pas utiliser l'e-mail ou le téléphone comme clé obligatoire.
- Ne pas fusionner automatiquement sur nom seul.
- Utiliser des indices combinés et minimisés, selon les champs que l'ONG aura autorisés.
- Présenter les candidats de rapprochement à un agent autorisé.
- Toute fusion est une action explicite, journalisée, réversible selon une procédure contrôlée.
- Prévoir les homonymes, dates approximatives, changements de nom, fratries et saisies partielles.

Les index de rapprochement doivent éviter de publier des données personnelles en clair dans les identifiants ou les chemins de collection. Une solution de jetons HMAC calculés côté serveur pourra être étudiée si les champs et le modèle de menace le justifient.

## 7. Règles d'accès et séparation des responsabilités

Scopes à préciser : `learning.beneficiaries.create`, `learning.beneficiaries.read`, `learning.beneficiaries.update`, `learning.private.read`, `learning.beneficiaries.review`, `learning.beneficiaries.merge`, `learning.beneficiaries.export`.

Le droit de lire un dossier pédagogique ne doit pas donner automatiquement accès aux coordonnées ou aux informations du responsable légal. Les droits doivent être limités par rôle ET par structure/périmètre. Les écritures privilégiées passent par le backend; les clients ne peuvent pas s'attribuer un rôle ni écrire le journal d'audit.

Les exports, impressions, QR codes et cartes doivent appliquer les mêmes règles de minimisation et de traçabilité.

## 8. Tests obligatoires avant données réelles

- inscription sans e-mail, sans téléphone et sans compte Auth ;
- bénéficiaire sans smartphone personnel ;
- agent habilité, agent sans droit et agent révoqué ;
- appareil enrôlé, non enrôlé et révoqué ;
- mode avion, redémarrage, fermeture forcée et reprise ;
- synchronisation répétée d'une même opération sans doublon ;
- coupure réseau pendant l'envoi ;
- deux agents saisissant une même personne ;
- homonymes et rapprochement ambigu ;
- conflit de mise à jour ;
- perte d'appareil et révocation ;
- déconnexion avec file en attente et plusieurs onglets ;
- contrôle d'accès aux données privées et aux journaux ;
- absence de données personnelles dans les QR codes et identifiants visibles.

Aucun test de recette ne doit utiliser des dossiers réels avant validation de la protection locale et des règles d'accès.

## 9. Découpage de réalisation proposé

**Étape A — cadrage :** recevoir et confronter le cahier des charges initial, valider les champs, les finalités, les rôles, les structures et les consentements.

**Étape B — registre central en ligne :** modèle de données, backend de création, identifiants opaques, règles d'accès, audit, recherche et rapprochement manuel. Aucun offline sensible à ce stade.

**Étape C — coffre Android :** enrôlement des appareils, chiffrement, file locale visible, révocation et effacement testés.

**Étape D — synchronisation :** idempotence, contrôle serveur, gestion des rejets et conflits, tests multi-agents.

**Étape E — pilote contrôlé :** données fictives, quelques agents habilités et appareils gérés, puis validation institutionnelle avant généralisation.

## 10. Points à confirmer avec le cahier des charges initial

- liste exacte des champs et pièces éventuelles ;
- définition des bénéficiaires, apprenants, parents/tuteurs et personnes accompagnées ;
- structures, mosquées, classes, groupes et zones d'intervention ;
- règles d'âge, consentement et traitement des mineurs ;
- droits du siège, des responsables de programme, enseignants et agents terrain ;
- processus d'édition, fusion, archivage et suppression ;
- politique de conservation, export, sauvegarde et hébergement ;
- appareils disponibles et capacité de gestion/sécurisation par l'ONG.

**Conclusion :** cette architecture préserve une plateforme institutionnelle complète. Elle adapte les canaux de collecte aux réalités de terrain sans transformer les limites des appareils en limites fonctionnelles, et sans exposer les données des bénéficiaires.
