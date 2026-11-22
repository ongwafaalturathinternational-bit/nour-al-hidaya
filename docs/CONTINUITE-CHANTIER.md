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


### Nettoyage complémentaire des formulaires privés — 22 novembre 2026

- Lors d'un changement de compte, les formulaires de création/affectation de Projets, de gestion du Club et de pointage Activités/Présences sont maintenant réinitialisés en même temps que les listes privées.
- Le portail vide également le champ mot de passe lors de la remise à zéro de l'espace.
- Tests de régression ajoutés dans les suites syntaxiques Projets/Club, Activités et portail.
- Commits code : `872a719d746dfffca2cb0662ab8ca191a0db32fa`, `a79fde32813fc2db2e0ffa315c1c44e3552b4b4b`, `9355ec6e05e5a48b737ff31c7fec90c8872d0dd2`, `4465c6d887ac60076c6a8eb0a66213c116fb12f4`. Tests : `9e01660485c00e589dbc345a8299ae276ec28d12`, `d90ec4176b335ffd3939b0a50b4a6af694588bd3`, `1e6707235e1294338eb215302ab65cdbcea40792`, `06a3f13e3bede80fad1b2c7fb5aa8528eaf3eb58`.
- Validation à suivre sur ce nouveau HEAD; les résultats 145/145 et APK réussis ci-dessus concernent le SHA antérieur `25e51ff`, pas ces ajouts.


### Validation du portail et des protections de session — SHA `0316172434bd74763a12900097eb188ca2cb13b6`

- Firestore Emulator / tests applicatifs : **146/146 réussis, 0 échec** ([workflow 45066202340](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45066202340)).
- APK Android debug de staging : **build réussi** ([workflow 45066202405](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45066202405)).
- Cette validation couvre également le correctif de session du portail principal.
- Les réinitialisations de formulaires privées ont ensuite été ajoutées; leurs workflows dédiés sur le nouveau HEAD sont en cours et restent à vérifier.


## Poursuite — isolation de session des modules Programmes et Membres — 22 novembre 2026

- Audit des pages opérationnelles : les modules Programmes et Annuaire des Membres conservaient leurs listes privées et pouvaient afficher une réponse Firestore issue d'une session précédente après un changement de compte.
- Correctif dans `programmes.html` et `administration.html` : invalidation des requêtes asynchrones par génération de session, vérification du UID Firebase courant après les lectures, fermeture/masquage de l'espace privé et vidage des listes et formulaires à chaque transition d'authentification.
- Les opérations de modification et de création vérifient également que la session est toujours la même avant de réafficher les résultats.
- Test de régression ajouté : syntaxe JavaScript des deux pages, nettoyage de session et rejet des réponses obsolètes.
- Les changements sont sur la branche de travail uniquement. Les workflows CI correspondants doivent encore être contrôlés.
- Aucun droit Firestore, compte réel, donnée réelle, fusion ou déploiement n'a été modifié.


## Poursuite — isolation de session Nour Al-Hidaya — 22 novembre 2026

- Audit du parcours apprenant : les chargements asynchrones du profil, de la progression et des activités pédagogiques pouvaient continuer après un changement de compte; l'observateur Firebase ne nettoyait pas non plus l'état de session lors d'une déconnexion.
- Ajout d'un numéro de génération de session. Les réponses de profil, progression et données pédagogiques sont ignorées si l'identité Firebase ou la génération a changé.
- À chaque événement d'authentification en mode réel, l'interface quitte l'ancien rôle et réinitialise le contexte de navigation avant de charger le nouveau compte. Le mode de démonstration reste séparé.
- Les files locales de synchronisation restent séparées par UID; aucune file n'est transférée entre comptes.
- Test de régression ajouté pour la génération de session, les gardes après lecture et le nettoyage lors d'une transition d'authentification.
- Validation CI du nouveau code encore attendue. Ce correctif ne constitue pas une validation du chiffrement du stockage local : la persistance IndexedDB/localStorage n'est toujours pas un coffre sécurisé et les appareils partagés restent exclus pour les données sensibles.
- Aucun compte réel, document Firestore réel, règle de production, fusion ou déploiement n'a été modifié.


