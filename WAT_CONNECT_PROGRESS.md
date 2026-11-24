# WAT Connect — rapport de progression

Dernière mise à jour : 22 novembre 2026
Branche suivie : feature/nour-central-management-foundation
PR #20 : ouverte, brouillon, non fusionnée — fix/lot8-club-onboarding-and-access vers audit/wat-connect-lot8-projects-club-khuddam.
PR #22 : ouverte, brouillon, non fusionnée — feature/nour-central-management-foundation vers fix/lot8-club-onboarding-and-access.

## État vérifié au 22 novembre 2026

- Dernier commit de code testé sur PR #22 : `50abacfbbd9223dfed4ff0a6471827d13086be7f`; PR toujours ouverte, brouillon, non fusionnée. Le rapport possède ensuite son propre commit documentaire.
- HEAD de la PR #20 : `655b90d0d34a915e36f65f7d4d79c11da4ae30e2`; PR ouverte, brouillon, non fusionnée. Cible conservée : `audit/wat-connect-lot8-projects-club-khuddam`.
- PR #22 reste empilée sur `fix/lot8-club-onboarding-and-access`, pas sur `main`. Après l’ajout du test sur les deux branches, GitHub a signalé `dirty`; l’analyse a isolé le conflit add/add sur le même chemin. Le test Lot 8 a été renommé, les deux tests sont conservés, et l’API GitHub indique de nouveau `mergeable_state=clean`. Aucune cible n’a été changée.
- PR #20, commit `269c675` : Firestore Emulator **129/129 réussis** (run 44993962097); build Android staging réussi (run 44993962095). Le commit `2899a93` ajoute trois tests de confinement Firebase : **132/132** (run 44994507222), build Android staging (run 44994507277). Le commit `6c03c9d` renomme le nouveau test pour éviter un conflit d’ajout avec le test existant de PR #22; revalidation **132/132** (run 44994890261) et Android staging (run 44994890246). Le correctif des règles de profil passe **134/134** tests (run 44996446023), Android staging réussi (run 44996446014). Le commit `91ff040` ajoute `maxlength=120` sur le formulaire et son test; suite **135/135** (run 44997248739). Le commit `655b90d` borne les entrées pédagogiques et aligne réponses/réflexions à 5 000 caractères : suite finale **138/138** (run 44997952811), Android staging réussi (run 44997952844). Les tests couvrent les dates impossibles, les années bissextiles 2028/2000 et les années communes 2027/1900.
- Historique des validations du correctif Lot 8 consigné sans masquer les échecs : `ffe59fb` a échoué à l’analyse à cause d’une ligne tronquée; `725413e` a passé 127/129, l’année bissextile étant encore erronée, Android a réussi; deux tentatives intermédiaires ont aussi échoué à cause d’un fichier de règles dupliqué. Le commit `269c675` repart du fichier intact d4c96e6, corrige le motif et passe les 129 tests. `2899a93` ajoute les tests de sélection du projet demo, de l'émulateur explicitement demo et du build Android staging. `6c03c9d` sépare son nom de fichier de celui du test NH-1, résout le conflit add/add sans changer la cible de PR #22. Le commit `d601cd8` resserre la validation des créations et mises à jour de profils apprenants sans modifier les données existantes; `91ff040` aligne le formulaire sur la limite de nom; `655b90d` ajoute des bornes d'identifiant/date et des maxima UI pour le texte apprenant.
- `.firebaserc` aux têtes PR #20 et #22 : défaut `demo-wat-connect`, alias staging `wat-connect-staging`; aucun alias production. La base de PR #20 sélectionnait `wat-connect` et a été sécurisée. Le test Firestore CI cible explicitement demo; le workflow APK fixe l’environnement staging.
- Inventaire des workflows/scripts PR #20 : aucun déploiement Firebase production n’est défini. Le processus de production n’a été ni exécuté ni modifié; il devra toujours choisir explicitement son projet. Les workflows Cloudflare staging restent distincts du Wrangler production.
- PR #22 code applicatif : les tests ciblés locaux étaient 115/115; CI du commit `bcaf337` : API 44992433833, Firestore Emulator 44992433789, Android staging 44992433810 — tous réussis. Le checkpoint `6d28ef4` a passé API 44994342212, Firestore 44994342156 et Android 44994342216; le checkpoint `eb6b42c` a les trois workflows réussis; le contrôle `cddb079` valide 110/110 API, 137/137 Firestore et Android staging; le commit de test de routes `6ebf91c` valide 111/111 API (run 44995615345), 137/137 Firestore (run 44995615324) et Android staging (run 44995615319). Preview de branche Cloudflare réussie (5413d640). Le commit `902f891` actualise le rapport; ne pas le présenter comme une nouvelle validation de code.
- Auth Firebase staging toujours non vérifiable : aucun CLI Firebase/gcloud, connecteur ni identité de service accessible. Aucun test contre Firebase réel. Permissions IAM/bindings non validés; routes API métier toujours fermées.
- Cloudflare consulté en lecture seule. Compte standard associé à `ongwafaalturathinternational@gmail.com`; `enforce_twofactor=false`. Les Workers `wat-connect-staging` et `nour-al-hidaya` ont bindings et routes vides, mais `workers.dev` et les previews sont activés sur les deux. Dernières mises à jour de déploiement visibles : staging 21 nov. 2026 11:29Z, production 18 nov. 2026 22:37Z. Le code API est non routé; les opérations d'inscription restent en 503 et les affectations en 404. L'affiliation institutionnelle et la protection 2FA restent à confirmer par WAT. Aucun réglage, secret ni déploiement n’a été modifié.
- Aucun compte réel, dossier réel, configuration de production, fusion ou déploiement production modifié/exécuté.

