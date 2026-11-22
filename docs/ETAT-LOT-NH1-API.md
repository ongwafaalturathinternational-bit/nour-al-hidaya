# NH-1 — squelette API et préparation de la connexion sécurisée

Date : 22 novembre 2026  
Branche : `feature/nour-central-management-foundation`  
Statut : préparation de code uniquement ; aucun déploiement.

## Livré

- Worker NH-1 fermé par défaut : routes non configurées en 503, méthodes non autorisées en 405.
- Contrat de configuration serveur dans `workers/learning-api/src/config.js`.
- Cible staging explicitement verrouillée sur `wat-connect-staging`; le projet production `wat-connect` est rejeté.
- Vérification de présence/format des variables de configuration, de l'identité de service, de la clé PEM et du secret Turnstile.
- Normalisation des retours à la ligne PEM ; diagnostics sans divulgation des valeurs secrètes.
- Guide `docs/CONFIGURATION-SERVEUR-NH1-STAGING.md` pour la future configuration Cloudflare/Firebase.
- Primitives cryptographiques isolées : assertion JWT de compte de service pour OAuth Google et vérification RS256 des Firebase ID tokens (audience, issuer, UID, expiration, émission et `auth_time`).
- Cache JWKS Google piloté par `Cache-Control`, avec actualisation si un `kid` inconnu apparaît et contrôle renforcé des claims Firebase.
- Adaptateur REST Firestore limité au projet staging, à la base `(default)` et à une liste explicite de collections WAT/Nour.
- Lectures, créations sans écrasement et mises à jour avec précondition d'existence et masque de champs ; validation stricte des chemins et des valeurs.
- Réutilisation temporaire du jeton OAuth en mémoire, sans journalisation du jeton.
- Autorisation d'équipe côté serveur : vérification du Firebase ID token, e-mail vérifié, lecture du document `staffAccess/{uid}`, état actif et scope exact.
- Validation Turnstile côté serveur : Siteverify obligatoire, token à usage unique, action et hostname exacts, fenêtre de validité de cinq minutes, refus en cas d'indisponibilité.
- Tests dédiés OAuth, jetons Firebase, Firestore, droits d'équipe et Turnstile ; clés RSA temporaires générées uniquement en mémoire.
- Commande `npm run test:learning-api` étendue à toute la suite NH-1.

## Tests

Suite locale précédemment exécutée : 15 tests réussis, 0 échec (Worker et configuration).

Suites ajoutées :
- `learning-api-google-auth.test.js` : signature OAuth, réponses mal formées, signature Firebase, verrouillage projet et expiration.
- `learning-api-firestore.test.js` : collection autorisée, encodage Firestore, précondition de mise à jour, conflits et cache OAuth.
- `learning-api-staff-auth.test.js` : authentification, e-mail vérifié, état actif et scopes.
- `learning-api-turnstile.test.js` : validation Siteverify, action, hostname, fraîcheur, réseau et IP d'origine.

La suite complète est exécutée automatiquement par GitHub Actions sur Node.js 22. Un premier passage a détecté une attente de test devenue obsolète après l'ajout du support timestamp Firestore ; elle a été corrigée. Sur le commit `886cec33072b5a7991836c0cf508a074e79929c1`, les contrôles de syntaxe ont réussi et **41 tests sur 41 ont réussi, 0 échec**.

## Limites importantes

Le validateur, les primitives OAuth/ID-token, l'adaptateur Firestore et le contrôle des scopes sont des modules isolés : ils ne sont pas encore raccordés au chemin d'exécution du Worker. Aucun appel réel à Google ou Firestore n'a été effectué. La validation Turnstile est codée en module isolé, mais n'est pas encore raccordée au Worker. Aucune limitation de débit, idempotence transactionnelle, journalisation métier ou inscription n'est implémentée.

Les routes restent donc toutes désactivées. Même si des variables sont présentes, le service ne doit pas accepter d'inscription.

## Conditions avant activation