## Poursuite — sécurisation du dépôt de candidature Club Khuddam — 22 novembre 2026

- Le formulaire public de candidature pouvait conserver le contexte d'un ancien compte pendant un changement d'authentification, et une lecture ou un envoi asynchrone pouvait terminer après le changement de session.
- Ajout d'une génération de session, d'une remise à zéro des champs et de l'état privé lors de chaque transition, et de contrôles UID/génération après les lectures, actualisations de compte et avant la mise à jour de l'interface.
- Le dépôt d'une candidature vérifie maintenant que le même compte vérifié est toujours actif après le renouvellement du jeton et après l'écriture Firestore, avant d'afficher une confirmation.
- Ajout d'un test de régression sur la syntaxe et les gardes de session du formulaire.
- Validation CI de ce dernier lot en attente.
- Aucun dossier réel, compte, règle Firestore, fusion ou déploiement n'a été modifié.


## Poursuite — espace personnel du candidat Club Khuddam — 22 novembre 2026

- Audit du parcours candidat privé : le chargement était déjà protégé contre les réponses asynchrones tardives, mais le nettoyage de l'interface lors des transitions de compte était incomplet.
- Ajout d'une fonction de nettoyage qui efface l'adresse, le statut, les détails de candidature et l'état de vérification lors d'une déconnexion ou d'un changement de compte.
- Le chargement d'un nouveau compte commence par vider l'ancien état privé ; les contrôles de génération et d'UID continuent de bloquer les réponses de sessions précédentes.
- Ajout de vérifications de régression dans les tests du portail.
- La CI a révélé un test devenu obsolète après le durcissement du formulaire de candidature : il attendait les anciens noms de variables. Le test a été ajusté pour accepter les nouveaux noms tout en vérifiant le renouvellement du compte et du jeton.
- CI à relancer sur le dernier commit ; aucun déploiement ni fusion.


## Poursuite — synchronisation hors connexion Nour Al-Hidaya — 22 novembre 2026

- Les files locales de progression et de travaux pédagogiques sont propres à chaque UID, mais leurs boucles de synchronisation ne revérifiaient pas la session après chaque écriture asynchrone.
- Ajout de contrôles de génération/UID avant et après chaque écriture Firestore. Si le compte change, la boucle s'arrête et ne réécrit pas la file locale avec un état partiel.
- Ajout d'un test de régression couvrant les deux synchronisations.
- Les données locales restent stockées dans le navigateur sous des clés propres à l'apprenant ; ce mécanisme n'est pas un coffre chiffré et ne remplace pas une stratégie de protection des appareils partagés.
- Validation CI du dernier lot en attente.


## Poursuite — opérations sensibles du registre Club Khuddam — 22 novembre 2026

- Les actions d'acceptation/refus de candidature et d'ajout/modification d'un bénévole capturent désormais l'UID et la génération de session qui ont initié l'opération.
- Les transactions et écritures utilisent cet UID capturé au lieu de relire une variable utilisateur globale susceptible d'avoir changé.
- Les résultats tardifs ne réinitialisent plus le formulaire, ne relancent plus le chargement et n'affichent plus de message dans une session différente.
- Le gestionnaire d'erreur de l'observateur d'authentification ignore également les erreurs issues d'une ancienne session.
- Ajout de tests de régression ciblant ces protections.
- Les opérations Firestore déjà envoyées au serveur ne peuvent pas être annulées rétroactivement par le navigateur ; les règles Firestore restent l'autorité d'accès. Aucune règle ni donnée réelle n'a été modifiée.


## Poursuite — opérations projets, affectations, activités et présences — 22 novembre 2026

