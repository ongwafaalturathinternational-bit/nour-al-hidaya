# Plan de consolidation WAT Connect

État vérifié le 24 novembre 2026. Les sept PR sont ouvertes et GitHub indique que chaque tête est fusionnable avec sa cible actuelle. Toute fusion nécessite une autorisation.

| PR | Tête vérifiée | Cible actuelle | Contrôles |
| --- | --- | --- | --- |
| [#20](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/20) | `dfe3a67b83cc` | `audit/wat-connect-lot8-projects-club-khuddam` | [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45096788793) réussi, [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45096788833) réussi |
| [#30](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/30) | `6283af30fc72` | `fix/android-field-test-feedback` | [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45241208825) réussi, [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45241208881) réussi |
| [#36](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/36) | `ba65361b8f7e` | `main` | Aucun workflow PR ni statut classique sur ce SHA |
| [#37](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/37) | `084208c50af0` | `codex/android-stabilisation` | [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45286839273) réussi, [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45286839412) réussi |
| [#38](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/38) | `8ed1647305a5` | `codex/nour-sync-concurrence` | [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45289005818) réussi, [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45289005744) réussi |
| [#39](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/39) | `97bbb8ad8953` | `codex/android-stabilisation` | [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45289022627) réussi, [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45289022618) réussi |
| [#40](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/40) | `88e4a821adeb` | `fix/lot8-club-onboarding-and-access` | [Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45289943138) réussi, [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45289942874) réussi |

## Ordre de revue

1. Examiner la base de #20, puis #20. Sa tête fait déjà partie de l’historique de #30. Examiner ensuite #29, dont la branche est la cible de #30, puis #30. La recette Android physique couvre notamment le rendu, le retour à WAT et les trois langues.
2. Sur le socle #30, examiner #37 puis #38 pour l’envoi hors connexion. Les PR #63 à #65 prolongent cette pile. Examiner #39 en parallèle pour la purge après déconnexion. Vérifier ensemble la reprise de synchronisation et le changement de session avec des comptes staging.
3. Examiner #40 sur #20 en parallèle. Vérifier la vérification de l’adresse, la reprise de session et l’accès à la candidature avec des comptes fictifs.
4. Examiner #36 indépendamment. Ses trois fichiers sont documentaires. Le contrôle Cloudflare ci-dessous précise les limites du signalement.

## Vérification des conflits

Dix simulations Git à blanc ont produit un arbre sans conflit sur les couples #20/#30, #20/#37, #20/#38, #20/#39, #30/#40, #38/#39, #38/#40, #39/#40, #36/#20 et #36/#30. Les fichiers communs comprennent `nour-al-hidaya.html` sur la pile Android et synchronisation, `firebase-init.js` pour #20/#39 et `club-khuddam-inscription.html` pour #20/#40. Les simulations vérifient la compatibilité textuelle aux SHA relevés. Pour une intégration autorisée, répéter les simulations aux nouvelles têtes, puis relancer les tests sur le résultat combiné et faire la recette staging.

## Diagnostic Cloudflare de la PR #36

- L’historique Workers Builds accessible contient quatre exécutions réussies, toutes sur `main`. La plus récente concerne `510896a813bb116e4610841ffe2e01506da355c5`, la base de la PR. Aucun build ne correspond à la tête `ba65361b8f7ea72b698802b954aea76eee85e143`. Le déclencheur observé cible `main`. Aucun projet Pages ni build Workers de staging n’apparaît dans ce compte.
- Inspection Git du SHA exact : la PR ajoute trois fichiers Markdown. Le contenu hors documentation est identique à sa base. Cette arborescence historique ne contient ni `package.json` ni script `build:android:web`. La commande de build actuellement configurée n’a donc pas de script local à exécuter sur ce checkout. Cette incompatibilité est vérifiable dans Git, tandis que le journal de l’échec signalé reste indisponible.
- Si le signalement réapparaît, comparer le SHA et la branche du journal à ceux du tableau. Pour vérifier le socle applicatif récent, utiliser les workflows staging des branches techniques correspondantes.

## Test combiné Club, déconnexion et synchronisation

La simulation à blanc a combiné le code de #64 (`05a86d76d218a7e8ae12105ae62121deac19349d`), #39 (`97bbb8ad89533419cd57a7d6c582d1f2e0d36726`) et #40 (`88e4a821adeb388f5a13f94b42534a805ad5c804`). Le checkout local de #64 comprend aussi un point de suivi documentaire local. Les deux simulations successives ont produit l’arbre `5de518ef126f0e58beeec2f44317d6c6a17036c5` sans conflit.

Les 128 tests Node hors émulateur ont réussi sur une extraction de cet arbre. Ils couvrent notamment les files Nour, la déconnexion Firebase, la session de candidature Club, le shell PWA et la syntaxe. L’émulateur Firestore sur l’arbre combiné, l’APK combiné et la recette avec des comptes de staging restent à valider. Aucune branche source n’a été modifiée.
