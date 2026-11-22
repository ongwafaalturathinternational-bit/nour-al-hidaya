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
- Les tests d'autorisation utilisent maintenant les scopes granulaires `learning.beneficiaries.read` et `learning.beneficiaries.review`.
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