- Les créations et changements de statut de projets, les affectations de bénévoles, les créations d'activités et les enregistrements/actualisations de présence capturent désormais l'UID et la génération de session d'origine.
- Les contrôles d'identité sont répétés après les lectures/écritures asynchrones ; les résultats d'une ancienne session ne réinitialisent plus les formulaires ni les listes d'un autre compte.
- Les erreurs tardives de chargement des modules Projets et Activités ne peuvent plus afficher un message dans une session qui a déjà changé.
- Ajout de tests de régression sur les opérations sensibles des deux modules.
- Les règles Firestore restent la protection serveur ; aucune règle ni donnée réelle n'a été modifiée.


## CI — ajustement du test d'audit des candidatures — 22 novembre 2026

- Le premier passage CI après le durcissement du traitement des candidatures a signalé une assertion historique qui recherchait encore `reviewedBy:user.uid`.
- Le code utilise désormais l'identité capturée `actor.uid`, précisément pour éviter qu'un changement de compte modifie l'auteur d'une opération en cours.
- L'assertion a été mise à jour pour vérifier cette identité capturée. Les validations du commit correctif sont en cours.


## Poursuite — sécurisation des formulaires Club — 22 novembre 2026

- Les deux workflows du commit précédent `14de9a7d5f2cfbe5f0d0245f552bedba16c836c8` sont réussis : règles Firestore et APK Android staging.
- Audit complémentaire du formulaire public Club : les champs mot de passe de création de compte et de connexion sont maintenant vidés à chaque transition de session Firebase, notamment après connexion et déconnexion. Cela évite de laisser un secret saisi dans un champ masqué ou réutilisable après changement de compte.
- Test de régression ajouté dans `tests/club-candidate-session.test.mjs`.
- Commits de cette correction : `0c5bc002` (page) et `5371a0fb` (test). Les validations CI de ce nouvel état doivent encore être confirmées.
- L'espace personnel candidat reste distinct du registre interne; aucun droit d'équipe n'est accordé par cette correction.
- Aucun compte, dossier réel, paramètre Firebase, merge ou déploiement de production n'a été touché.


## Poursuite — durcissement de l'espace candidat — 22 novembre 2026

- Audit de `club-khuddam-espace.html` : ajout de l'effacement du mot de passe dans le nettoyage de l'espace privé et après toute tentative de connexion.
- Les réponses tardives de connexion ne peuvent plus afficher un message d'erreur sur une session qui a changé.
- Le renvoi de vérification exige désormais une session courante valide avant l'envoi.
- La demande de réinitialisation du mot de passe vérifie la génération et l'identité de session avant d'afficher son résultat, afin d'éviter les messages obsolètes après un changement de compte.
- Tests statiques de régression ajoutés pour ces garde-fous dans `tests/club-candidate-session.test.mjs`.
- Ces modifications sont limitées à l'espace candidat et à ses tests; elles ne changent pas les règles ni les droits d'accès.


## Mise à jour — 22 novembre 2026, sécurisation finale du parcours candidat

- **HEAD de la branche :** `0d2c097d6b5734c0bf56a4def7c2da4a14896a8e` (mise à jour documentaire).
- **Dernier commit applicatif :** `528ef913c931ff9001e7e0fd000b0206d1ad8ddc`.
- **PR #20 :** ouverte, brouillon, non fusionnée; aucune publication en production.

### Validations CI du HEAD de branche

- **Règles Firestore : réussi** — [workflow 45070114394](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45070114394).
- **APK Android staging : réussi** — [workflow 45070114420](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45070114420). Les étapes de préparation Firebase staging, génération du projet Android, synchronisation et compilation debug ont terminé avec succès.
- Les mêmes validations ont également réussi sur le commit applicatif `528ef913...` : [Firestore 45070095578](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45070095578) et [APK 45070095614](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45070095614).

### Contrôle statique complémentaire