1. Créer une identité de service dédiée au seul projet staging et valider ses privilèges minimaux.
2. Enregistrer les secrets dans le magasin Cloudflare du Worker staging, jamais dans Git ou dans l'APK.
3. Valider définitivement le modèle de collections/champs NH-1 et les scopes pédagogiques avec les règles Firestore existantes.
4. Raccorder les modules OAuth, ID-token, staffAccess et Firestore au Worker, sans ouvrir les routes avant les contrôles complets.
5. Raccorder Siteverify au parcours public, avec action et hostnames staging dédiés.
6. Ajouter limites de débit, création idempotente transactionnelle, audit et tests d'intégration.
7. Effectuer une revue de sécurité et présenter les résultats avant tout déploiement.

Aucune configuration Wrangler, règle Firestore, donnée réelle, identité IAM ou facturation n'a été modifiée. Aucun Worker n'a été téléversé ou déployé.

## Harmonisation du registre central — 22 novembre 2026

- La décision technique NH-1 fixe maintenant les noms canoniques préfixés : `learningBeneficiaries`, `learningBeneficiaryPrivate`, `learningEnrollments`, `learningRegistrationReceipts` et `learningAuditLogs`.
- L'adaptateur Firestore limite sa liste d'autorisation aux collections `learning*` et à `staffAccess`; les anciens alias génériques comme `beneficiaries` sont refusés.
- Les tests Firestore ont été adaptés pour vérifier le chemin canonique et le refus des alias génériques.
- Les documents de plan et d'architecture ont été harmonisés avec cette nomenclature.
- Les champs définitifs du dossier restent à valider à partir du cahier des charges initial. Aucun schéma de données personnelles n'est inventé à cette étape.
- Les routes restent en 503. Aucun appel Firestore réel, aucune règle distante modifiée et aucun déploiement.
- Cette harmonisation vient d'être poussée sur la branche de travail; la validation CI de ce dernier changement reste à confirmer.

## Vérification des droits d'équipe et du portail — 22 novembre 2026

- Audit des règles Firestore WAT Connect existantes : `staffAccess` est en lecture individuelle seulement ; aucun scope `learning.*` n'existe encore dans les règles héritées.
- Scopes existants confirmés : `programs.*`, `activities.*`, `attendance.*`, `members.*`, `projects.*`, `volunteers.*`.
- Le raccourci Nour Al-Hidaya dans le portail est désormais affiché uniquement aux comptes d'équipe possédant un scope `learning.*` ; ce filtrage UI ne remplace pas les contrôles serveur.
- Les tests d'autorisation couvrent les scopes granulaires `learning.beneficiaries.read` et `learning.beneficiaries.private.read`. La revue des inscriptions en attente utilise le scope préparatoire distinct `learning.enrollments.review`; aucun de ces scopes n'est encore attribué dans les comptes d'équipe.
- L'audit `docs/AUDIT-PERMISSIONS-NH1.md` confirme que la matrice de rôles, les scopes NH et les périmètres site/mosquée/groupe/programme doivent être validés avant raccordement des routes.
- Aucun accès réel NH-1 n'est activé ; les routes restent en 503.

## Compatibilité avec le provisionnement des comptes d'équipe — 22 novembre 2026

- Audit statique de la PR #21 ajouté dans `docs/AUDIT-COMPATIBILITE-PR21-NH1.md`.
- Confirmation : le catalogue `ALLOWED_SCOPES` de `functions/index.js` et les choix de `staff-accounts.html` ne contiennent aucun scope `learning.*`.
- La PR #21 n'enregistre pas d'affectations pédagogiques `learningStaffAssignments/{uid}` et ne limite pas les droits NH par site/mosquée/groupe/programme.
- La PR #21 reste une fondation réutilisable pour le provisionnement central, mais elle n'est pas compatible NH en l'état. Aucun changement n'a été poussé sur sa branche.
- Décision : ne pas fusionner les PR #21 et #22 en l'état. Préparer une extension coordonnée après validation du modèle d'affectation et des responsabilités d'administration.
- Les routes NH restent fermées en 503 ; aucun scope, compte, affectation, secret, règle distante ou déploiement n'a été créé ou activé.

## Primitive de contrôle des affectations — 22 novembre 2026

