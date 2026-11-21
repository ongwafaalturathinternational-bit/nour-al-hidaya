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