- Relecture du formulaire public, de l'espace candidat, des règles `volunteerApplications` et des tests associés.
- Le dépôt public exige une session courante, une adresse vérifiée et un consentement explicite; le document est créé sous le UID du candidat.
- Le candidat ne peut ni lister les dossiers, ni modifier son dossier après dépôt, ni décider de son acceptation. Les responsables doivent disposer de `volunteers.read` ou `volunteers.manage`; seul `volunteers.manage` permet de traiter une candidature.
- Les opérations asynchrones du portail candidat vérifient la session après les attentes réseau; le mot de passe est effacé après la tentative de connexion.
- Aucun défaut bloquant supplémentaire n'a été constaté dans ce contrôle statique. Il ne remplace pas la recette manuelle avec comptes Firebase fictifs ni le test sur téléphone Android réel.

### Suite du chantier

1. Préparer et conserver une recette courte pour tester dépôt, vérification d'e-mail, suivi, changement de compte et révocation d'accès.
2. Poursuivre l'audit des modules opérationnels et de leurs transitions d'état.
3. Garder l'inscription universelle Nour Al-Hidaya et les notifications comme chantiers distincts; ne pas les déclarer livrés.
4. Ne pas fusionner la PR, déployer en production ou toucher aux données et comptes réels sans autorisation explicite.


## Audit complémentaire — modules Projets, Activités et Club — 22 novembre 2026

Contrôle statique effectué sur `projets.html`, `activites.html`, `club-khuddam.html` et les règles Firestore correspondantes :

- Les trois modules invalident les chargements lorsqu'une nouvelle session commence et vérifient la génération de session après les lectures asynchrones principales.
- Les actions d'écriture vérifient le compte courant et le scope attendu avant l'opération; les erreurs ne sont affichées que si la session reste courante.
- Le module Activités distingue les scopes Activités et Présences. L'écran commun refuse explicitement l'accès à un compte Présences seul; aucun scope n'est ajouté automatiquement.
- Le registre Club sépare la lecture des candidatures (`volunteers.read`) de leur traitement (`volunteers.manage`). L'acceptation crée la fiche bénévole et clôt la candidature dans une transaction; les règles Firestore imposent aussi une décision unique depuis l'état en attente.
- Le module Projets exige un scope projet et un scope Club pour consulter ou gérer les affectations nominatives. La règle serveur empêche de réactiver une affectation si le bénévole est inactif ou absent.

**Résultat :** aucun élargissement de permission ni défaut bloquant supplémentaire n'a été identifié dans ce contrôle statique. Les tests automatisés CI du HEAD de branche restent réussis (workflows 45070114394 et 45070114420). Les scénarios multi-comptes, révocation en cours d'utilisation, transactions concurrentes et usage hors connexion restent à tester avec des comptes fictifs et sur appareil réel.

Cette entrée est consignée dans le journal de continuité de la branche de travail.


## Complément audit parcours candidat public — 22 novembre 2026

- Le formulaire public efface maintenant le mot de passe après chaque tentative de création de compte ou de connexion, y compris en cas d'échec.
- Les messages d'erreur des opérations d'authentification sont ignorés si la session a changé entre-temps; cela évite qu'une réponse tardive remplace l'état du compte actuellement connecté.
- Ajout d'un test de régression couvrant l'effacement des deux mots de passe et les garde-fous de génération de session.
- Commits : page `5acbc74b`; tests `b36cece5`.
- Les workflows Firestore et APK staging doivent être vérifiés sur le HEAD résultant avant de considérer cette correction validée.
- Aucun compte ni dossier réel n'a été modifié; aucune fusion ni publication production.


## Garde de session — annuaire des membres — 22 novembre 2026

- L'audit de `administration.html` a relevé que le formulaire de création de fiche membre ne vérifiait pas explicitement que la session administrative était toujours courante juste avant l'écriture Firestore.
- Ajout d'un contrôle `isCurrentStaffSession` avant et après l'écriture, capture de l'identité de l'agent au début de l'action et limitation du rétablissement du bouton à la génération de session d'origine.
- Ajout d'un test statique de régression dans `tests/operational-block.test.mjs` couvrant le contrôle de session et le comportement du formulaire.
- Commits : correctif `91e2e92bbb79fd635daf3b0e25a02d676a084155`, test `de105b54b46569f2208022ccc8515da2924cec3b`.
- Les validations Firestore/application et APK Android staging du HEAD `de105b54...` sont déclenchées automatiquement; leur résultat doit être vérifié avant de considérer ce lot validé.
- Contrôle statique uniquement : aucune fiche membre ni donnée réelle modifiée. PR #20 reste ouverte en brouillon; aucune fusion ni publication production.