## Commits vérifiables

- 195853f — ajout du motif d'audit et extension de l'idempotence; tests, documentation et préparation Firebase staging.
- 6be8c3d — rapport de continuité initial WAT_CONNECT_PROGRESS.md.
- 067bdcc — correction du bloc previews Wrangler staging, test anti-régression et mise à jour du rapport; CI et Preview réussis.
- 52936f8 — test de rejeu update/revoke et mise à jour du rapport; tests locaux et CI réussis.
- 269c675 — règles de date calendaires reconstruites depuis la source intacte; Firestore 129/129 et Android staging réussis.
- 2899a93 — garde-fous de sélection `.firebaserc`, Emulator demo et Android staging; Firestore 132/132.
- 6c03c9d — test renommé pour lever le conflit add/add; Firestore 132/132, Android staging, PR #22 revenue à `clean`.
- 6d28ef4 / eb6b42c — rapports de progression; tests applicatifs, Firestore Emulator et APK staging réussis.
- 084d7bb — checkpoint de résultats PR #20/#22.
- fcae17f / d601cd8 — validation type/longueur des mises à jour de profil, rôle/e-mail immuables, tests d'écriture non propriétaire.
- 91ff040 — limite UI du prénom/pseudonyme à 120 caractères et test; Firestore 135/135, Android staging.
- 655b90d — bornes des données pédagogiques privées et limites UI texte; Firestore 138/138, Android staging.
- 6ebf91c — test API confirmant que les routes HTTP grant/update/revoke restent fermées; 111 tests API, 137 tests Firestore et Android staging réussis.
- CI associée : API run 44990071689 (success), Firestore run 44990071677 (success), Android staging run 44990071687 (success).

## Tâches terminées

- Audit technique initial des PR #20 et #22, branches, dépendance de base et état CI.
- Revue de cohérence de l'architecture WAT Connect et NH-1 : référentiels communs; modules distincts; moindre privilège; séparation des données bénéficiaires privées; routes NH-1 fermées.
- Contrôle statique des scripts Firebase et Wrangler par environnement; ajout du garde-fou de configuration `.firebaserc` sur la branche PR #20.
- Durcissement des motifs d'audit/idempotence des affectations et tests de rejeu/concurrence.
- Extension des tests aux rejeux update/revoke avec changement de patch, version et motif.
- Navigation portail : liens publics conservés sur mobile, retour à la ligne et focus clavier visibles; test de régression dédié.
- API assignment : test dédié à l'absence de routes HTTP grant/update/revoke (404), aucune route métier ajoutée.
- Profils apprenants : validation de type/longueur sur les champs modifiables, horodatage serveur exigé, rôle/e-mail immuables; les champs absents des profils historiques restent facultatifs en mise à jour. Le champ prénom/pseudonyme et les règles partagent la limite de 120 caractères.
- Données pédagogiques privées : identifiant d’élément <=120 caractères, date réelle ISO, textes <=5 000 caractères; interface réponses/réflexions alignée.
- Isolement Firebase : `.firebaserc` par défaut demo, alias staging, tests automatisés du projet Emulator et du build Android; aucun déploiement Firebase production trouvé dans les scripts/workflows de la branche Lot 8.
- Preview de branche Cloudflare réussie après l'ajout du bloc Wrangler staging; URL publique. Elle est distincte du déploiement production et n'utilise aucun binding. Ne saisir aucune donnée réelle dans l'aperçu.
- Inventaire Cloudflare staging en lecture seule.
- Diagnostic Cloudflare du build échoué; correction Wrangler staging, test et Preview validés.
- Audit des profils apprenants : correction du contournement de validation en update et tests positifs/négatifs d'ownership, rôle, tailles, types et horodatage.
- Audit des données pédagogiques privées : contrôle des identifiants/dates et limites de texte synchronisé, avec tests Emulator et test UI.