- Ajout de `workers/learning-api/src/assignment-policy.js` : évaluation pure et fail-closed d'une affectation NH, avec vérification du scope exact, de l'état actif, des dates de validité et des identifiants explicites de site/mosquée/groupe/programme présents dans le contexte de la ressource.
- Une affectation vide, un périmètre absent, un identifiant mal formé, un scope non attribué ou une affectation expirée entraîne un refus. Aucun joker ni accès global implicite n'est accepté.
- Ajout de `tests/learning-api-assignment-policy.test.js` couvrant l'autorisation concordante, les scopes absents, l'inactivité, les dates, les accès inter-sites/inter-groupes, les périmètres vides et les valeurs mal formées.
- **Limite importante :** cette primitive est isolée et non raccordée à `staff-auth.js` ni aux routes Worker. Elle ne résout pas encore les relations hiérarchiques entre identifiants (par exemple déterminer qu'une mosquée appartient à un site) ; les identifiants comparés doivent provenir d'une lecture serveur fiable. Les routes restent en 503.
- Aucun compte, document Firestore, scope réel, secret, règle distante ou déploiement n'a été modifié. La CI du commit `ca19753c0b6fe9dd57ebe702f195c4e4e3e1e9fd` n'est pas encore confirmée.

## Composition du contrôle des affectations — 22 novembre 2026

- Ajout de `workers/learning-api/src/learning-authorization.js` : composition de l'authentification et du scope d'équipe (`staffAccess/{uid})) avec la lecture de l'affectation pédagogique (`learningStaffAssignments/{uid})).
- L'accès n'est accordé que si le compte d'équipe est déjà autorisé pour le scope demandé **et** si au moins une affectation active, datée et dotée du même scope correspond au périmètre de la ressource.
- L'indisponibilité du registre d'affectations, un document absent/mal formé, une affectation expirée ou un périmètre discordant entraînent un refus.
- Ajout de `tests/learning-api-learning-authorization.test.js` pour vérifier l'intersection des droits, les accès inter-sites, l'absence d'affectation et le refus des données privées sans grant explicite.
- **Frontière de confiance :** l'argument `resource` de cette fonction doit provenir d'une lecture Firestore effectuée côté serveur. Il ne doit jamais être construit à partir de `siteId`, `groupId` ou autres champs envoyés par le navigateur.
- **Non raccordé :** le Worker continue de répondre 503 sur les routes d'inscription. Aucun endpoint n'utilise encore cette fonction ; aucune règle Firestore ni aucun compte réel n'a été modifié. Les tests doivent être exécutés par la CI avant de considérer le code validé.

- Ajustement après revue du helper composé : le même client Firestore de confiance est désormais transmis au contrôle `staffAccess` et à la lecture `learningStaffAssignments`. Un test de non-régression vérifie les deux lectures successives avec ce client partagé.

## Résolution serveur des ressources et journal d'audit — 22 novembre 2026

- Le contrôle d'accès a été renforcé : l'appelant transmet désormais uniquement un identifiant de groupe. Le Worker lit lui-même `learningGroups/{groupId}` dans Firestore et récupère les identifiants de site, mosquée et programme depuis ce document ; les identifiants de périmètre envoyés par le navigateur ne sont pas utilisés.
- La politique compare ensuite les quatre dimensions (groupe, site, mosquée, programme) aux listes explicitement attribuées à l'agent. Ressource absente, liens incomplets/mal formés, registre d'affectations indisponible ou discordance : refus fermé.
- **Hypothèse de schéma à confirmer :** cette lecture attend les champs texte `siteId`, `mosqueId` et `programId` sur `learningGroups`. Le modèle de données NH n'est pas encore approuvé et aucun document réel n'a été lu ; ne pas activer ce helper avant confirmation de ces champs et des relations canoniques.
- Ajout de `learning-audit.js` : écriture d'événements minimaux côté serveur dans `learningAuditLogs`, avec acteur, action autorisée, cible opaque, scope exact, résultat, horodatage serveur et périmètre. Les noms, téléphones, coordonnées et contenus de dossiers ne sont pas recopiés.
- Tests ajoutés pour la résolution de ressource, les accès inter-sites, le refus des données privées sans grant, la traçabilité minimale et l'échec fermé si le journal est indisponible.
- **Limite transactionnelle :** l'adaptateur Firestore actuel ne fournit pas encore de transaction combinant écriture métier et audit. Le helper d'audit n'est pas encore raccordé aux routes. Avant d'activer les décisions ou modifications sensibles, il faudra garantir l'écriture d'audit avant l'action et mettre en place une transaction/outbox cohérente pour éviter une opération validée sans trace finale.
- Aucun endpoint n'a été activé ; les routes demeurent en 503. Aucun compte, affectation, document réel, règle distante, secret ou déploiement n'a été modifié.

