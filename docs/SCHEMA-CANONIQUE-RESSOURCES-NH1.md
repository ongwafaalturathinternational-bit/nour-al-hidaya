# Schéma canonique proposé — ressources pédagogiques NH-1

**Statut : proposition de référence à faire valider par WAT.**  
**Portée :** contrat logique et règles de cohérence pour préparer l'API; ce document ne crée aucune collection Firestore et n'autorise aucune lecture/écriture réelle.

## 1. Décisions de conception

L'audit du dépôt ne permet pas d'affirmer qu'il existe déjà un registre canonique des sites ou des mosquées. Le modèle ne doit donc pas inventer une hiérarchie « site > mosquée > groupe », ni détourner le champ texte `mosque` du profil utilisateur ou le champ libre `location` des activités.

Le schéma proposé adopte les décisions suivantes :

1. **Une structure est l'unité d'organisation de référence.** Elle peut représenter une mosquée, un centre, une salle, un établissement ou un lieu partenaire. Son type est explicite; une mosquée est donc un type de structure, pas une collection imposée.
2. **Un site est facultatif et distinct.** Il représente un campus, une zone ou une implantation opérationnelle seulement si WAT en a réellement besoin. Il n'est pas déduit d'une adresse ou d'un nom de mosquée.
3. **Un groupe pédagogique est une entité propre**, rattachée à un programme et à une structure. Il peut référencer un site si ce dernier est défini. Le groupe ne contient pas la liste des apprenants comme source de vérité.
4. **L'inscription relie le bénéficiaire à son parcours**, avec programme, période, groupe et structure. C'est le lien d'inscription qui fait foi pour la participation à une session donnée.
5. **Le serveur résout toutes les références.** Le navigateur ne peut pas fournir lui-même des identifiants de structure, de programme ou de site pour élargir son périmètre.
6. **Aucune hiérarchie ou collection existante n'est présumée compatible.** Une migration depuis `groups`, `programs` ou toute autre collection exige un mapping explicite et validé.

## 2. Collections cibles proposées

### `learningStructures/{structureId}`

Registre des lieux/structures utilisés par Nour Al-Hidaya.

Champs proposés :
- `name` : nom officiel ou nom opérationnel;
- `type` : `mosque | center | school | partner_site | other`;
- `status` : `active | inactive | archived`;
- `parentStructureId` : facultatif, uniquement si WAT valide une relation parent-enfant;
- `communeCode` ou `administrativeArea` : facultatif et normalisé si nécessaire;
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.

Ne pas stocker de coordonnées précises ou d'informations privées sans finalité documentée. Un nom de structure n'est pas un identifiant : les références utilisent toujours `structureId`.

### `learningSites/{siteId}` (facultatif)

À créer uniquement si WAT distingue réellement les sites des structures.

Champs proposés :
- `name`;
- `status`;
- `structureIds[]` ou relation inverse, après choix d'une seule stratégie;
- métadonnées de gestion et horodatages.

Ne pas créer cette collection dans le premier incrément si une structure suffit à représenter les lieux actuels.

### `learningGroups/{groupId}`

Groupe ou cohorte pédagogique.

Champs proposés :
- `name`;
- `programId` : référence vers `programs/{programId}` uniquement après vérification de compatibilité du programme existant;
- `structureId` : référence vers `learningStructures/{structureId}`;
- `siteId` : facultatif, uniquement si le registre des sites est validé;
- `status` : `active | paused | closed`;
- `periodId` : période pédagogique, si elle est modélisée;
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.

Les formateurs et responsables ne sont pas déclarés par simple texte dans ce document. Leur affectation relève de `learningStaffAssignments`. Les apprenants ne sont pas enregistrés en tableau dans le groupe : leurs inscriptions constituent la relation.

### `learningEnrollments/{enrollmentId}`

Relation métier entre un bénéficiaire et son parcours.

