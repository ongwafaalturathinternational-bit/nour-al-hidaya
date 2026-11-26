# WAT Connect — Journal d'intervention Antigravity

**Branche active :** `antigravity/lot1-qualification-technique`  
**Branche de référence :** `origin/codex/wat-nour-recette-route` (SHA `25a94d28a599618abadcecbfd245ef883d98a078`, 25 novembre 2026)  
**Dernière mise à jour :** 26 novembre 2026  

---

## 1. Lot 1 — Qualification technique

### 1.1 Cartographie des sommets candidats (vérifiée par `git merge-base` et `git rev-list`)

`origin/codex/wat-nour-recette-route` (`25a94d2`) est un **sur-ensemble linéaire strict** (`behind=0` par rapport à soi-même, ancêtre direct) des branches de consolidation suivantes :

| Branche | SHA court | Écart vs `wat-nour-recette-route` | Contenu intégré |
|---|---|---|---|
| `origin/codex/wat-nour-recette-route` | `25a94d2` | Référence (0) | Socle + Finance + Nour sync + Agenda export + Portail + CI |
| `origin/codex/wat-portail-acces-nour` | `adb1edd` | -1 commit | Cohérence raccourci Nour dans le portail |
| `origin/codex/wat-consolidation-ci` | `98b71f8` | -2 commits | CI services consolidés Agenda + Nour |
| `origin/codex/wat-agenda-consolidation-tests` | `2244789` | -3 commits | Assemblage Agenda + Nour |
| `origin/codex/wat-finance-deconnexion-partagee` | `dcb46ca` | -24 commits | Déconnexion partagée Finance |
| `origin/codex/wat-finance-paquet-conjoint` | `1dd663d` | -29 commits | Paquet conjoint Finance + WAT |
| `origin/codex/wat-nour-recette-conjointe` | `dd56b46` | -55 commits | Synchronisation Nour sur WAT intégré |

### 1.2 Branches divergentes identifiées