- Extension du garde-fou aux changements de statut des fiches membres : vérification de la session avant l'écriture, après l'écriture et avant l'affichage du résultat. Test de régression étendu. Commits : correctif complémentaire `5137330`, test `df00787`.

- Le workflow Firestore ne déclenchait pas la suite pour `tests/operational-block.test.mjs`. Ajout de ce fichier à ses chemins surveillés afin que les futurs changements de garde opérationnelle exécutent effectivement la suite complète. Commit workflow `06bf158f63ab2b53ac6f8c42cded901af87f28aa`; les validations déclenchées sur ce commit couvriront le correctif annuaire et son test de régression.


## Correction validation e-mail — espace candidat — 22 novembre 2026

- Correction du motif de validation dans le bouton « Mot de passe oublié » de `club-khuddam-espace.html`. Le motif contenait des antislashs doublés dans le JavaScript livré et pouvait rejeter les adresses e-mail ordinaires.
- Ajout d'un test de régression dans `tests/club-candidate-session.test.mjs` pour vérifier le motif attendu et empêcher le retour de l'échappement incorrect.
- Commit applicatif et test : `0c57c80d14c64101d6450880f12c6888a19ab5af`.
- CI Firestore : réussi — [workflow 45075973731](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45075973731).
- Build APK Android staging : encore en cours au moment de cette entrée — [workflow 45075973650](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45075973650).
- PR #20 reste ouverte en brouillon et non fusionnée. Aucun compte, dossier réel ou environnement de production n'a été modifié.


## Durcissement du référentiel Programmes — 22 novembre 2026

- L'audit de `programmes.html` et des règles Firestore a relevé un écart : le formulaire exige une description non vide, mais les règles serveur acceptaient une description vide.
- Les règles Firestore imposent maintenant une description texte d'au moins un caractère et de 1 500 caractères maximum, à la création comme à la modification.
- Tests Emulator ajoutés pour refuser une description vide et une valeur de type incorrect, en complément du rejet d'un statut invalide.
- Commits : règles `8640dac368c26f18a3f87dbc3abae374ee4c3c08`, test `2e58b50a9162a1a23f5243f2940b6e86695ba758`.
- Les validations Firestore et APK Android staging du nouveau HEAD doivent être contrôlées avant de déclarer ce correctif validé.
- Aucun document, compte ou profil réel n'a été modifié; aucune fusion ni publication en production.


## Validation et audit de suivi — 22 novembre 2026

- Le commit applicatif/test `2e58b50a9162a1a23f5243f2940b6e86695ba758` a obtenu les validations Firestore et Android staging : [Firestore 45076496819](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45076496819) et [APK staging 45076496829](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45076496829). Les étapes de préparation Firebase staging, vérification du routage, compilation et publication de l'artefact ont toutes réussi.
- La PR #20 a ensuite reçu le commit documentaire `834f19889a24e5608ca33ae630eb266a57485a1f`; elle reste ouverte, en brouillon et non fusionnée.
- Audit statique complémentaire de `administration.html` : lecture des fiches réservée à `members.read` ou `members.manage`; création et changement de statut réservés à `members.manage`; identité de l'agent capturée avant écriture; génération et UID vérifiés après les opérations; nettoyage de l'annuaire et du formulaire lors des transitions d'authentification. Les valeurs affichées sont échappées avant insertion HTML.
- Aucun défaut bloquant supplémentaire n'a été relevé dans ce contrôle statique. Il ne remplace pas les essais multi-comptes et révocation avec comptes fictifs.
- Aucun compte, document réel, permission de production, déploiement ou fusion n'a été modifié.