- Le contrôle d'accès reçoit uniquement `groupId` et charge le document `learningGroups/{groupId}` côté serveur. Le test d'intégration unitaire vérifie l'ordre des lectures : `staffAccess`, groupe canonique, puis affectations. Le vérificateur de jeton est explicitement transmis au contrôle d'équipe.
- La suite `npm run test:learning-api` découvre automatiquement les nouveaux fichiers `tests/learning-api-*.test.js`, dont les tests de contrôle de ressource et d'audit. Le workflow vérifie également les fichiers importés par les tests.
- Le workflow déclenche une exécution sur chaque push de la branche de travail ; l'outil de consultation disponible ici ne remonte que les exécutions déclenchées par pull request. Une réponse vide ne permet donc pas de conclure que le workflow push n'a pas démarré.

## Durcissement complémentaire des affectations et de l'audit — 22 novembre 2026

- Une affectation pédagogique doit désormais posséder un `assignmentId` opaque et valide ; une affectation sans identifiant ou avec un identifiant mal formé est refusée.
- Le journal d'audit recoupe maintenant le scope demandé avec la liste `principal.scopes` du compte authentifié et exige l'identifiant de l'affectation utilisée. Un objet d'autorisation incomplet ou incohérent ne peut pas produire de trace réputée fiable.
- Tests ciblés exécutés localement sur les deux modules concernés : **13 tests réussis, 0 échec**.
- La validation complète GitHub Actions de la branche reste à confirmer. Les routes demeurent désactivées en 503 ; aucune donnée, règle distante, permission ou configuration de production n'a été modifiée.


## Audit du schéma des groupes et tests négatifs complémentaires — 22 novembre 2026

- Recherche dans les fichiers et le code indexés du dépôt : aucune définition canonique exploitable de learningGroups, ni source confirmant les champs siteId, mosqueId et programId, n'a été retrouvée.
- Le helper reste donc volontairement non raccordé. Son hypothèse de schéma est explicite et ne doit pas être traitée comme un modèle validé.
- Ajout de tests négatifs couvrant : affectation mal formée suivie d'une affectation valide, registre assignments de type incorrect et groupe dépourvu d'un lien de périmètre requis.
- Ces tests viennent d'être ajoutés au dépôt ; leur exécution locale et la CI du nouveau commit restent à confirmer. Aucun résultat de test n'est revendiqué à ce stade.
- Prochaine dépendance : retrouver le référentiel réel des sites/mosquées/groupes/programmes dans le projet WAT Connect source ou faire valider formellement le schéma cible avant de modifier le résolveur.


## Audit approfondi du modèle des ressources — 22 novembre 2026