Champs proposés :
- `beneficiaryId`;
- `programId`;
- `structureId`;
- `groupId` : facultatif pendant une phase d'affectation;
- `siteId` : facultatif;
- `periodId`;
- `status` : `pending | active | paused | completed | withdrawn | rejected`;
- `startsAt`, `endsAt` : dates métier facultatives;
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy`;
- `reviewStatus` et `reviewedBy/reviewedAt` si validation administrative requise.

Cohérence obligatoire : si `groupId` est renseigné, le serveur vérifie que le groupe est actif et que ses `programId`, `structureId` et `siteId` éventuel concordent avec l'inscription. Le client ne peut pas contourner cette vérification.

### `learningStaffAssignments/{uid}`

Affectations professionnelles de l'utilisateur, avec plusieurs mandats possibles.

- `active`;
- `assignments[]` : `assignmentId`, `active`, `scopeGrants[]`, `validFrom`, `validUntil`, `structureIds[]`, `siteIds[]` facultatif, `groupIds[]` facultatif, `programIds[]` facultatif.

Chaque mandat doit avoir un identifiant stable et unique. Les listes vides ne signifient jamais « accès global ». Un accès national/global, s'il est nécessaire, doit être représenté par une autorisation explicite distincte, approuvée et testée; ne pas l'inférer d'un tableau absent ou vide.

**Compatibilité avec le contrôle d'accès actuel :** le helper existant attend encore `siteIds`, `mosqueIds`, `groupIds`, `programIds`. Ce contrat n'est pas compatible avec le présent modèle neutre `structureIds`. Il doit rester non branché tant que le résolveur et la politique d'affectation n'ont pas été adaptés et testés. Ne pas ajouter artificiellement `mosqueId` à chaque document.

## 3. Références et source de vérité

| Information | Source proposée | Règle |
|---|---|---|
| Identité/dossier | `learningBeneficiaries` | indépendante du compte Auth |
| Données personnelles | `learningBeneficiaryPrivate` | accès distinct et plus restreint |
| Programme | `programs` existant, après audit de ses champs | ne pas dupliquer sans décision |
| Structure / mosquée | `learningStructures` | type explicite, identifiant opaque |
| Site | `learningSites`, facultatif | pas de site déduit automatiquement |
| Groupe | `learningGroups` | rattachement structure + programme |
| Participation | `learningEnrollments` | relation datée et historisée |
| Affectation du personnel | `learningStaffAssignments` | serveur uniquement |
| Séances / présences / résultats | collections `learning*` dédiées | références résolues côté serveur |

Les collections existantes `activities` et `attendance` restent des modules WAT distincts. Leur champ `location` libre ne peut pas servir de référence de structure. Un raccordement ultérieur nécessitera une table de correspondance validée, sans réécrire les données historiques automatiquement.

## 4. Contrat de résolution serveur

Les routes ne doivent pas recevoir un objet de périmètre construit par le navigateur. Elles reçoivent uniquement les identifiants métier nécessaires, puis le serveur :

1. authentifie l'acteur et vérifie son statut;
2. charge le groupe ou l'inscription depuis Firestore;
3. charge le programme et la structure référencés;
4. vérifie l'état actif, les périodes et la cohérence des références;
5. résout le contexte canonique `{ groupId, programId, structureId, siteId? }`;
6. vérifie qu'une affectation active accorde le scope demandé et couvre toutes les dimensions résolues;
7. refuse si une référence manque, est inactive, incohérente ou hors périmètre;
8. journalise l'opération sensible côté serveur.

Le contrôle est fail-closed : aucun identifiant fourni par le client ne remplace une référence absente dans les documents de confiance.

## 5. Index, contraintes et intégrité

Firestore ne fournit pas de contraintes relationnelles. L'API doit donc garantir :
- unicité logique d'une inscription active selon la combinaison validée par WAT (bénéficiaire, programme, période, éventuellement groupe);
- cohérence groupe/programme/structure/site;
- absence de références vers des entités archivées/inactives pour une nouvelle inscription;
- idempotence des opérations de création et de synchronisation;
- suppression logique/archivage selon une politique approuvée, pas de suppression en cascade improvisée;
- journalisation des changements de structure, groupe, inscription et affectation;
- validation stricte des identifiants, enums, dates et tailles de tableaux.

Les opérations multi-documents doivent utiliser une transaction ou un mécanisme compensatoire documenté. Un journal d'audit isolé après l'écriture métier n'est pas une garantie d'atomicité.

## 6. Sécurité et confidentialité

- Toutes les collections `learning*` restent refusées par défaut dans les règles Firestore.
- Aucun droit `learning.*` n'est activé par ce document.
- Les clients ne créent ni ne modifient les affectations, les structures de référence, les décisions de validation ou les journaux d'audit.
- L'accès aux dossiers privés est distinct de la consultation pédagogique.
- Les mineurs suivent le parcours de représentant légal validé par WAT.
- Les exports et recherches doivent appliquer le même périmètre que les fiches.
- Aucun accès global n'est accordé implicitement à un rôle ou à une liste vide.

## 7. Décisions institutionnelles à obtenir avant implémentation

1. Une mosquée est-elle toujours une structure, ou existe-t-il des mosquées composées de plusieurs sites?
2. WAT a-t-elle besoin d'un registre séparé des sites dès le lancement?
3. Les programmes pédagogiques sont-ils ceux de la collection WAT `programs`, ou faut-il un catalogue Nour Al-Hidaya séparé?
4. Une inscription peut-elle exister sans groupe, et qui l'affecte ensuite?
5. Quelle est la clé métier d'unicité d'une inscription pour une période?
6. Quels rôles peuvent consulter les structures, groupes et inscriptions de plusieurs communes?
7. Quelle règle autorise explicitement un périmètre national ou transversal?

## 8. Ordre d'implémentation sécurisé

- **A — validation :** faire approuver les décisions ci-dessus et confronter les champs au cahier des charges initial.
- **B — contrats purs :** définir schémas JSON, validateurs et tests unitaires sans connexion Firestore.
- **C — résolveur serveur :** lire les références de confiance et produire le contexte canonique; tests de références absentes, inactives et incohérentes.
- **D — autorisation :** remplacer les dimensions `mosqueIds` par `structureIds` après validation; exiger un match de toutes les dimensions applicables.
- **E — routes :** brancher les contrôles seulement après validation des collections et règles; les routes restent fermées tant que configuration et règles ne sont pas prêtes.
- **F — migration :** importer des données uniquement après mapping, sauvegarde, test de migration et validation WAT.

## 9. État et limites

Ce schéma est une proposition construite à partir des documents et règles présents dans le dépôt. Il ne certifie pas l'existence de collections Firestore, ni la présence de documents réels. Aucun document, règle, secret, compte, scope ou environnement n'a été modifié par cette spécification. Le helper actuel qui attend `siteId/mosqueId/programId` reste isolé et ne doit pas être présenté comme une autorisation prête pour la production.


## 10. Dossier bénéficiaire et données privées — primitives préparatoires

- `learningBeneficiaries/{beneficiaryId}` porte un statut de dossier (`active | inactive | archived`) sans supposer que le bénéficiaire possède un compte Firebase Auth.
- `learningBeneficiaryPrivate/{beneficiaryId}` est un document distinct; il doit contenir le même `beneficiaryId` et un statut valide. Une divergence ou une absence entraîne un refus.
- La primitive de consultation exige un `enrollmentId` fourni comme sélecteur, puis le serveur résout l'inscription et vérifie qu'elle référence exactement le bénéficiaire demandé. L'identifiant transmis par le client ne prouve jamais l'autorisation.
- Le périmètre est hérité de l'inscription canonique (programme, structure, site et groupe éventuels) et comparé à l'affectation du membre du personnel.
- Les données privées exigent un scope séparé : `learning.beneficiaries.private.read`. Ce scope doit être présent à la fois dans `staffAccess` et dans l'affectation retenue.
- Les résolveurs ne renvoient aucun champ personnel privé : ils valident uniquement le lien et le statut. Une route future devra charger/serialiser les champs privés seulement après autorisation.
- Ces helpers et leurs tests restent isolés; ils ne branchent aucune route, n'activent aucun scope réel et ne modifient aucune règle Firestore.
- Limite assumée : l'accès est lié à une inscription active identifiée. La consultation transversale d'un dossier sans inscription active, ou la recherche multi-inscriptions, nécessite une décision de modèle et un mécanisme serveur dédié; aucun accès élargi n'est inféré.


## 11. Profil pédagogique — primitive de consultation

- `learningProfiles/{beneficiaryId}` est séparé du document privé `learningBeneficiaryPrivate/{beneficiaryId}`. Le profil pédagogique ne doit pas devenir un doublon des coordonnées, contacts ou pièces justificatives.
- Le contrat minimal validé par le code préparatoire exige `beneficiaryId`, `status` (`active | inactive | archived`) et, si le profil est lié à une seule inscription, un `enrollmentId` concordant.
- Le résolveur exige un bénéficiaire actif et une inscription active; le profil doit correspondre au même bénéficiaire et, si renseigné, à la même inscription.
- Le scope de consultation est distinct : `learning.profiles.read`. Il doit être accordé dans le registre du personnel et dans une affectation active couvrant le périmètre canonique.
- Les attributs pédagogiques détaillés (langue, niveaux de lecture/arabe/coran, objectifs, évaluations) ne sont pas imposés ici : leurs taxonomies et règles de visibilité doivent être validées par WAT avant de les ajouter.
- Les helpers sont isolés; aucune route, donnée Firestore, règle ou permission réelle n'est activée.
