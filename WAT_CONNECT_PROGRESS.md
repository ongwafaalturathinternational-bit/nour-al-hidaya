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


## Audit comparatif UI/UX — 22 novembre 2026

- Création de la branche documentaire indépendante `audit/wat-connect-uiux-review`, basée sur le HEAD vérifié de PR #22 : `6ac4bfe0b035547f5670c016094ce3d102a2023e`. Aucun changement sur les branches PR #20, #22 ou #12.
- Ajout de `docs/AUDIT-UI-UX-WAT-CONNECT.md` (commit `9de03bcd9cfdde3074095f1aae03cc94741e5416`). Audit statique comparatif du portail, site institutionnel, annuaire, programmes, projets, activités, Club, Finances Lot 9 et Nour Al-Hidaya.
- Écart prioritaire : `finance.html` (branche Lot 9) embarque une palette et des styles autonomes, sans `wat-brand.css`, et affiche un logo textuel « WAT ». La référence visuelle WAT et les pages Lot 8 utilisent les tokens officiels turquoise/or/bleu profond et les motifs facettés mesurés.
- Autre point UX : les tableaux Finance ont une largeur minimale de 760 px, avec défilement horizontal potentiel sur mobile. Les pages métier présentent des seuils responsive distincts ; une harmonisation contrôlée est recommandée.
- Le document propose une refonte progressive strictement présentationnelle, sans supprimer formulaires, registres, validations, filtres, exports, impressions, règles d'accès ni audit. Il précise les tests desktop/mobile et non-régression à exiger.
- Limites explicites : audit HTML/CSS statique, pas de capture navigateur, de test utilisateur ni de certification WCAG ; Nour Al-Hidaya nécessite une revue visuelle dédiée. Le code Lot 9 n'a pas été intégré à cette branche.
- Aucune donnée réelle, règle Firestore, route métier, configuration Firebase/Cloudflare, secret, production, fusion ou déploiement n'a été touché. PR #20, #22 et #12 restent indépendantes et non fusionnées.

- PR documentaire créée : [#23 — Audit UI/UX comparatif WAT Connect](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/23), brouillon ouvert, cible `feature/nour-central-management-foundation`. Comparaison GitHub : 2 commits en avance, 0 en retard, base = HEAD de PR #22 ; vérification ultérieure : `mergeable=true`. Aucune fusion effectuée.


## Audit approfondi des identités visuelles et de Nour Al-Hidaya — 22 novembre 2026

- Ouverture et inventaire des deux archives officielles : huit PNG couleur/blanc (logos complets et icônes) vérifiés en RGBA avec transparence. Les fichiers originaux sont conservés sans altération dans l'espace de travail; dimensions consignées dans `docs/AUDIT-UI-UX-WAT-CONNECT.md`.
- Audit des en-têtes : portail, site institutionnel, Administration, Programmes, Projets, Activités et Club utilisent encore des titres textuels sans logo image. Nour réutilise une seule constante PNG encodée en base64 dans l'en-tête foncé, la connexion claire et les écrans de démarrage; les deux manifestes utilisent les mêmes icônes génériques racine.
- Le plan d'intégration distingue explicitement les assets WAT et Nour, les versions couleur/blanche, les favicons/manifests et le cache PWA. Aucun chemin d'asset non committé n'a été ajouté et aucun logo n'a été redessiné.
- Limite technique constatée : l'action de création de fichier GitHub disponible dans ce chantier accepte UTF-8 et ne transmet pas les octets PNG. Les originaux sont prêts localement; une méthode de transfert binaire vers le dépôt reste nécessaire avant leur intégration effective. L'audit et les travaux UI/UX indépendants continuent sans attendre.
- État PR #24 : Firestore security rules workflow du HEAD `c2541ee055a3fe693689066e1eaae1962991230b` terminé avec succès. Les commentaires du bot Cloudflare sur les commits `1286d11` et `c2541ee` indiquent toutefois deux échecs de build de prévisualisation, sans URL publiée. Ce sont des builds Preview, pas une preuve de déploiement production; aucune opération production n'a été effectuée.
- PR #20, #22, #12, #23 et #24 vérifiées ouvertes, en brouillon, non fusionnées et mergeable au contrôle du 22 novembre 2026. Leurs branches et cibles sont conservées.
- Aucun compte/dossier réel, règle métier, route NH-1, IAM, secret, configuration Firebase réelle, fusion ou déploiement de production n'a été modifié.

### Priorités suivantes

1. Finaliser une voie de transfert binaire contrôlée pour committer les huit originaux, puis créer une PR d'intégration des deux identités sur portail, modules WAT et Nour.
2. Poursuivre l'audit UI/UX des formulaires, tableaux, navigation, densité, états et accessibilité des modules Lot 8, sans recommencer leur développement.
3. Diagnostiquer séparément les échecs Cloudflare Preview de PR #24; ne pas les confondre avec le workflow Firestore réussi ni avec un déploiement production.
4. Maintenir l'ordre de la feuille de route initiale et la fermeture des routes NH-1 jusqu'aux validations institutionnelles.


## Revue responsive et PR #25 — 22 novembre 2026

- Mesures statiques ajoutées à l'audit UI/UX : les tableaux Lot 8 ont des largeurs minimales de 610 à 680 px et sont contenus dans des zones `overflow:auto`; les breakpoints varient par module. Le rapport distingue le défilement horizontal conservant toutes les colonnes d'une future présentation mobile plus ergonomique.
- PR #25 créée : `feature/lot8-table-keyboard-accessibility` vers `feature/nour-central-management-foundation` (empilée sur PR #22). Six zones de tableaux sont maintenant nommées et accessibles au clavier; le focus est visible. Aucune donnée/colonne/action n'est masquée.
- Head PR #25 : `97b8ffc4d9632d30752e1beb68b3d1a315e59072`. Les workflows « Firestore security rules » (run 45043255230) et « Android staging APK test build » (run 45043255227) ont démarré; ils sont en cours au dernier contrôle. Résultats à compléter après achèvement.
- PR #25 reste ouverte en brouillon et non fusionnée; la cible de PR #22 n'a pas été modifiée.


## Résultats vérifiés de PR #25 — 22 novembre 2026

- PR #25 `feature/lot8-table-keyboard-accessibility` vers PR #22 : ouverte, brouillon, non fusionnée, `mergeable=true` au dernier contrôle.
- Commit applicatif testé `97b8ffc4d9632d30752e1beb68b3d1a315e59072` : Firestore Emulator **133/133 tests réussis** (run [45043255230](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45043255230)); APK Android staging réussi (run [45043255227](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45043255227), artefact [14762631201](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45043255227/artifacts/14762631201)).
- Les deux tests de régression ajoutés sont confirmés dans les logs. Les refus PERMISSION_DENIED sont les cas négatifs attendus; aucun échec.
- Cette PR ne modifie pas les données métier ni les règles. Elle reste un changement de présentation/accessibilité.