- Vérification croisée de `MODELE-DONNEES-ET-PERMISSIONS.md`, `ARCHITECTURE-INSCRIPTION-UNIVERSELLE.md`, `DECISION-TECHNIQUE-NH1.md`, `ARCHITECTURE-WAT-CONNECT.md`, `LOT7-ACTIVITES-PRESENCES.md` et `firestore.rules`.
- Constat : le modèle historique propose `groups/{groupId}` avec `name`, `mosqueId`, `teacherUids`, `learnerIds`, mais il est explicitement non validé. NH-1 prévoit plutôt un lien programme/site/structure/groupe dans `learningEnrollments`; aucun schéma final de site, mosquée ou groupe n'est défini.
- Les modules WAT existants confirment `programs`, `projects`, `activities` et `attendance`. Les activités ont un lieu textuel et un rattachement projet facultatif; ce champ ne constitue pas un identifiant de site ou de mosquée.
- Conclusion : l'hypothèse `learningGroups/{groupId}` avec `siteId`, `mosqueId`, `programId` est non fondée et reste bloquante. Aucun basculement vers l'ancienne collection `groups` n'est fait car elle n'est pas davantage validée.
- Audit détaillé enregistré dans `docs/AUDIT-SCHEMA-RESSOURCES-NH1.md`, avec sources, différences, conséquence pour le contrôle d'accès et décisions nécessaires.
- Le helper demeure isolé et les routes restent en 503. Aucune donnée réelle, règle Firestore, permission, secret ou déploiement n'a été modifié.


## Schéma canonique proposé des ressources — 22 novembre 2026

- Création de `docs/SCHEMA-CANONIQUE-RESSOURCES-NH1.md`.
- Le modèle propose une entité neutre `learningStructures/{structureId}` avec un type explicite (mosquée, centre, école, partenaire, autre), au lieu d'imposer une hiérarchie site/mosquée non prouvée.
- `learningSites` est facultatif et ne sera créé que si WAT confirme un besoin métier distinct.
- `learningGroups` référence un programme et une structure; les apprenants sont reliés au groupe par `learningEnrollments`, pas par une liste redondante dans le groupe.
- `learningEnrollments` devient la relation métier datée entre bénéficiaire, programme, structure, groupe facultatif, site facultatif et période.
- Le modèle d'affectation proposé utilise `structureIds[]` au lieu de supposer `mosqueIds[]`. Le helper actuel n'est donc pas compatible et reste explicitement isolé; il faudra adapter et tester sa politique avant tout raccordement.
- Contrat serveur détaillé : résolution des références depuis Firestore, cohérence groupe/programme/structure/site, refus fermé, idempotence et journalisation.
- Sept arbitrages institutionnels sont listés avant implémentation. Aucune collection, règle Firestore, permission, donnée, secret ou environnement n'a été modifié.
- Aucun test ni résultat CI n'est revendiqué pour ce changement documentaire. Routes toujours fermées en 503; PR maintenue en brouillon.


## Validateurs canoniques et résolveur serveur — 22 novembre 2026

- Ajout de `workers/learning-api/src/learning-schema.js` : validateurs purs pour structures, sites facultatifs, groupes, inscriptions et registres d'affectations.
- Ajout de `workers/learning-api/src/learning-resource-resolver.js` : résolution côté serveur d'un groupe ou d'une inscription à partir de références Firestore de confiance; contrôle des états actifs, des liens structure/site/programme et de la concordance entre groupe et inscription.
- Le résolveur n'accepte pas d'objet de périmètre construit par le navigateur. Il ne crée ni ne modifie de document.
- Le client Firestore autorise désormais la lecture seule de `programs`, `learningStructures` et `learningSites` pour la résolution; ces collections restent interdites en création et mise à jour par cet adaptateur.
- La politique d'affectation utilise maintenant `structureIds[]` au lieu de l'hypothèse `mosqueIds[]`. Le helper historique `learning-authorization.js` demeure isolé et n'est pas raccordé au nouveau résolveur.
- Tests ajoutés : validation des contrats, refus des références invalides/inactives, concordance inscription-groupe et séparation lecture/écriture des collections de référence.
- Le workflow NH-1 syntax-check couvre les nouveaux modules.
- Un premier passage CI a révélé une erreur de syntaxe dans la déclaration de la liste lecture seule; elle a été corrigée. Le dernier commit est en cours de validation. Aucun résultat de test réussi n'est revendiqué tant que la CI du HEAD final n'est pas terminée.
- Routes toujours en 503. Aucun compte, document réel, scope réel, règle Firestore distante, secret ou déploiement n'a été modifié.