## Tâches restantes

1. Maintenir le blocage Firebase documenté : aucun CLI, identité ni liaison Firebase accessible. Ne pas tenter d'accéder à des comptes réels.
2. Valider l'identité institutionnelle WAT, le rôle IAM minimal Firestore/Auth et les bindings/secrets staging. État actuel : aucun binding/secrets; pas d'accès Firebase vérifié. Ne pas ouvrir les routes avant preuve des autorisations et de bout en bout.
3. PR #20/#22 : les deux sont ouvertes en brouillon, sans revue formelle ni fusion, et GitHub les signale mergeables. PR #22 a six fichiers en commun avec PR #20; le diff de branche reste grand car NH-1 est empilé au-dessus du jalon Lot 8. Ne pas changer la base sans arbitrage ni nécessité technique.
4. Poursuivre les tests Emulator uniquement avec identités/données fictives; vérifier l'atomicité, la concurrence, la confidentialité et le refus des clients.
5. Après les garde-fous NH-1, reprendre les modules WAT Connect dans l'ordre de la feuille de route sans fusionner leurs responsabilités.

## Décisions/éléments attendus de WAT

- Confirmation du propriétaire institutionnel du compte/projet Firebase staging et de l'identité de service dédiée, si la CLI ne permet pas de le vérifier.
- Validation du modèle de rôles/scopes et des périmètres NH-1 par WAT avant toute attribution réelle ou activation.
- Les exigences de protection des mineurs et les taxonomies restent à confirmer selon les documents NH-1 déjà préparés.

## Prochaine action

1. Poursuivre l’audit statique de la feuille de route et des dépendances de modules depuis les documents du dépôt; effectuer les corrections indépendantes avec données fictives.
2. Maintenir la demande de validation institutionnelle Firebase staging (propriétaire, identité de service et IAM minimal) et garder les routes fermées jusque-là.
3. Demander à WAT de confirmer le compte Cloudflare institutionnel et le mécanisme d’application de 2FA; inventaire distant maintenu en lecture seule.
4. Suivre les contrôles CI/mergeabilité des PR #20/#22 après chaque commit. Ne jamais fusionner, déployer production, toucher aux comptes/dossiers réels ni ouvrir les routes.


## Point de reprise vérifié — 22 novembre 2026

- Vérification du commit courant PR #22 : `c4bda0c4e9101245bf2b09a10d05e765de30fe6c` (la tentative précédente n'avait pas encore enregistré de nouveau checkpoint).
- Résultats GitHub Actions observés pour ce SHA : API NH-1 **111/111 réussis** ([run 44998277146](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44998277146)); Firestore Emulator **143/143 réussis** ([run 44998277075](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44998277075)); build Android staging **réussi** ([run 44998277138](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44998277138)).
- État GitHub relu : PR #22 ouverte, brouillon, non fusionnée, `mergeable=true`, base Lot 8 conservée; PR #20 ouverte, brouillon, non fusionnée, `mergeable=true`. Aucune revue formelle sur la PR #22.
- Le rapport précédent indiquait encore des résultats antérieurs (API 111, Firestore 138) et un ancien HEAD; cette actualisation corrige ces éléments pour le commit vérifié.
- Aucun accès Firebase réel, changement de compte ou de données, ouverture de route, fusion, déploiement ou modification production n'a eu lieu.

## Correctif de validation des dates d'affectation — 22 novembre 2026

