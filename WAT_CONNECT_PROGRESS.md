# WAT Connect — rapport de progression

Dernière mise à jour : 22 novembre 2026
Branche suivie : feature/nour-central-management-foundation
PR #20 : ouverte, brouillon, non fusionnée — fix/lot8-club-onboarding-and-access vers audit/wat-connect-lot8-projects-club-khuddam.
PR #22 : ouverte, brouillon, non fusionnée — feature/nour-central-management-foundation vers fix/lot8-club-onboarding-and-access.

## État vérifié au 22 novembre 2026

- HEAD de la PR #22 : `eb6b42c2390e9da0471dc3414356a81d94f9dce3` (checkpoint documentaire; API/Firestore/Android CI réussies); PR ouverte, brouillon, non fusionnée.
- HEAD de la PR #20 : `6c03c9d8758fd5e8e213301fe7085f7bb5ac3afc`; PR ouverte, brouillon, non fusionnée. Cible conservée : `audit/wat-connect-lot8-projects-club-khuddam`.
- PR #22 reste empilée sur `fix/lot8-club-onboarding-and-access`, pas sur `main`. Après l’ajout du test sur les deux branches, GitHub a signalé `dirty`; l’analyse a isolé le conflit add/add sur le même chemin. Le test Lot 8 a été renommé, les deux tests sont conservés, et l’API GitHub indique de nouveau `mergeable_state=clean`. Aucune cible n’a été changée.
- PR #20, commit `269c675` : Firestore Emulator **129/129 réussis** (run 44993962097); build Android staging réussi (run 44993962095). Le commit `2899a93` ajoute trois tests de confinement Firebase : **132/132** (run 44994507222), build Android staging (run 44994507277). Le commit `6c03c9d` renomme le nouveau test pour éviter un conflit d’ajout avec le test existant de PR #22; revalidation **132/132** (run 44994890261) et Android staging (run 44994890246). Les tests couvrent les dates impossibles, les années bissextiles 2028/2000 et les années communes 2027/1900.
- Historique des validations du correctif Lot 8 consigné sans masquer les échecs : `ffe59fb` a échoué à l’analyse à cause d’une ligne tronquée; `725413e` a passé 127/129, l’année bissextile étant encore erronée, Android a réussi; deux tentatives intermédiaires ont aussi échoué à cause d’un fichier de règles dupliqué. Le commit `269c675` repart du fichier intact d4c96e6, corrige le motif et passe les 129 tests. `2899a93` ajoute les tests de sélection du projet demo, de l'émulateur explicitement demo et du build Android staging. `6c03c9d` sépare son nom de fichier de celui du test NH-1, résout le conflit add/add sans changer la cible de PR #22.
- `.firebaserc` aux têtes PR #20 et #22 : défaut `demo-wat-connect`, alias staging `wat-connect-staging`; aucun alias production. La base de PR #20 sélectionnait `wat-connect` et a été sécurisée. Le test Firestore CI cible explicitement demo; le workflow APK fixe l’environnement staging.
- Inventaire des workflows/scripts PR #20 : aucun déploiement Firebase production n’est défini. Le processus de production n’a été ni exécuté ni modifié; il devra toujours choisir explicitement son projet. Les workflows Cloudflare staging restent distincts du Wrangler production.
- PR #22 code applicatif : les tests ciblés locaux étaient 115/115; CI du commit `bcaf337` : API 44992433833, Firestore Emulator 44992433789, Android staging 44992433810 — tous réussis. Le checkpoint `6d28ef4` a passé API 44994342212, Firestore 44994342156 et Android 44994342216; le checkpoint suivant `eb6b42c` a les mêmes trois workflows réussis. Preview de branche Cloudflare réussie (5413d640). Le commit `902f891` actualise le rapport; ne pas le présenter comme une nouvelle validation de code.
- Auth Firebase staging toujours non vérifiable : aucun CLI Firebase/gcloud, connecteur ni identité de service accessible. Aucun test contre Firebase réel. Permissions IAM/bindings non validés; routes API métier toujours fermées.
- Cloudflare consulté en lecture seule. Compte associé à `ongwafaalturathinternational@gmail.com`; le compte a `enforce_twofactor=false`. Workers `wat-connect-staging` et `nour-al-hidaya` présents; leurs bindings et routes sont vides. Ce lien institutionnel et la protection 2FA restent à confirmer par WAT. Aucun réglage ni secret n’a été modifié.
- Aucun compte réel, dossier réel, configuration de production, fusion ou déploiement production modifié/exécuté.

## Commits vérifiables

- 195853f — ajout du motif d'audit et extension de l'idempotence; tests, documentation et préparation Firebase staging.
- 6be8c3d — rapport de continuité initial WAT_CONNECT_PROGRESS.md.
- 067bdcc — correction du bloc previews Wrangler staging, test anti-régression et mise à jour du rapport; CI et Preview réussis.
- 52936f8 — test de rejeu update/revoke et mise à jour du rapport; tests locaux et CI réussis.
- CI associée : API run 44990071689 (success), Firestore run 44990071677 (success), Android staging run 44990071687 (success).

## Tâches terminées

- Audit technique initial des PR #20 et #22, branches, dépendance de base et état CI.
- Revue de cohérence de l'architecture WAT Connect et NH-1 : référentiels communs; modules distincts; moindre privilège; séparation des données bénéficiaires privées; routes NH-1 fermées.
- Contrôle statique des scripts Firebase et Wrangler par environnement; ajout du garde-fou de configuration `.firebaserc` sur la branche PR #20.
- Durcissement des motifs d'audit/idempotence des affectations et tests de rejeu/concurrence.
- Extension des tests aux rejeux update/revoke avec changement de patch, version et motif.
- Navigation portail : liens publics conservés sur mobile, retour à la ligne et focus clavier visibles; test de régression dédié.
- Isolement Firebase : `.firebaserc` par défaut demo, alias staging, tests automatisés du projet Emulator et du build Android; aucun déploiement Firebase production trouvé dans les scripts/workflows de la branche Lot 8.
- Preview de branche Cloudflare réussie après l'ajout du bloc Wrangler staging; URL publique. Elle est distincte du déploiement production et n'utilise aucun binding. Ne saisir aucune donnée réelle dans l'aperçu.
- Inventaire Cloudflare staging en lecture seule.
- Diagnostic Cloudflare du build échoué; correction Wrangler staging, test et Preview validés.

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
