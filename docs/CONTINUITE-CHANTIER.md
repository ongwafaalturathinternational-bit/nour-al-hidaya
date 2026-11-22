# Journal de continuité — WAT Connect / Nour Al-Hidaya

**Mise à jour : 21 novembre 2026**  
**PR de travail :** [#20 — Correctif Club Khuddam et accès](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/20)  
**Branche :** `fix/lot8-club-onboarding-and-access`  
**Base :** `audit/wat-connect-lot8-projects-club-khuddam`

## Dernier état applicatif vérifié

- **SHA applicatif validé :** `9843ff601ca145e31b6c24eead59e58c553d1489`.
- PR #20 : ouverte, en brouillon, non fusionnée.
- Aucun merge, déploiement de production, changement de données Firebase réelles ou publication Android n'a été effectué.
- Les PR #10, #11 et #12 n'ont pas été modifiées. Le Lot 9 Finances reste suspendu jusqu'à validation explicite du Lot 8.

### Validations exactes de ce SHA

- **Firestore / tests applicatifs :** [workflow 44850323784 réussi](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44850323784) — **113 tests réussis, 0 échec, 0 ignoré**.
- **Android debug :** [workflow 44850323664 réussi](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44850323664) — tâche Gradle `assembleDebug` réussie.
- **Artefact APK debug :** [wat-connect-android-debug-apk — ID 14684149210](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44850323664/artifacts/14684149210), 4 370 994 octets, expiration le **5 décembre 2026**.
- Ces validations portent sur le SHA applicatif ci-dessus. Toute modification ultérieure de code doit déclencher et réussir ses propres validations.

## Travaux réellement livrés dans la session

1. **Espace candidat Club Khuddam — confidentialité des sessions**
   - Ajout d'un compteur de génération de session et d'une vérification du UID Firebase courant.
   - Les réponses asynchrones anciennes ne peuvent plus réafficher le dossier après déconnexion ou changement de compte.
   - Les éléments personnels affichés sont vidés lors du retour à l'écran de connexion.
   - Les boutons de renvoi et de vérification ignorent les réponses devenues obsolètes.
   - Test de régression ajouté pour la syntaxe, les deux frontières asynchrones et l'ordre renouvellement du jeton / lecture du dossier.

2. **Affectations projets — bénévoles devenus inactifs**
   - La règle Firestore revalide l'état final du dossier bénévole avec `existsAfter/getAfter`.
   - Une affectation d'un bénévole absent ou inactif peut être clôturée (« retirée »), mais ne peut plus être remise à « proposée » ou « confirmée ».
   - L'interface désactive les choix incompatibles et explique la raison; le serveur reste l'autorité si le statut change après le chargement de la page.
   - Test de règles couvrant la désactivation préalable et la tentative atomique de désactiver un bénévole tout en confirmant son affectation; test d'interface ajouté.

3. **Documentation d'audit**
   - `docs/AUDIT-LOT8-ACCES.md` consigne les contrôles d'accès et les écarts qui restent à arbitrer.
   - `docs/CONTINUITE-CHANTIER.md` sert de point de reprise entre les conversations.

## Constats techniques encore ouverts

- **Présences :** les règles distinguent `activities.read/manage` et `attendance.read/manage`, mais l'interface Activités exige actuellement un scope Activités avant d'ouvrir le module. Un compte avec seulement `attendance.read/manage` ne peut donc pas exploiter l'écran malgré le droit de lecture des présences côté règles. Décider si l'écran exige les deux scopes ou si une vue Présences autonome doit être créée. Aucune permission n'a été élargie.
- **Références de présence :** `participantRef` peut encore être saisi librement et n'est pas garanti comme lien vers un dossier bénéficiaire central. Ne pas traiter cette valeur comme un identifiant de bénéficiaire vérifié.
- **Hors connexion :** la persistance Firestore IndexedDB n'est pas un coffre local chiffré au niveau applicatif. Elle ne doit pas servir à stocker les dossiers sensibles de bénéficiaires sur des appareils partagés ou non maîtrisés.
- **Inscription Nour Al-Hidaya :** le formulaire du Club dépend d'un compte Firebase Auth avec e-mail vérifié; il n'est pas l'inscription universelle sans e-mail. L'architecture cible est documentée, mais n'est pas implémentée.
- **Notifications :** seule l'architecture cible est documentée. Aucun centre de notifications ni service d'envoi n'est livré.
- **Cahier des charges initial :** il n'a pas été retrouvé dans les fichiers consultés. Ne pas prétendre l'avoir lu et ne pas lancer l'implémentation irréversible du registre universel avant confrontation avec ce document.

## À faire par l'utilisateur

1. **Transmettre le cahier des charges initial de Nour Al-Hidaya** afin de confronter les champs, parcours, rôles, structures et règles de gestion à l'architecture proposée.
2. **Installer l'APK debug sur un téléphone Android réel** et exécuter la recette de `docs/RECETTE-OPERATIONNELLE-LOT7-8.md` avec des comptes et données fictifs. Le build CI ne prouve pas le fonctionnement sur appareil physique.
3. **Arbitrer le droit Présences :** `attendance.read` seul doit-il ouvrir une vue autonome, ou les responsables de présence doivent-ils également recevoir `activities.read` ?
4. **Effectuer les essais de recette avec des comptes Firebase de test** : candidature, vérification d'e-mail, lecture personnelle, compte équipe actif, compte sans scope et révocation. Ne pas utiliser de données réelles de bénéficiaires.

## Je poursuis de mon côté

1. Auditer les transitions de projets, activités et affectations restantes, notamment les lectures croisées et la cohérence des requêtes.
2. Auditer les parcours PWA, cache, déconnexion, synchronisation et ressources Capacitor sans prétendre avoir testé un téléphone physique.
3. Préparer une feuille de recette Lot 8 et une liste de contrôles de confidentialité pour la validation utilisateur.
4. Confronter l'architecture d'inscription universelle au cahier des charges lorsqu'il sera disponible, sans réduire l'ambition du système.

## Limites d'autorisation

Aucun merge, déploiement Cloudflare/Firebase, modification des règles ou données Firebase de production, création de comptes réels, release Android ou publication de production sans autorisation explicite. Le Lot 9 Finances reste suspendu jusqu'à validation du Lot 8.


## Mise à jour — 21 novembre 2026, poursuite du Lot 8

- **Dernier commit de branche :** `8db3de6f53728ef5477ebb4c83b3c06185d2abc8`.
- Les trois contrôles du commit précédent `d90e4b80b2ded9127612a30b7ec2e9e09b90265f` ont réussi : build Workers, build APK Android debug et règles Firestore.
- Documentation Lot 7 corrigée : le modèle réellement utilisé est `attendance/{recordId}` avec `activityId`, et non une sous-collection sous `activities`. La documentation reflète aussi le CSV filtré et les limites réelles du cache hors connexion.
- Nouveau contrôle d'intégrité des projets : si les deux dates sont renseignées, la date de fin ne peut pas précéder la date de début. La règle Firestore applique cette contrainte à la création et à la modification; le formulaire la vérifie avant l'envoi.
- Test négatif ajouté pour garantir le rejet d'une période incohérente.
- Contrôles CI du nouveau commit en cours au moment de cette mise à jour : [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44907917555) · [APK Android](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44907917643).
- Aucun merge, déploiement, changement Firebase ou publication APK.

### Suite du travail

1. Vérifier les résultats CI du commit courant et corriger tout échec.
2. Continuer l'audit des transitions de projets, activités et affectations.
3. Garder l'arbitrage de la vue Présences autonome séparé : le droit `attendance.read` seul n'ouvre pas encore l'écran commun Activités / Présences.
4. Préparer les scénarios de recette avec comptes fictifs et vérifier les écarts documentaires.


## Poursuite — 21 novembre 2026, contrôle complémentaire des dates

- Les trois validations du commit `47e334fbfc35dc03632438705d6b6a689a92de3a` sont maintenant réussies : Workers, règles Firestore et APK Android debug.
- Ajout d'un second test de sécurité : une période cohérente peut être modifiée, mais une mise à jour qui ferait passer la date de fin avant la date de début est refusée par Firestore.
- Commit de ce test : `cfab95cc73960124cbc811496e769a8314e1198c`.
- CI du nouveau commit en cours : [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44908205955) · [APK Android](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44908205939).
- Le prochain contrôle reste l'audit des parcours hors connexion et des transitions d'état, sans essai réel sur appareil ni modification de production.


## Poursuite — audit PWA et cache local

- Ajout de `tests/service-worker-cache.test.mjs` : tests de régression statiques sur les ressources précachées, la liste blanche des SDK Firebase, les requêtes non-GET et l'absence de mise en cache des URL métier non listées.
- Vérification de la liste de précache sur l'arbre GitHub : 17 ressources explicitement listées existent; l'entrée `./` représente la racine de l'application.
- L'audit confirme que le service worker ne précache pas les réponses Firestore/Auth. Ce contrôle statique ne remplace pas la recette hors connexion sur téléphone.
- CI déclenchée pour le commit applicatif `9397c0e5ed612bacc53ef7f6699301c48bd5eefb` : [APK Android](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44908287789) et [règles Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44908287825). À la dernière lecture, la compilation APK était en cours et l'installation des outils de test Firestore se poursuivait.
- Le commit `cfab95cc73960124cbc811496e769a8314e1198c` a déjà obtenu la réussite du workflow Firestore, incluant le nouveau test de mise à jour des dates de projet.


## Poursuite — politique d'accès Activités / Présences — 21 novembre 2026

- L'arbitrage de l'écran commun est désormais explicite : ouverture avec `activities.read` ou `activities.manage`, puis affichage des feuilles uniquement avec `attendance.read` ou `attendance.manage`.
- Un compte « Présences seulement » conserve ses droits Firestore sur `attendance`, mais ne reçoit aucun droit de lecture des activités. Une vue autonome Présences pourra être développée plus tard, sans élargir aujourd'hui le périmètre de confidentialité.
- L'interface affiche maintenant un message précis lorsqu'un compte dispose d'un droit Présences mais pas du droit Activités requis par cet écran commun.
- Test de règles ajouté : un compte avec `attendance.read` et `attendance.manage` ne peut pas lire `activities`, peut lire les présences et peut enregistrer une présence pour une activité existante.
- Audit Lot 8 mis à jour pour fermer ce point d'arbitrage.
- Dernier commit de branche au moment de cette mise à jour : `cc705649b05b2f4b98131055d81081c14aa8b33e`.
- Validations CI déclenchées sur ce SHA : [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44911642880) · [APK Android debug](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44911642899). Elles étaient en cours à la dernière vérification.
- Aucune règle de production modifiée, aucun déploiement, aucune fusion et aucune publication Android.


## Poursuite — matrice des habilitations Club / Projets — 21 novembre 2026

- Ajout d'un test positif et négatifs pour la lecture des affectations : les scopes projects.read ET volunteers.read sont nécessaires; chacun pris isolément est insuffisant.
- Aucun changement des règles Firestore ni des données. Les scénarios utilisent uniquement des comptes et documents fictifs dans l'émulateur.
- Commit applicatif/test : 59e3ef11e48997b3a9ec122a87fa56cc3dc58efe. Documentation d'audit ajoutée ensuite : 3d1c716dfc123d87077dd2fc7e11921d72d96db3.
- Les validations CI du nouveau commit sont à contrôler avant de considérer ce point terminé.
- PR #20 reste ouverte en brouillon; aucune fusion, aucun déploiement ni publication.


## Audit de sécurité des aperçus Cloudflare — 21 novembre 2026

- Vérification de `firebase-init.js` et `.firebaserc` : la branche PR #20 pointe toujours vers le projet Firebase `wat-connect` (production).
- Un aperçu Cloudflare de cette branche peut donc charger le code de la PR tout en utilisant Firebase production. La prévisualisation Cloudflare n'est pas à considérer comme un environnement Firebase staging.
- Consigne documentée dans `docs/AUDIT-HORS-CONNEXION-ET-DONNEES-SENSIBLES.md` : aucun test connecté avec des données réelles sur cette URL; uniquement comptes et données fictifs jusqu'à séparation Firebase staging vérifiée.
- Aucun réglage Cloudflare, projet Firebase ou configuration d'application n'a été modifié. Le correctif de séparation doit être préparé et validé avant recette connectée.

## Poursuite — séparation effective des environnements — 21 novembre 2026

- Firebase staging vérifié à partir de la configuration déjà utilisée dans la PR #21 : `projectId: wat-connect-staging`. Les paramètres publics de staging correspondent au projet existant.
- Les aperçus Cloudflare de la branche sont routés vers Firebase staging par leur suffixe de domaine; les domaines ordinaires et l'application Android en configuration normale restent sur Firebase production.
- Correction importante pour les essais Android : le workflow APK debug injecte `WAT_FIREBASE_ENV=staging` uniquement dans la copie générée sous `web-dist`. Les sources de production ne sont pas basculées.
- Le workflow vérifie maintenant la syntaxe du fichier Firebase généré et confirme que le marqueur staging est bien embarqué avant de compiler l'APK.
- Configuration distincte `wrangler.staging.json` et workflow manuel de staging ajoutés. Le déploiement staging n'a pas été lancé; le workflow ne sera déclenchable qu'une fois présent sur la branche par défaut et les secrets de l'environnement staging configurés.
- Validation du commit `d8e69f541103cf0292a93be6a6da1c98d9a73d94` : [126 tests Firestore réussis](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44913155480) et [APK Android staging construit avec succès](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44913155562). Artefact : `wat-connect-android-staging-debug-apk`, disponible jusqu'au 5 décembre 2026.
- PR #20 reste ouverte en brouillon. Aucun merge, aucun déploiement staging ou production, aucune publication publique. La production Firebase et son Worker n'ont pas été modifiés.


## Mise à jour — 22 novembre 2026, validation des dates métier

- **HEAD PR #20 vérifié :** 46ea6cc77594f9a53124d88d2838fd6679691e34 ; branche fix/lot8-club-onboarding-and-access, base audit/wat-connect-lot8-projects-club-khuddam.
- **Firestore / tests applicatifs :** [workflow 44970329271 réussi](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44970329271) — **129 tests réussis, 0 échec, 0 ignoré**.
- **Android staging debug :** [workflow 44970329267 réussi](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44970329267). L'étape de préparation et le contrôle de routage Firebase staging ont réussi avant la compilation.
- **Artefact :** [wat-connect-android-staging-debug-apk — ID 14733133717](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44970329267/artifacts/14733133717), 4 371 944 octets, expiration le **6 décembre 2026**.
- Les deux workflows correspondent au même SHA exact ci-dessus. Aucun test physique Android n'est déclaré.

### Travail ajouté

- Les règles Firestore vérifient désormais le format ISO YYYY-MM-DD des dates Programmes, Projets et Activités.
- Les dates facultatives des Programmes et Projets sont validées ensemble; lorsque début et fin existent, la règle impose début inférieur ou égal à fin.
- Les trois nouveaux tests Emulator couvrent les dates mal formées, les périodes inversées et les mises à jour directes.
- La limite calendaire est documentée : la règle valide le format et l'ordre, mais ne calcule pas les jours impossibles d'un mois. Les formulaires utilisent des champs HTML de type date.

### Historique technique à interpréter correctement

- Le commit intermédiaire 0d6abf203114c8df525a4073fffe7f15a91415fb a été immédiatement suivi d'un commit correctif fast-forward 46ea6cc, qui restaure le fichier de règles complet puis applique les changements attendus. Aucun force push ni réécriture d'historique n'a été effectué.
- **Seul le HEAD 46ea6cc est validé par les workflows ci-dessus.** Le commit intermédiaire n'est pas un état de référence.

### Point de reprise

- Poursuivre l'audit des requêtes, scopes croisés et transitions d'état des modules Lot 8.
- Continuer la recette PWA/synchronisation et vérifier la cohérence des ressources staging Android.
- Garder la conception du registre universel au stade documentaire tant que le cahier des charges initial n'a pas été confronté à l'architecture.
- La PR #20 reste ouverte, en brouillon et non fusionnée. Les PR #10, #11 et #12 restent inchangées; le Lot 9 Finance demeure suspendu jusqu'à validation explicite du Lot 8.


## Poursuite — 22 novembre 2026 : isolation de session du registre Projets

- HEAD PR #20 avant cette correction : `e3b04361436f32425c86cf3b971e859265162d23`. Les validations Workers, Firestore et APK debug de ce SHA étaient toutes réussies.
- Constat : le module Projets conservait l'écran et les tableaux privés après déconnexion ou changement de compte; un chargement asynchrone lancé sous l'ancienne session pouvait également se terminer après le changement.
- Correction sur `projets.html` : fermeture de l'espace privé et vidage des tableaux à chaque événement d'authentification, invalidation par génération des chargements devenus obsolètes, revalidation après chaque lecture Firestore, y compris les affectations.
- Régression ajoutée dans `tests/projects-volunteers-syntax.test.mjs`.
- Commits : `e32a8da157e71d978887f07a910cf4bca4cf9655` (module), `f5927500f4392a84612e41efd19afeee1b2846fa` (test).
- Validations du nouveau HEAD : workflows Firestore et APK debug déclenchés, encore en cours au dernier contrôle. Ne pas confondre avec les validations réussies du SHA précédent.
- Audit complémentaire : les modules Club Khuddam et Activités présentent le même risque apparent de conservation de l'écran privé après déconnexion/changement de compte. À corriger sur la même branche avec tests dédiés, sans ouvrir de nouveaux droits.


## Extension de l'isolation de session aux modules Club et Activités — 22 novembre 2026

- Le correctif du registre Projets (`f5927500f4392a84612e41efd19afeee1b2846fa`) a reçu les deux validations ciblées : Firestore rules **succès** ([45065720627](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45065720627)) et APK debug **succès** ([45065720654](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45065720654)).
- Même risque identifié sur Club Khuddam et Activités/Présences : écran privé et données en mémoire conservés au changement de compte, avec risque de réponse asynchrone tardive.
- `club-khuddam.html` : fermeture de l'espace privé, remise à zéro des registres et invalidation des chargements de bénévoles/candidatures à chaque changement de session. Les historiques asynchrones des fiches bénévoles vérifient aussi la génération avant d'afficher les résultats.
- `activites.html` : fermeture et vidage des listes activités, présences, bénévoles et projets liés; invalidation des lectures asynchrones de l'écran et des feuilles de présence.
- Tests de régression ajoutés dans `tests/projects-volunteers-syntax.test.mjs` et `tests/activities-syntax.test.mjs`.
- Commits de ce groupe : `acd6bc6701e99c2568b6b4aa4e3c3e35450db695`, `e2126009dbb62e03d774f451b324aad85747908b`, `020e6b7fc3b2ec73ba1e06a5cb6b92df89837ca2`, `23f785a5baa5263a15b07e26b438faf550cef1e6`, `b20d513c8d2c1eb8685b37e2e4e92ae48e710718`, `29900e5d5155ebd1eeb99befae29438384a89663`.
- Les validations du HEAD courant doivent être vérifiées après le dernier commit; les succès du SHA `f592750` ne valent pas validation des nouveaux changements Club/Activités.


### Complément — invalidation des réponses devenues obsolètes

- Le registre Projets vérifie désormais aussi que le projet sélectionné n'a pas changé pendant le chargement d'une liste d'affectations.
- Le registre Activités/Présences vérifie que l'activité sélectionnée est toujours la même avant d'afficher une feuille de présence chargée de façon asynchrone.
- Tests ajoutés pour les deux courses de sélection.
- Commits complémentaires : `d1e96fe609fdc3643759b04dc809061c676e35c5`, `1389ab174d50ddf3c189f4be6c09747214e5a5f1`, `7567d4b7a37f0ec3727094541ce97d3a5709535c`, `25e51ff182d067a874863ad20fc54ed5b333862c`.
- Les validations du SHA `25e51ff` doivent encore être lues après conclusion des workflows; les résultats des commits précédents ne remplacent pas cette vérification.


### Extension au portail WAT Connect — 22 novembre 2026

- L'audit du portail principal a relevé que le tableau de bord restait affiché lors d'un changement de session externe et que plusieurs lectures de profil pouvaient se terminer après un changement de compte.
- `index.html` masque et vide maintenant l'espace membre à chaque événement d'authentification, vérifie la génération et le UID après les lectures asynchrones, et laisse l'observateur d'authentification piloter l'ouverture du tableau de bord après connexion.
- Test de régression ajouté dans `tests/portal-syntax.test.mjs`.
- Commits : `47a1a1500c1d8e69972abf70c7e0f734401dd311`, `0316172434bd74763a12900097eb188ca2cb13b6`.
- Validation du nouveau code à suivre sur le HEAD le plus récent. Aucun droit ni règle Firestore n'a été élargi.


### Validation complète des protections Projets / Club / Activités — SHA `25e51ff182d067a874863ad20fc54ed5b333862c`

- Firestore Emulator : **145 tests réussis, 0 échec** ([workflow 45066060546](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45066060546)).
- APK Android debug de staging : build réussi ([workflow 45066060522](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45066060522)).
- Ces résultats couvrent le nettoyage/invalidation des sessions Projets, Club et Activités/Présences ainsi que les tests de réponses d'affectation et de présence devenues obsolètes.
- Le portail principal a ensuite reçu son correctif de session (`47a1a150`, `0316172`); ses validations propres sont en cours et ne sont pas encore déclarées réussies.