- L'audit de learning-assignment-service.js a révélé que Date.parse acceptait des jours impossibles par normalisation (ex. 30 février). Le validateur vérifie maintenant mois/jour, heures, secondes et années bissextiles selon le calendrier grégorien.
- Tests ajoutés : 30 février rejeté sans reçu ni événement d'audit; 29 février 2028 accepté. Commit code/test : 29085c89ff60b466443a242d72b56d990a1ce994 / b884bcd94cff790ca30f60d4cdc89d322f316f81.
- CI du dernier commit de code b884bcd observée réussie : API NH-1 [run 44998802975](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44998802975), Firestore Emulator [run 44998802992](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44998802992), APK staging [run 44998802961](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44998802961). Les jobs API, règles et build sont tous au statut success.
- .firebaserc vérifié : défaut demo-wat-connect, alias staging wat-connect-staging. package.json et le workflow Firestore lancent explicitement l'émulateur sur demo-wat-connect; le build Android CI force staging. Cette vérification statique n'exécute aucun processus de publication production.
- La PR #22 conserve sa cible fix/lot8-club-onboarding-and-access, état GitHub mergeable=true, ouverte et brouillon; PR #20 reste aussi ouverte, brouillon et mergeable sur sa cible prévue. Aucun changement de cible.
- Routes métier fermées. Aucun accès Firebase réel/IAM validé, compte/dossier réel touché, changement de production, merge ou déploiement.

## Revalidation finale et dépendances — 22 novembre 2026

- Correctif de validation d'affectation/politique et scope privé canonique vérifiés au commit 50abacfbbd9223dfed4ff0a6471827d13086be7f. API NH-1 succès (44999282465), Firestore Emulator succès (44999282464), Android staging succès (44999282481). La tentative de test précédente (run 44999189171) a échoué sur une attente incohérente du test de date future; correction documentée, puis test relancé avec succès.
- La proposition de matrice et les fixtures utilisent maintenant le même scope privé que le contrôle d'accès serveur : learning.beneficiaries.private.read. Aucun accès n'a été attribué.
- Dépendance PR #21 relue en lecture seule : ouverte, brouillon, non fusionnée et mergeable; bootstrap/documentation explicitement limités à wat-connect-staging. Elle reste distincte de #20/#22; aucun compte ni configuration n'est changé.
- PR #20 (branche Lot 8) et PR #22 restent ouvertes en brouillon, non fusionnées et mergeable; cibles conservées. PR #22 reste empilée sur la base Lot 8, car son fond NH-1 en dépend. Aucune activation de route.
- Une fois le rapport commité, le HEAD de PR #22 est documentaire; le dernier commit code validé demeure 50abacf. Firebase institutionnel/IAM et bindings restent non vérifiés; Cloudflare reste en lecture seule. Pas de données réelles, production, merge ou déploiement touchés.

## Concurrence d'idempotence — 22 novembre 2026

- Nouveau test de rejeu concurrent identique sur grant : un appel initial et un replay, même identifiant d'affectation, un seul reçu, une seule version et un seul événement d'audit.
- Commit de test `106202c0be11c29841c4e6b9d25582213af58e1e`; CI complète réussie : API NH-1 44999694218, Firestore Emulator 44999694234 et APK Android staging 44999694200.
- Les routes restent fermées; aucun accès Firebase réel, donnée réelle, fusion ou déploiement.

## Sécurité des candidatures et Cloudflare — 22 novembre 2026

- PR #20 : correction des limites contournables côté client pour les tableaux compétences/intérêts des candidatures. Les règles serveur exigent une liste de 0 à 20 valeurs texte, chaque valeur de 1 à 120 caractères, et au plus 500 caractères concaténés par champ. Le registre bénévoles actif conserve ses contrôles d'origine.
- Le contrôle avait d'abord échoué (138/139) car le helper avait été ajouté sans être relié au match volunteerApplications; le test diagnostique a identifié une compétence de 121 caractères acceptée. Le helper a ensuite été raccordé au bon match, et son application accidentelle aux règles de bénévoles actifs a été annulée.
- Commit final vérifié sur PR #20 : e3b04361436f32425c86cf3b971e859265162d23. Firestore Emulator **139/139** (run 45000655220) et APK Android staging réussi (run 45000655207).
- Inventaire Cloudflare strictement GET : identité connectée ongwafaalturathinternational@gmail.com; compte standard, enforce_twofactor=false. Workers wat-connect-staging et nour-al-hidaya : bindings vides, routes vides, sous-domaines workers.dev et previews activés. Derniers déploiements consultés : staging 21 nov. 2026 11:29Z; nour-al-hidaya 18 nov. 2026 22:37Z. Aucun Worker, secret, réglage ou déploiement modifié.
- État GitHub après calcul : PR #20 et #22 ouvertes, en brouillon, non fusionnées et mergeable=true. #22 conserve sa cible Lot 8; aucune fusion, ouverture de routes, opération Firebase réel ou déploiement production.


## Revalidation du HEAD PR #22 — 22 novembre 2026