## Correction du routage des modules apprenants — 22 novembre 2026

- L'audit du portail principal et de `nour-al-hidaya.html` a révélé que le portail affichait le module Nour Al-Hidaya à tout compte d'équipe actif, alors que la page pédagogique exige un profil Firebase de rôle `apprenant`. Un membre d'équipe sans ce profil voyait donc un raccourci qui conduisait à un refus d'accès et à une déconnexion.
- Le portail n'affiche désormais ce raccourci aux membres d'équipe que si leur profil possède aussi le rôle apprenant. Les comptes à double usage restent compatibles; aucun droit supplémentaire n'est accordé.
- Test de régression ajouté à `tests/operational-block.test.mjs`.
- Commits : portail `32ca496d6aaf222d50d586447a4489843cb1d848`, test final `398c6b81de176846bd54fd93bf6128ead60cb458`.
- Validations Firestore et APK staging déclenchées sur le nouveau HEAD; résultats à confirmer : [Firestore 45077560922](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45077560922) · [APK 45077560842](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45077560842).
- Aucun compte, profil, droit Firebase, donnée réelle, fusion ou déploiement n'a été modifié.


## Correction du test de visibilité Nour Al-Hidaya — 22 novembre 2026

- La première exécution CI après le changement de portail a révélé une erreur de syntaxe dans le nouveau test `tests/operational-block.test.mjs` (pas dans le portail lui-même). Les 155 autres tests ont réussi; le fichier de test n'a pas pu être chargé.
- Le test a été corrigé avec des assertions textuelles simples, vérifiant que le module Nour Al-Hidaya est conditionné par le rôle apprenant et n'apparaît qu'une fois dans la branche équipe.
- Correctif test : `3ce43c0037b530ba49d400ff66a18fc3ea0d7d1c`. Le workflow Firestore précédent avait échoué à cause de cette syntaxe de test; le workflow APK staging avait réussi.
- Nouvelle validation CI déclenchée sur le test corrigé. Ne pas considérer la suite validée avant son résultat.


## Nettoyage du mot de passe dans WAT Connect — 22 novembre 2026

- Le formulaire de connexion central efface maintenant le mot de passe après toute tentative, réussie ou échouée, tout en réactivant le bouton de connexion.
- Test de régression ajouté dans `tests/portal-routing.test.mjs`.
- Commits : portail `54e40f1c985c593e2c26330386d090a6bc28a9c1`, test `563bd85bae8d5b757fdd6ca64f10da2ad65ca13a`.
- La validation CI du correctif précédent a été relancée après correction de la syntaxe du test de visibilité. Les nouveaux contrôles pour le nettoyage du mot de passe sont également déclenchés sur le dernier HEAD.
- Aucune donnée réelle, aucun compte ni configuration de production touchés.


## Validation finale — 22 novembre 2026, contrôle de la connexion

- HEAD applicatif validé : `563bd85bae8d5b757fdd6ca64f10da2ad65ca13a`.
- Tests Firestore / application : **164 réussis, 0 échec, 0 ignoré** — [workflow 45077812680](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45077812680).
- APK Android **staging debug** : préparation Firebase staging, contrôle du routage, compilation et publication réussis — [workflow 45077812782](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45077812782).
- Artefact : `wat-connect-android-staging-debug-apk`, ID `14776440357`, 4 374 693 octets, empreinte SHA-256 `8e35ae72ed7b710961941331511943ba40888da0b76c1e2214a32ccb16c2dd4b`, expiration le **6 décembre 2026**.
- Le HEAD PR #20 actuel est `b97dbcdb280eae701ef8af2b63ffbf79bb61c4b0`. La comparaison GitHub confirme que son unique commit après le SHA validé modifie uniquement ce journal documentaire; aucun code applicatif n'a changé depuis les validations.
- La PR #20 reste ouverte, en brouillon et non fusionnée. Aucun compte, dossier réel, configuration Firebase distante ou environnement de production n'a été modifié. La recette sur appareil Android physique reste à faire.