## Moteur d'affectation durci — 22 novembre 2026
- La politique vérifie désormais la correspondance exacte des dimensions de périmètre présentes dans le contexte canonique : site, structure, groupe et programme. Une dimension présente d'un seul côté entraîne un refus; aucune liste absente/vide ne vaut accès global.
- Les dates de validité et le scope sont validés strictement; les horodatages doivent être UTC explicites. L'horloge est injectable pour les tests.
- Le registre complet `learningStaffAssignments/{uid}` est validé avant toute décision. Un enregistrement mal formé entraîne un refus global plutôt qu'une sélection partielle parmi des affectations potentiellement corrompues.
- CI NH-1 : **78 tests réussis, 0 échec** — [run #44978897104](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44978897104), commit `2a41942b1b643bf3e23fa7d47bca96f25318780d`.
- Le moteur reste isolé des routes. Le schéma de ressources et la matrice des rôles/scopes doivent être validés par WAT; aucune règle distante, donnée, affectation réelle, permission ou déploiement n'a été modifié.


## Résolution canonique branchée au contrôle d'accès — 22 novembre 2026
- `authorizeLearningGroup` utilise désormais `resolveLearningGroup` : groupe, structure, programme et site actif sont vérifiés depuis Firestore avant l'évaluation de l'affectation.
- Ajout de `authorizeLearningEnrollment`, fondé sur `resolveLearningEnrollment`, avec vérification de l'inscription active et cohérence programme/structure/site/groupe.
- Les deux contrôles partagent le même moteur : scope explicite, registre complet validé, dates de validité et correspondance stricte de chaque dimension de périmètre. Le contexte transmis par le navigateur n'est pas utilisé.
- CI NH-1 : **80 tests réussis, 0 échec** — [run #44979263779](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44979263779), commit `a3a5379d8169c89bae460e372d093e6fe5dd2e61`.
- Ces fonctions restent des primitives isolées : aucune route métier n'est activée, aucune règle distante ni donnée Firestore n'a été modifiée.


## Mise à jour — profils pédagogiques et dossiers bénéficiaires (22 novembre 2026)

- Ajout de `learningProfiles/{beneficiaryId}` : validation du lien exact au bénéficiaire, statut actif et lien optionnel à l'inscription.
- Le résolveur du profil exige un bénéficiaire actif et une inscription active; il n'accepte aucun périmètre fabriqué par le client.
- Ajout du scope dédié `learning.profiles.read` et de `authorizeLearningProfile` qui réutilise le contrôle strict des affectations.
- Les données privées restent dans `learningBeneficiaryPrivate` et sous le scope séparé `learning.beneficiaries.private.read`. Le résolveur privé est appelé seulement après autorisation.
- Aucun attribut de niveau, langue ou objectif pédagogique n'est inventé; la taxonomie attend une validation WAT.
- CI du commit `f2fd1b97fbc760a4a468d315db879c7c2d074788` : NH-1 **88 tests réussis, 0 échec** — [workflow #44980249993](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44980249993).
- Règles Firestore : **succès** — workflow #44981201212. Compilation et tests des règles terminés avec succès.
- APK Android staging : **succès** — workflow #44981201166. Génération, synchronisation, construction et publication de l'APK de test terminées avec succès.
- Aucune route métier activée, aucun scope réel attribué, aucune règle distante, donnée réelle ou déploiement de production modifié. PR #22 reste ouverte en brouillon.


## Revue des inscriptions en attente — 22 novembre 2026

- Ajout d’un résolveur dédié aux inscriptions pending; le résolveur des inscriptions actives continue de refuser les inscriptions en attente.
- Le résolveur de revue contrôle les mêmes références Firestore canoniques (programme, structure, site et groupe éventuels) et leur cohérence.
- Ajout de authorizeLearningEnrollmentReview avec le scope préparatoire distinct learning.enrollments.review et le contrôle du périmètre complet de l’affectation.
- Les tests couvrent la séparation pending/active, les références absentes et le refus d’une affectation hors périmètre.
- Le scope n’est attribué à aucun compte et aucune route n’est activée. La décision sur la clé d’unicité anti-doublon reste à valider par WAT; aucune création/idempotence métier n’est encore implémentée.