- HEAD vérifié : c14d7adba8e9a435c1bd9e64d2dcdf0ca5ce365a. Les trois contrôles GitHub Actions associés sont maintenant terminés et réussis : API NH-1 **113/113** (run [45000904640](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45000904640)), Firestore Emulator **144/144** sur demo-wat-connect (run [45000904631](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45000904631)), APK Android staging (run [45000904646](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45000904646)). Les logs ont été consultés; Firestore affiche les refus PERMISSION_DENIED attendus par les tests négatifs, sans échec de test.
- Relecture du service d'affectation au HEAD : grant/update/revoke normalisent et conservent le motif dans l'événement append-only; son hash de requête inclut le motif et tous les champs métier/version pertinents. Les reçus et l'audit sont créés atomiquement avec la mutation, avec préconditions Firestore et détection du rejeu concurrent. Les tests de rejeu/motif et de concurrence sont dans les 113 tests API réussis.
- .firebaserc demeure explicitement isolé : défaut demo-wat-connect, alias staging=wat-connect-staging; le workflow Emulator passe --project demo-wat-connect, et le build Android impose le routage wat-connect-staging. Aucun workflow/script de publication Firebase production n'a été exécuté. Aucun changement de configuration production.
- État relu : PR #20 et #22 ouvertes, brouillons, non fusionnées et mergeable=true. #22 conserve fix/lot8-club-onboarding-and-access comme base empilée de PR #20; aucune cible changée.
- Intégration réelle toujours en attente : identité institutionnelle WAT, permissions IAM minimales et bindings/secrets staging non validés. Aucun accès Firebase réel disponible. Routes métier maintenues fermées; aucune mutation de comptes ou données réelles, fusion ou publication.


## Traçabilité d'audit et plan de tests actualisé — 22 novembre 2026

- L'audit du contrat d'intégration a révélé que requestId était utilisé par le reçu idempotent mais absent de l'événement d'audit. Correctif code sur PR #22 : commit ca7b7f34f23a9c55facaddf8055b31cbd267dd77; chaque mutation grant/update/revoke conserve maintenant requestId dans son événement, dans le même commit atomique que le registre et le reçu.
- Tests complétés au commit 62c46395771df3a02b24370282ac400ea517f92c : API NH-1 **113/113** (run [45001429794](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45001429794)); Firestore Emulator **144/144** (run [45001429714](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45001429714)); APK Android staging réussi (run [45001429748](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45001429748)). Les tests assertent maintenant le requestId de grant/update/revoke, et conservent les vérifications du motif, du rejeu sans audit en double et de la concurrence.
- Le plan docs/testing/learning-staff-assignment-test-plan.md a été corrigé au commit db2dcb7998541b6d48adb1cd741c2e1e810c29b8 : couverture effectivement exécutée séparée des prérequis de l'intégration réelle staging; niveaux de tests, limites des mocks et décisions WAT sont clarifiés.
- État courant avant ce checkpoint documentaire : PR #22 ouverte, brouillon, non fusionnée, mergeable=true et toujours ciblée sur fix/lot8-club-onboarding-and-access. PR #20 reste ouverte, brouillon, non fusionnée, mergeable=true.
- Aucun accès réel Firebase, changement IAM/binding, compte/dossier réel, configuration de production, route, fusion ou déploiement manuel n'a été touché. L'identité WAT/IAM reste non vérifiée; les routes restent fermées. La prévisualisation Cloudflare de branche est générée automatiquement par l'intégration existante; elle n'est pas le Worker staging autorisé et ne doit recevoir aucune donnée réelle.


## Durcissement des transactions Firestore NH-1 — 22 novembre 2026

- Sur la branche de fondation, le client REST Firestore refuse désormais toute précondition qui ne correspond pas strictement à l'opération : `create` exige `exists:false`; `update` exige un `updateTime` non vide. Les objets de précondition ambigus ou contenant plusieurs critères sont rejetés avant tout appel réseau.
- Les commits atomiques refusent également deux écritures visant le même document dans une seule transaction. Cela évite les lots ambigus et renforce la garantie d'idempotence pour le registre d'affectations, les reçus et le journal d'audit.
- Tests ajoutés dans `tests/learning-api-firestore.test.js` pour les préconditions croisées, les critères ambigus et les cibles dupliquées.
- Commits : correction `4d0bbe77f60867a1cb523b755cd8943b3d14bcc6`; tests `91bd403b7e9de8a06b6d70970e80e0e032855baf`.
- CI du commit de tests : workflow NH-1 learning API **success** (run [45064716371](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45064716371)). Au dernier contrôle, les workflows Firestore rules (run [45064721595](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45064721595)) et APK Android staging (run [45064721725](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45064721725)) étaient encore en cours.
- Aucun endpoint d'inscription n'a été ouvert; aucune donnée réelle, identité de service, clé, permission IAM, secret, binding Cloudflare ou configuration de production n'a été modifié.


