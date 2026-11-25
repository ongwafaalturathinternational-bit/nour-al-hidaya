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

Les 128 tests Node hors émulateur ont réussi sur une extraction de cet arbre. Ils couvrent notamment les files Nour, la déconnexion Firebase, la session de candidature Club, le shell PWA et la syntaxe. La [PR de validation #67](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/67) a reproduit cet assemblage sur GitHub au commit `1019fc090a3ff87863bf352283e1178fe9804fe0` (arbre `48ffb32e477647255887509121fc29ac56ec6af3`, qui conserve la version distante du fichier de suivi). Les 128 tests locaux ont été rejoués sur cet arbre exact. L’[émulateur Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45321134070) et le [build APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45321134063) ont réussi. La recette avec des comptes de staging et sur téléphone physique reste à réaliser. Aucune branche source n’a été modifiée.

## Compatibilité des registres Programmes et Projets

Le code des [PR #72](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/72) et [#73](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/73) a été combiné localement avec l’arbre de la [PR #67](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/67). La simulation Git n’a signalé aucun conflit. Les **131 tests Node hors émulateur** ont réussi sur l’arbre `1732842f1aadc18c8d9fb1170ebe858e4e74d6a3`. Les résultats CI par PR ne valent pas validation de l’émulateur sur cet arbre élargi.

## APK combiné avec Activités et Présences

La [PR #75](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/75) étend l’assemblage à la PR #74. Le commit `44dadbba23cc208717bdf0891e1a14c98786da10` a passé **132 tests locaux hors émulateur** sur l’arbre exact, les [contrôles Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45323587645) et le build Android. L’[APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45323587547/artifacts/14888787211) est disponible jusqu’au 2026-12-08T04:03:41Z.

Sur le même téléphone de test, lier un programme, un projet et une activité fictifs, affecter un bénévole de test et modifier sa présence après rechargement. Poursuivre par la reprise du parcours Club, une synchronisation Nour après coupure de réseau et le changement de compte. Consigner l’appareil et les résultats par scénario. La recette réelle reste à effectuer.

## Validation conjointe de l’Agenda et des registres

La [PR #80](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/80), au commit `1beb4e55462db12f09941cff5fcfe4b277581e38`, étend #75 à la pile Agenda. Les deux suites de tests Activités ont été conservées après résolution du conflit. L’assemblage a passé 142 tests locaux hors émulateur, les [contrôles Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45361788486) et le build Android. Son [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45361788521/artifacts/14904124527) est disponible jusqu’au 2026-12-08T09:06:49Z.

Pour le téléphone, reprendre le scénario du build combiné #75 avec cet APK. Pour l’Agenda, exécuter séparément l’export iCalendar et le suivi des reçus sur données et transport simulés. Les fonctions d’export et de distribution sont validées par les tests du dépôt et leur raccordement à un parcours utilisateur ou à un transport actif reste à réaliser.

## Build de référence pour la recette mobile

La [PR #97](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/97) est la référence actuelle. Elle reprend le build #86 et les correctifs Annuaire et Club de #96 et #97. Le commit `1d58ec3e17bfa65faf56ceb496bf2a74a17b29e1` a passé 149 tests locaux hors émulateur, les [contrôles Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45412761584) et le build Android. Les artefacts correspondent à ce SHA : [APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45412761660/artifacts/14929022472) et [archive web](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45412761660/artifacts/14930151244), disponibles jusqu’au 8 décembre 2026.

| Parcours | Preuve à relever sur l’appareil de test |
| --- | --- |
| Nour, langue et navigation | Sélectionner l’arabe, relancer l’app, vérifier la direction RTL et les libellés d’accès. Changer de langue, vérifier l’annonce de la sélection avec TalkBack et revenir à WAT Connect. |
| Nour, reprise hors connexion | Sur un compte fictif vérifié, saisir une progression ou une réflexion hors ligne, rétablir le réseau et relire le résultat dans la même session. |
| Club, candidature | Avec une adresse de test, renvoyer le lien, vérifier l’adresse, actualiser l’état et déposer une seule candidature. Confirmer son statut dans l’espace candidat après réouverture. |
| WAT, registres et session | Lier des fiches fictives Programme, Projet et Activité, affecter un volontaire et mettre à jour une présence. Dans l’Annuaire, désactiver puis réactiver une fiche de test et vérifier son statut après rechargement. Après déconnexion, vérifier l’isolation des données entre comptes. |

Consigner le SHA, le modèle de téléphone, la version Android, le rôle du compte fictif, le résultat et les écarts. Les simulations Edge couvrent la navigation et les traitements asynchrones Club. L’appareil physique, TalkBack et les opérations avec Firebase staging restent à vérifier.


## Recette ciblée des files Nour

La référence intégrée du tableau précédent reste la PR #97 pour les parcours WAT, Annuaire et Club. Pour les reprises de quiz et devoirs, utiliser séparément l’[APK de la PR #110](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45491215592/artifacts/14967405240), SHA `0959fd643d4d593ad5f1995878285cd41b5144c7`. Le [build Android](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45491215592) et le [contrôle Firestore](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45491215197) ont réussi. La [PR #111](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/111) ajoute uniquement un test de reconnexion du même compte, avec [185 tests CI réussis](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45591316569).

Sur téléphone physique avec un compte de staging vérifié, créer un score et un devoir textuel en mode avion, redémarrer avant le retour du réseau, puis relever la restauration des deux saisies et la disparition de l’état en attente après confirmation du devoir. Vérifier ensuite le résultat depuis une seconde session du même compte. Consigner séparément les résultats des deux APK avec leur SHA. La validation conjointe des piles et la recette physique restent ouvertes.

## Recette conjointe WAT, Club et Nour

La [PR #112](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/112) transporte les corrections des files Nour sur la base WAT/Club #98. Le SHA `dd56b46abf3702a3d952eca823da635898c479c3` a passé 157 tests locaux hors émulateur, [211 tests GitHub Actions](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45592053547) et le build Android. [APK combiné](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45592053197/artifacts/15010573349) et [archive web](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45592053197/artifacts/15012295183).

Sur le téléphone, utiliser cet APK pour dérouler les scénarios des deux sections précédentes sur le même build, avec des comptes et données fictifs de staging. Relever la reprise Nour après redémarrage en mode avion, puis la candidature Club et les registres WAT, y compris l’isolation des comptes après déconnexion. La recette sur appareil physique reste ouverte.

## Paquet de recette avec précache vérifié

Pour la prochaine recette conjointe, utiliser [l’APK de la PR #116](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45594473309/artifacts/15011109139) au SHA `772c0b91228fc6a0c7890655cd98d902b1951158`. L’[archive web du même SHA](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45594473180/artifacts/15010709927) sert à vérifier le service worker dans un navigateur. Les builds ont validé les trois SDK locaux et leurs références dans les pages. Les contrôles applicatifs et Firestore de la PR #112 documentent le socle commun.

Pour la recette web, démarrer sur un hôte de recette isolé, attendre que le service worker contrôle la page, couper le réseau et recharger le point d’entrée. Vérifier que les trois SDK sont servis depuis le cache. Sur Android, suivre séparément les scénarios métier de la recette conjointe avec des comptes fictifs de staging.

## Recette Finance et changement de compte

La pile [#119](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/119), [#120](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/120) et [#121](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/121) conserve les identifiants Firestore et isole les chargements du registre par session. La dernière [CI](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45598133647) a passé 198 tests au SHA `4c69353e3624b544b197dfef667bb8cccf92d09e`. Le paquet conjoint référencé plus haut ne couvre pas cette pile Finance.

1. Depuis un aperçu isolé de ce SHA, vérifier que le projet Firebase sélectionné est `wat-connect-staging`. Utiliser un compte de test Finance et un second compte fictif dépourvu de droits Finance. Préparer uniquement des fiches fictives de staging.
2. Sur le premier compte, ouvrir le registre et vérifier qu’une transaction liée à un projet et à un compte présente les deux libellés attendus. Vérifier qu’un compte aux droits limités affiche uniquement les sections qu’il peut consulter.
3. Avec le réseau ralenti, lancer un chargement Finance, puis se déconnecter et ouvrir la session du second compte. Le registre doit rester masqué et une réponse ou une erreur tardive de la première session ne doit pas réafficher ses résultats ni son message d’erreur.
4. Relever le SHA, l’environnement choisi, les résultats par scénario et les écarts. La recette avec comptes staging reste ouverte.

Le paquet local `WAT-Finance-staging-121.zip` utilise le code Finance au SHA `4c69353e3624b544b197dfef667bb8cccf92d09e` et l’initialiseur de staging repris de #117. SHA-256 de l’archive `baf95ec685f1dcf2244f0b7e673f7c1604d0b3d7574b12ec048453ea3db05fd9`. Le test HTTP local a servi la page et ses neuf dépendances locales directes. Un SDK simulé confirme le choix de `wat-connect-staging`. Les bibliothèques Firebase CDN et les échanges avec des comptes de staging restent à vérifier dans la recette connectée.