| Branche | SHA court | Divergence vs `wat-nour-recette-route` | Nature |
|---|---|---|---|
| `origin/codex/agenda-suivi-distribution` | `e605f70` | +11 commits / -74 commits | Suivi distribution rappels Agenda + `lib/wat-calendar.mjs`, `lib/wat-reminders.mjs` |
| `origin/codex/activites-presences-continuite` | `49056e3` | +4 commits / -74 commits | Procédure Agenda + continuité Activités/Présences (PR #44/#45) |
| `origin/codex/activites-session-registre` | `9bc827a` | +2 commits / -74 commits | Saisies Activités/Présences et reprise (PR #44/#45) |
| `origin/codex/nour-config-route-agent` | `98c6d3a` | Divergente (reprise partielle) | Ancienne branche `learning-api` déjà réintégrée autrement dans `25a94d2` |

### 1.3 Exécution des suites de tests locales (Node `v26.13.1`, environnement isolé)

**Distinction stricte :**

- **Tests exécutés localement (35 fichiers, sans émulateur Java) :**
  - **Résultat : 35 / 35 fichiers PASS — 364 / 364 tests individuels réussis, 0 échec, 0 ignoré.**
  - Détail : `activities-syntax` (24), `admin-syntax` (3), `android-build` (5), `android-field-feedback` (7), `app-syntax` (6), `club-candidate-session` (11), `finance-access-policy` (7), `finance-syntax` (51), `finance-table-a11y` (2), `firebase-default-project` (3), `firebase-init` (9), `learning-api-assignment-policy` (8), `learning-api-assignment-service` (11), `learning-api-audit` (5), `learning-api-beneficiary-authorization` (9), `learning-api-config` (6), `learning-api-firestore` (16), `learning-api-google-auth` (8), `learning-api-learning-authorization` (15), `learning-api-registration-idempotency` (2), `learning-api-registration-request` (2), `learning-api-registration-service` (2), `learning-api-resource-resolver` (10), `learning-api-staff-auth` (14), `learning-api-turnstile` (7), `learning-api-worker` (11), `offline-sync` (16), `operational-block` (10), `portal-routing` (8), `portal-syntax` (14), `programs-syntax` (3), `projects-volunteers-syntax` (26), `pwa-shell` (8), `service-worker-cache` (5), `wat-calendar` (15).
- **Tests non exécutés localement (10 fichiers `.rules.test.mjs` + `scripts/check-web-precache.mjs`) :**
  - `activities.rules.test.mjs`, `date-validation.rules.test.mjs`, `finance.rules.test.mjs`, `firestore.rules.test.mjs`, `learner-private-learning.rules.test.mjs`, `members.rules.test.mjs`, `programs.rules.test.mjs`, `projects-volunteers.rules.test.mjs`, `user-profile-validation.rules.test.mjs`, `volunteer-applications.rules.test.mjs` : requièrent **Java + Firebase Firestore Emulator** (non installés dans le poste local).
  - `scripts/check-web-precache.mjs` : échoue localement (`ENOENT` sur `web-dist/sw.js`) car le build `npm run build:android:web` n'a pas été généré dans ce conteneur.

---

## 2. Lot 2 — Consolidation et conflits (Analyse par `git merge-tree`)

| Conflit étudié | État Codex | Constat technique (`git merge-tree`) | Recommandation Antigravity |
|---|---|---|---|
| **Finance / WAT** | **Résolu par Codex** | Déjà intégré dans `wat-finance-paquet-conjoint` (`1dd663d`), `wat-finance-deconnexion-partagee` (`dcb46ca`) et `wat-nour-recette-route` (`25a94d2`). | Aucune action requise ; conserver `25a94d2` comme base. |
| **Nour (`nour-config-route-agent` vs `25a94d2`)** | **Résolu fonctionnellement** | `wat-nour-recette-route` (`25a94d2`) contient déjà `workers/learning-api/*` et la restriction staging (`config.js`). Les conflits `add/add` viennent uniquement de deux historiques parallèles. | Ne pas re-fusionner `nour-config-route-agent` ; travailler uniquement depuis `25a94d2`. |
| **Agenda / Rappels (`agenda-suivi-distribution` `e605f70` vs `25a94d2`)** | **Déjà résolu et dépassé dans `25a94d2`** | La comparaison directe `git diff 25a94d2 e605f70` prouve que `wat-nour-recette-route` (`25a94d2`) contient déjà les versions plus avancées de `lib/wat-calendar.mjs` (+53 lignes), `lib/wat-reminders.mjs` (garde `prepareReminder` et `receipt-unconfirmed`), `tests/wat-calendar.test.mjs` (+283 lignes), `activites.html`, `programmes.html` et `projets.html`. | Ne pas rétrograder `25a94d2` en fusionnant `e605f70`. La branche `antigravity/lot2-reconciliation-agenda` est conservée à l'identique sur `25a94d2` comme trace de vérification. |
| **PR #44 / #45 (`activites-presences-continuite` vs `activites-session-registre`)** | **Déjà intégrées et dépassées dans `25a94d2`** | `25a94d2` contient déjà les correctifs de continuité et de purge de session des quatre registres (`tests/activities-syntax.test.mjs` +145 lignes vs `49056e3`). | Confirmation formelle à soumettre à la Présidence/Codex pour clôturer les anciennes PR #44/#45 sans nouvelle fusion. |

---

## 3. Lot 3 — Audit de sécurité (`firestore.rules`, 1 146 lignes)

### Points conformes vérifiés
- Politique **fail-closed** par défaut (`match /{document=**} { allow read, write: if false; }`).
- Exigence systématique de `request.auth.token.email_verified == true` et `staffAccessData(uid).active == true`.
- Séparation des tâches respectée sur `financeTransfers` (`request.auth.uid != resource.data.createdBy` pour valider/rejeter).
- `staffAccess` en lecture seule pour son propre UID (`list`, `create`, `update`, `delete` interdits).

### Correctif préparé sur `antigravity/lot3-securite-observations` (commit `39f18d3`)
- **`firestore.rules` lignes 1097–1108 (`financeControlObservations` — `allow update`)** : ajout de la revalidation `&& request.resource.data.description is string && request.resource.data.description.size() >= 10 && request.resource.data.description.size() <= 4000` (alignée sur `allow create`).
- **`tests/finance.rules.test.mjs` lignes 577–588** : ajout de 3 tests négatifs (description < 10 caractères, type non textuel `12345`, longueur > 4 000 caractères). Syntaxe vérifiée (`node --check`), exécution complète soumise à la CI Firestore Emulator après publication.

### Renforcement exécuté localement (`tests/finance-access-policy.test.mjs`)
- Ajout d'un test négatif de séparation des fonctions (`financial_reader`, `financial_manager`, `financial_validator`, `budget_manager`, `accounting_admin`) et de rejet des actions non textuelles/héritées (`null`, `undefined`, `123`, `"toString"`, `"has"`).
- **Preuve :** `node --test tests/finance-access-policy.test.mjs` → **8 / 8 tests réussis, 0 échec**.

---

## 4. Lot 4 — Audit d'intégration continue (`.github/workflows/`)

1. **`firestore-rules.yml` (ligne 59)** : exécute `node --test tests/*.test.mjs`, ce qui **omet les 16 fichiers `tests/learning-api-*.test.js`**. À l'inverse, `agenda-staging-package.yml` exécute `learning-api-*.test.js`, `wat-calendar.test.mjs` et `activities-syntax.test.mjs`.
2. **Déclencheurs Cloudflare sur branches documentaires (`work/*`)** : les aperçus Cloudflare échouent avec `Script not found "build:android:web"` sur les PR purement documentaires basées sur `main` (absence de `package.json`). Recommandation : filtrer ou exclure `docs/**` dans la politique d'aperçu Cloudflare.
3. **`android-apk.yml`** : exécute une compilation complète Android SDK 36 + Gradle (jusqu'à 30 min) dès qu'un fichier HTML ou `sw.js`/`manifest*.json` est modifié. Optimisation possible sans affaiblir les contrôles : conserver le build complet sur les changements natifs/Capacitor (`package.json`, `capacitor.config.json`, `scripts/**`) et n'exécuter `check-web-precache.mjs` + `build:android:web` que lorsque seules les pages/ressources statiques changent (sous réserve d'approbation Présidence/Codex).

---

## 5. Prochaines étapes et point de reprise

- **Blocage d'authentification GitHub constaté :** `git push -u origin antigravity/lot1-qualification-technique` reste en attente d'authentification interactive GitHub (et `gh` CLI n'est pas installé localement). Intervention de la Présidence requise pour authentifier le `push` et ouvrir les PR en brouillon :
  1. `antigravity/lot1-qualification-technique` (base `codex/wat-nour-recette-route`) — Journal & tests négatifs `finance-access-policy.test.mjs` (8/8 PASS).
  2. `antigravity/lot3-securite-observations` (`39f18d3`, base `codex/wat-nour-recette-route`) — Correctif `financeControlObservations` + 3 tests négatifs (validation CI Firestore Emulator à lancer via PR brouillon).
  3. `antigravity/lot2-reconciliation-agenda` (conservée sur `25a94d2` sans modification, comme preuve de non-régression).
- **Vérification anti-doublon (`git fetch --all --prune`) :** aucun nouveau commit Codex/Work depuis le 25 novembre 2026 (`25a94d2`).