## Complément de durcissement Firestore — reçus immuables — 22 novembre 2026

- Les collections de reçus d'idempotence et de synchronisation (`learningRegistrationReceipts`, `learningAssignmentReceipts`, `syncReceipts`) sont désormais append-only, au même titre que le journal d'audit : création autorisée par le client serveur, modification refusée.
- Les transactions groupées n'autorisent les mises à jour que sur le registre `learningStaffAssignments`; les reçus et événements d'audit restent des créations protégées.
- Tests ajoutés pour interdire la modification des reçus via les méthodes simples et les transactions groupées.
- Commits : `6313411306eebed255a1afbd057707f4343bdab4` (code) et `aa1f73f7fcfcdc36e16bcd5dea2f1abdc728f51e` (tests).
- Validation CI du HEAD de test : **116/116 tests NH-1 réussis, 0 échec** — run [45064865798](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45064865798).
- La protection des écritures atomiques et l'immutabilité des reçus sont donc vérifiées par CI. Aucun endpoint métier n'est activé et aucun accès aux données réelles n'a été ouvert.


### Complément de validation CI sur le commit précédent de fondation

Les deux contrôles qui étaient encore en cours lors du point précédent sont terminés avec succès sur le commit `91bd403b7e9de8a06b6d70970e80e0e032855baf` : règles Firestore **success** (run [45064721595](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45064721595)) et build APK Android staging **success** (run [45064721725](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45064721725)). Ces workflows précèdent le dernier durcissement append-only; le dernier commit dispose séparément de sa validation NH-1 116/116 réussie. Aucun déploiement de production.


## Validation stricte du registre des autorisations équipe — 22 novembre 2026

- Revue de `workers/learning-api/src/staff-auth.js` : le parseur de scopes acceptait auparavant une liste partiellement malformée en filtrant silencieusement les valeurs non textuelles. Le contrôle renforce maintenant le format du registre : liste présente, maximum 100 scopes, chaque valeur conforme au format de scope et aucune entrée dupliquée. Tout registre malformé est refusé avec `staff_access_invalid`; aucun droit n'est accordé sur la base d'une liste partiellement interprétée.
- Trois tests ajoutés : valeur malformée, doublon et liste dépassant 100 entrées.
- Commits sur la branche NH-1 : `e35bc524d4ce5571ac8880c4b4c8343f2a45a1a1` (code initial), `55eb3d281a0cf15ac6efe18df3fc512f4beec363` (tests), `eb7334b6cc2ebe0b893bb87d37b562a7dc138a4a` (correction d'échappement regex après détection CI).
- Les exécutions API déclenchées sur les commits intermédiaires ont échoué à cause de cette expression régulière trop échappée; l'échec a été identifié dans les journaux, puis corrigé. Les exécutions Firestore/Android de ces commits n'étaient pas encore toutes terminées lors de ce point.
- PR #22 reste ouverte, en brouillon, non fusionnée; sa cible Lot 8 est inchangée. Aucune route métier ouverte, aucun accès Firebase réel, donnée réelle, secret, IAM ou production modifié.


### Résultat après correction du contrôle des scopes — 22 novembre 2026

- Le contrôle NH-1 a été relancé sur le commit code `eb7334b6cc2ebe0b893bb87d37b562a7dc138a4a` : **119/119 tests réussis, 0 échec** (runs API [45065153633](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45065153633) et [45065159005](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45065159005)).
- La vérification inclut les nouveaux cas de scopes malformés, dupliqués et de liste trop longue.
- Les workflows Firestore Emulator et APK Android du commit documentaire `09fd181a66884c7189c40524af5bad163a21cfb8` étaient encore en cours au moment de la lecture. Ils ne sont pas annoncés comme réussis.

## Reprise contrôle des affectations
Le contrôle de lecture valide la période et les doublons de droits de chaque affectation avant toute autorisation. Le service d’écriture et la politique d’accès partagent la même validation de période. La branche codex/nour-perimetres-registre couvre un registre mêlant une affectation autorisée et une affectation mal formée. Les routes publiques restent fermées en attente des prérequis staging.