## Garde de session dans le module Programmes — 22 novembre 2026

- Les opérations de création et de changement de statut vérifient maintenant que l'utilisateur connecté, son UID et la génération de session correspondent toujours à la session active, avant et après l'écriture Firestore.
- Une réponse asynchrone issue d'une ancienne session ne déclenche plus le rechargement de la vue ni un message de succès/erreur destiné à une nouvelle session.
- Le bouton de soumission n'est réactivé que si la génération de session d'origine est toujours active.
- Test statique de régression ajouté dans `tests/operational-block.test.mjs`.
- Validation du HEAD applicatif `fa6c8a293f2545ff7206801aa47183d88cfbe82d` : workflows Firestore/application et Android staging tous deux **réussis** — [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45078434113) · [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45078434099).
- Artefact APK staging debug : `wat-connect-android-staging-debug-apk`, ID `14776605615`, 4 374 754 octets, expiration le **6 décembre 2026** — [ouvrir le workflow et récupérer l'artefact](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45078434099).
- La PR #20 reste ouverte, en brouillon et non fusionnée. Aucun compte, dossier réel, secret, configuration distante ni environnement de production n'a été modifié. La recette Android physique reste à faire.

## Protection des chargements asynchrones — modules Projets et Activités — 22 novembre 2026

- Les chargements des modules Projets et Activités vérifient désormais l'UID Firebase courant, la session active et sa génération après chaque lecture asynchrone principale, et avant d'afficher les résultats.
- La lecture des affectations de bénévoles et celle des présences ignorent aussi les réponses arrivant après un changement de compte ou de sélection.
- L'initialisation vérifie l'identité Firebase réelle après l'attente de la persistance et après la lecture du document d'accès équipe; une ancienne session ne peut plus terminer l'initialisation en s'appuyant uniquement sur un compteur de génération.
- Test de régression ajouté dans `tests/operational-block.test.mjs`.
- Commits applicatifs : `c6e0f41e13747553add2ae318d47e2ab90cb64b2` (Projets), `35c6e9a5c1b16a567f898310e553b11dcf9c3e98` (Activités). Test : `15be63f05ec8119748de50fe2460c184e1d300a6`.
- CI sur le commit de test `15be63f05ec8119748de50fe2460c184e1d300a6` : tests Firestore/application et build Android staging lancés, résultats en attente au moment de cette note — [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45080392825) · [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45080392493).
- Aucun compte réel, dossier membre, secret ou environnement de production n'a été modifié. PR #20 toujours en brouillon et non fusionnée.


## Mise à jour — 22 novembre 2026, sécurisation des sessions Projets / Activités / Club

- **Commit applicatif validé :** `881dd2a2e220fabcc77f5d19818a39bdf3f49c4d`.
- Les chargements asynchrones des modules Projets, Activités et Club Khuddam vérifient désormais le compte Firebase et la génération de session avant/après les lectures sensibles. Les fiches et historiques ignorent les réponses d'une session devenue obsolète.
- Les tests de régression ont été ajustés pour vérifier l'identité Firebase réelle en plus du compteur de génération.
- **Règles Firestore et tests :** [workflow 45080899691 réussi](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45080899691).
- **APK Android staging :** [workflow 45080899605 réussi](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45080899605).
- **Artefact APK staging debug :** [wat-connect-android-staging-debug-apk — ID 14777455995](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45080899605/artifacts/14777455995), 4 374 852 octets, SHA-256 `95fc9f544029ebb5ad19490925ee38678531151b9b3e5b0b9ae8d669608ccddc`, expiration le **6 décembre 2026 à 23:02 UTC**.
- Ces validations correspondent au commit applicatif ci-dessus. Elles ne remplacent pas la recette sur téléphone Android réel.
- PR #20 reste ouverte, en brouillon, non fusionnée et non déployée. Aucun compte, secret ou donnée Firebase réelle n'a été modifié.
