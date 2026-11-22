# Audit UI/UX comparatif — WAT Connect

Date : 22 novembre 2026  
Branche : `audit/wat-connect-uiux-review`  
Base : HEAD de `feature/nour-central-management-foundation` — `6ac4bfe0b035547f5670c016094ce3d102a2023e`  
Nature : audit documentaire en lecture seule des écrans existants ; aucune interface métier ni donnée modifiée.

## 1. Résumé exécutif

WAT Connect possède déjà une base d'identité visuelle commune et plusieurs écrans métiers fonctionnels. Le problème prioritaire n'est pas de remplacer toutes les interfaces : il est de rendre leur expérience cohérente, lisible et mobile, tout en préservant les formulaires, registres, validations, filtres, exports et contrôles d'accès existants.

Le portail, le site institutionnel, l'annuaire, les programmes, les projets, les activités et le Club référencent `wat-brand.css`. La page Finances de Lot 9 est encore autonome : elle embarque ses propres couleurs, son propre logo textuel « WAT » et ses styles, sans feuille commune. C'est l'écart de cohérence le plus net repéré dans ce premier passage.

## 2. Référence visuelle WAT

La référence `docs/IDENTITE-VISUELLE-WAT.md` fixe les couleurs issues des logos officiels :

| Rôle | Valeur |
|---|---|
| Turquoise institutionnel | `#1D788F` |
| Or institutionnel | `#D2B75F` |
| Or Club Khuddam | `#C49F5E` |
| Bleu profond | `#103047` |
| Gris typographique | `#41403D` |

La feuille `wat-brand.css` expose déjà ces variables (`--wat-turquoise`, `--wat-gold`, `--wat-deep`, `--wat-ink`, etc.), un bandeau facetté discret, des états de focus et des ajustements pour boutons, cartes, statistiques et étiquettes.

Principes à conserver :
- logos institutionnels officiels non redessinés ;
- turquoise comme couleur identitaire dominante, or en accent ;
- bleu profond pour les bandeaux et la navigation ;
- facettes géométriques mesurées, jamais derrière les textes longs ;
- contraste et lisibilité mobile prioritaires ;
- aucune règle graphique ne doit modifier l'autorisation, les données ou le comportement métier.

## 3. Inventaire comparatif observé

Les décomptes ci-dessous sont des repères statiques du HTML récupéré, pas des mesures de couverture fonctionnelle. Les pages qui construisent des éléments par JavaScript peuvent présenter davantage de contrôles à l'exécution.

| Écran | Base consultée | Éléments statiques repérés | Observation |
|---|---|---:|---|
| Portail `index.html` | Lot 8 / PR #20 | 1 formulaire, 3 boutons | Entrée institutionnelle, programmes et connexion ; `wat-brand.css` inclus |
| Site institutionnel | Lot 8 / PR #20 | 0 formulaire, 0 bouton | Présentation institutionnelle statique ; `wat-brand.css` inclus |
| Annuaire `administration.html` | Lot 8 / PR #20 | 1 formulaire, 1 tableau | Ajout de fiche et répertoire ; `wat-brand.css` inclus |
| Programmes | Lot 8 / PR #20 | 1 formulaire, 1 tableau | Enregistrement, répertoire et fiche ; `wat-brand.css` inclus |
| Projets | Lot 8 / PR #20 | 2 formulaires, 1 tableau | Création et affectation de bénévole ; plusieurs seuils responsive |
| Activités | Lot 8 / PR #20 | 2 formulaires, 1 tableau | Planification et présence ; calendrier et registre |
| Club Khuddam | Lot 8 / PR #20 | 1 formulaire, 2 tableaux | Répertoire, candidatures et fiche bénévole |
| Finances | Lot 9 / PR #12 | 6 formulaires, 9 tableaux, 17 boutons | Écran riche : opérations, rapports, comptes, transferts, rapprochements, clôture, budgets |
| Nour Al-Hidaya | PR #22 | application volumineuse, interface largement dynamique | Audit structurel superficiel dans ce passage ; revue dédiée nécessaire |

Les pages métiers Lot 8 partagent une navigation qui relie portail, annuaire, programmes, projets, activités et Club. La page Finances ajoute l'entrée « Finances » à cette navigation.

## 4. Écarts et risques UX constatés

### Priorité P0 — cohérence institutionnelle
1. `finance.html` n'importe pas `wat-brand.css` et redéfinit une palette locale (`#102746`, `#c9972b`, etc.). Les couleurs restent proches en intention, mais ne sont pas les variables officielles.
2. L'identifiant visuel de la page Finances est un carré typographique « WAT », alors que la charte demande de préserver les logos officiels. Vérifier le fichier logo validé avant remplacement ; ne pas fabriquer de logo de substitution.
3. Centraliser les tokens visuels et les composants communs sans effacer les couleurs fonctionnelles nécessaires aux états validé, en attente, rejeté, erreur et succès.

### Priorité P1 — usage sur téléphone
1. La page Finances prévoit des règles à 850 px et 520 px, mais ses tableaux ont une largeur minimale de 760 px : les registres peuvent donc nécessiter un défilement horizontal sur téléphone.
2. La navigation des modules utilise un ruban horizontal défilant. Vérifier que l'indication du défilement et le focus clavier restent évidents.
3. Les pages de programmes, projets, annuaire, activités et Club possèdent des seuils responsive distincts. Il faut harmoniser les comportements attendus (empilement des colonnes, formulaires, filtres, tableaux, actions), pas simplement imposer un breakpoint identique partout.
4. Pour les tableaux denses, étudier une présentation mobile par lignes/cartes ou colonnes prioritaires, en gardant l'accès à toutes les données et actions.

### Priorité P1 — densité et hiérarchie
1. Donner à chaque page une hiérarchie stable : titre et contexte, actions principales, indicateurs utiles, filtres, liste/registre, détail.
2. Uniformiser les espacements, les tailles de titres, les champs, les boutons, les cartes, les badges d'état et les messages de confirmation/erreur.
3. Réduire les répétitions de navigation et clarifier les actions primaires/secondaires, sans masquer les fonctions existantes.

### Priorité P2 — accessibilité et qualité perçue
1. Réaliser une vérification manuelle du contraste, des libellés de champs, des messages d'erreur, du focus clavier, des zones tactiles et des titres de tableaux.
2. Vérifier les états de chargement, absence de résultat, erreur réseau, session expirée et confirmation d'enregistrement.
3. Contrôler les impressions et exports de Finances : le style partagé ne doit pas dégrader les documents imprimés.

## 5. Plan de réalisation recommandé

### Étape A — socle commun sans régression
- Faire de `wat-brand.css` la référence des couleurs, typographies, rayons, ombres, espacements, focus, boutons, champs, cartes, tableaux et états.
- Ajouter des classes utilitaires documentées plutôt que des sélecteurs globaux agressifs.
- Vérifier que chaque page inclut le socle une seule fois et que les styles spécifiques ne le contredisent pas.
- Préserver les variantes sémantiques métier (finance, validation, alerte, erreur).

### Étape B — harmonisation progressive des modules
Ordre conforme à la feuille de route WAT : activités/projets/Club Khuddam, puis Finances, puis autres espaces et tableaux de bord. Commencer par un module pilote, comparer avant/après, puis réutiliser les composants validés.

### Étape C — adaptation mobile et accessibilité
- Tester au minimum 360 px, 390 px, 768 px et écran large.
- Vérifier les tableaux, filtres, formulaires longs, dialogues et navigation au clavier.
- Ne pas marquer une page « validée mobile » sans capture ou test réel dans les dimensions visées.

### Étape D — validation non-régression
Avant toute PR de refonte :
- tests existants du module et règles Firestore inchangés ;
- vérification des rôles et permissions inchangés ;
- formulaires, recherche, filtres, détail, validation, export et impression toujours disponibles ;
- comparaison visuelle desktop/mobile ;
- tests PWA/Android si les ressources communes sont modifiées ;
- aucun compte, bénéficiaire, finance ou dossier réel utilisé.

## 6. Garde-fous fonctionnels

Cette refonte est strictement présentationnelle. Ne pas supprimer, simplifier ou contourner :
- formulaires d'inscription/candidature et de saisie ;
- registres et fiches détaillées ;
- filtres et recherches ;
- validation à deux personnes et séparation des rôles en finances ;
- états de suivi, historiques et audit append-only ;
- contrôles Firestore et restrictions d'accès ;
- export CSV et impression ;
- parcours existants du Club et de Nour Al-Hidaya.

Ne pas exposer de route métier NH-1 encore fermée. Ne pas connecter de données réelles. Aucun changement Firebase, IAM, Cloudflare, secret, production, fusion ou déploiement n'est inclus.

## 7. Limites de cet audit

- Audit statique des fichiers sur les branches Lot 8, Lot 9 et PR #22 ; les modules ne sont pas tous réunis sur une seule branche.
- La page Finances a été lue sur `audit/wat-connect-lot9-finances`, tandis que ce document est créé sur une branche dédiée issue du HEAD de PR #22. Il s'agit d'une comparaison entre branches, pas d'une intégration du code Lot 9.
- Pas de navigateur graphique, captures d'écran, test utilisateur, mesure Lighthouse ou vérification automatisée WCAG dans cette étape.
- L'application Nour Al-Hidaya est volumineuse et dynamique ; son audit visuel et d'accessibilité reste à faire.
- L'absence de décompte de formulaire HTML dans Nour ne signifie pas l'absence de parcours de saisie : l'interface est construite en partie par JavaScript.

## 8. Références de fichiers consultés

- `docs/IDENTITE-VISUELLE-WAT.md` — SHA `a8367cc3098cac0583ba133f01489d3183c431c2`
- `wat-brand.css` — SHA `63a974084531c85f903b38dde494033a1d5ba5b8`
- `index.html` — SHA `ad8464ee916fdda43fbfae7c6fab12ae0038d79e`
- `site-institutionnel.html` — SHA `f921fb0c0652552212ca2d6ba99e239424e75523`
- `administration.html` — SHA `2d87ff01a42698f9d0238848adbab6ea6263574a`
- `programmes.html` — SHA `f64ff3ce91b61579189a72167204f315024a340b`
- `projets.html` — SHA `4e7e510fc30e67f97925201f927f27fbcc837f12`
- `activites.html` — SHA `be511e34659fa1f0363038b6987a61f9bf3c4e88`
- `club-khuddam.html` — SHA `f4e0cf2213df6275565d28e4feb1fb9a22aad504`
- `finance.html` sur Lot 9 — SHA `e94048f187ee21a809a8b27d295f5f299c71423a`
- `nour-al-hidaya.html` — SHA `11d0c93e788f176a704f8189a50392f05b3056c8`

---
Conclusion : la première amélioration technique à réaliser est l'alignement de la page Finances sur les tokens et composants WAT partagés, puis la création d'un modèle de tableau mobile commun. Ces changements devront être proposés comme une PR indépendante et testés sans modifier les règles métier.


## 9. Revue dédiée Nour Al-Hidaya et audit des identités officielles — 22 novembre 2026

### 9.1 Ressources reçues et inventoriées

Les deux archives fournies ont été ouvertes et leurs huit PNG originaux ont été inventoriés. Tous sont en RGBA avec transparence :

| Identité | Ressource | Dimensions originales | Contexte cible |
|---|---|---:|---|
| WAT Connect | Logo complet couleur `WC copie.png` | 7087 × 2605 | Portail et en-têtes sur fond clair |
| WAT Connect | Logo complet blanc `WC blanc.png` | 7087 × 2605 | En-têtes et bandeaux foncés |
| WAT Connect | Icône couleur `ICONE WC.png` | 2746 × 2605 | Favicon, PWA et espaces compacts sur fond clair |
| WAT Connect | Icône blanche `ICONE WC blanc.png` | 2746 × 2605 | Espaces compacts sur fond foncé |
| Nour Al-Hidaya | Logo complet couleur `logo nour alhidaya.png` | 4683 × 2305 | Connexion et surfaces claires |
| Nour Al-Hidaya | Logo complet blanc `logo blanc nour alhidaya copie.png` | 4683 × 2305 | En-tête et splash foncés |
| Nour Al-Hidaya | Icône couleur `ICONE NOUR ALHIDAYA.png` | 5906 × 5906 | Favicon, PWA et navigation compacte |
| Nour Al-Hidaya | Icône blanche `ICONE blanc NOUR ALHIDAYA copie.png` | 5906 × 5906 | Navigation compacte sur fond foncé |

Les originaux sont conservés sans redessin ni changement de proportions. Le transfert de ces binaires dans le dépôt reste une étape technique à réaliser avant de modifier les références des pages : l'action GitHub de création de fichiers disponible dans ce chantier accepte le texte UTF-8, pas les octets PNG. Aucun faux fichier image ni chemin cassé ne sera ajouté en attendant une voie d'envoi binaire adaptée.

### 9.2 Constats vérifiés dans les fichiers

- `index.html` : en-tête textuel « WAT Connect », favicon `icon-192.png`, manifeste `manifest.json`; aucun logo image dans l'en-tête.
- `manifest.json` : les deux tailles d'icône référencent les fichiers génériques racine `icon-192.png` et `icon-512.png`; la couleur de thème est encore `#102746`, alors que la référence WAT indique `#103047`.
- `site-institutionnel.html`, `administration.html`, `programmes.html`, `projets.html`, `activites.html`, `club-khuddam.html`, `club-khuddam-inscription.html` et `club-khuddam-espace.html` : en-têtes observés textuels, sans logo image.
- `nour-al-hidaya.html` : un unique logo PNG est encodé dans la constante JavaScript `LOGO`. Il est réutilisé dans des contextes visuellement différents : en-tête foncé, connexion claire, splash et écran de choix de langue. Cette constante unique ne permet donc pas de choisir correctement entre les versions couleur et blanche.
- Le même fichier Nour pointe son favicon vers `icon-192.png`; `manifest-nour.json` utilise les mêmes chemins d'icônes racine que WAT Connect. La séparation des identités n'est donc pas encore assurée pour les icônes installées.
- `sw.js` précache les deux icônes génériques et les deux manifestes, mais ne connaît pas encore les futurs chemins d'assets de marque.

### 9.3 Plan d'intégration non destructive

1. Ajouter les huit fichiers originaux dans un répertoire de ressources de marque distinct pour WAT et Nour, sans écraser les icônes génériques tant que leurs usages partagés ne sont pas migrés.
2. Portail WAT : logo blanc sur l'en-tête foncé, logo couleur sur les surfaces claires, icône WAT dédiée dans le favicon et le manifeste.
3. Modules WAT et site institutionnel : reprendre le même composant d'en-tête et les mêmes règles de choix de variante, sans modifier les navigations ou les autorisations.
4. Nour : logo blanc dans l'en-tête/splash foncés, logo couleur dans la connexion claire, icône Nour dans le favicon et le manifeste Nour; garder l'icône seule dans les zones compactes.
5. Mettre à jour le cache PWA et la préparation Android pour inclure chaque ressource, puis tester les deux manifestes et les icônes générées.
6. Ajouter des tests statiques vérifiant la séparation des chemins WAT/Nour, les variantes de logo par contexte et le cache PWA; exécuter les workflows applicatifs et Android staging.
7. Réaliser ensuite la recette visuelle à 360/390/768 px et sur écran large. Aucun statut « validé visuellement » ne sera revendiqué sans captures ou test navigateur.

### 9.4 Nour Al-Hidaya — limites et conservation métier

L'application est une page HTML/JavaScript volumineuse (463 391 caractères au HEAD audité), construisant dynamiquement les espaces apprenant, formateur et administration. La revue statique a repéré des écrans de connexion/création de compte, tableau de bord, leçons, devoirs, progrès, attestations, ressources, inscriptions et vues de suivi. Cette liste décrit les intitulés rencontrés dans le code, pas une recette fonctionnelle de chaque parcours.

La première étape de refonte doit être un système de marque et de composants communs, pas une réécriture de l'application. Les rôles, états pédagogiques, validations, stockage, règles Firestore, parcours d'inscription et contenus ne doivent pas être altérés par l'intégration visuelle.

### 9.5 Périmètre de vérification et limites

- Revue statique des sources sur PR #22 et des ressources PNG fournies; pas de test graphique en navigateur ni sur appareil réel dans cette étape.
- Les fichiers binaires ont été extraits et leurs dimensions/modes vérifiés localement; ils ne sont pas encore committés dans GitHub.
- Le transfert binaire est donc un prérequis pour la PR d'intégration des logos. Les autres audits et tâches de cohérence de l'interface restent indépendants et peuvent continuer.


## 10. Revue responsive complémentaire des modules Lot 8 — 22 novembre 2026

### Mesures statiques des registres

| Module | Largeur minimale CSS du tableau | Zones défilantes | Formulaires HTML | Breakpoints principaux |
|---|---:|---:|---:|---|
| Administration | 620 px | 1 | 1 | 800 / 600 px |
| Programmes | 650 px | 1 | 1 | 800 / 600 px |
| Projets | 650 px | 1 | 2 | 820 / 620 / 600 / 560 / 480 px |
| Activités | 610 px | 1 | 2 | 800 / 620 / 600 / 560 / 480 px |
| Club Khuddam | 680 px | 2 | 1 | 820 / 700 / 620 / 600 / 480 / 420 px |
| Candidature Club | sans tableau | 0 | 3 | 600 px |
| Espace candidat | sans tableau | 0 | 1 | 600 px |

Les cinq modules de gestion utilisent déjà `overflow:auto` autour des tableaux : les colonnes ne sont pas supprimées sur téléphone, mais un défilement horizontal est nécessaire. Avant le correctif dédié, ces conteneurs n'étaient pas explicitement accessibles par Tab et n'avaient pas de nom de région. PR #25 ajoute `role=region`, `aria-label` et `tabindex=0` aux six zones; elle rend aussi leur focus visible via le socle WAT. Le défilement et les données sont conservés.

### Cohérence responsive

- Administration et Programmes partagent deux seuils, alors que Projets, Activités et Club combinent plusieurs seuils et des règles spécifiques.
- Les pages publiques d'inscription et d'espace candidat ont une structure plus simple, mais leur contrôle clavier et leurs messages d'erreur méritent une recette distincte.
- Nour Al-Hidaya utilise un shell responsive spécifique : largeur mobile 520 px, largeur intermédiaire 820 px, puis disposition desktop avec navigation latérale à partir de 1000 px; la navigation inférieure mobile devient une barre latérale sur grand écran. Le choix de thème clair/sombre est déjà pris en charge.
- L'objectif de la refonte globale n'est pas d'uniformiser arbitrairement tous les breakpoints. Il faut définir des composants communs et des comportements testables, puis conserver les exceptions propres à chaque écran.

### Suite de la refonte UI/UX

1. Stabiliser les en-têtes et la navigation partagés, avec logos WAT/Nour correctement séparés.
2. Définir les composants de formulaire, cartes, indicateurs, états et messages; appliquer sans réécrire les modules existants.
3. Normaliser les registres : scroll accessible, actions persistantes, colonnes prioritaires et vue mobile en cartes lorsque cela ne masque aucune information.
4. Revoir les écrans d'inscription, connexion, détails, tableaux de bord et états vides/erreur.
5. Recetter les parcours par rôle avec données fictives et tester 360/390/768 px et desktop.
6. Conserver les validations métier, scopes, contrôles Firestore, exports, impressions et synchronisation hors ligne.



## 11. Vérification de cohérence PWA, dépendances et workflows — 22 novembre 2026

### 11.1 Séparation actuelle des deux applications

- Le portail WAT charge `manifest.json`, `icon-192.png` et `icon-512.png`; son `theme-color` a été aligné sur `#103047` dans une branche dédiée PR #26.
- Nour charge `manifest-nour.json`, mais son favicon et les deux entrées du manifeste utilisent encore les mêmes chemins génériques `icon-192.png` / `icon-512.png`. La distinction des manifests et des couleurs ne suffit donc pas à garantir la distinction des icônes.
- `scripts/prepare-capacitor-web.mjs` copie les deux manifests et les deux icônes génériques vers `web-dist`, mais ne prévoit pas encore de ressources de marque séparées.
- Dans `nour-al-hidaya.html`, une constante `LOGO` contient une image PNG encodée en base64 et sert à la fois à l'en-tête sombre et à l'écran de connexion clair. Le même asset ne permet pas de sélectionner la variante blanche/couleur selon le fond.
- Les ressources PNG officielles WAT et Nour ont été extraites et leur format RGBA, dimensions et transparence ont été vérifiés. Elles ne sont pas encore présentes dans GitHub; aucune référence cassée n'est ajoutée.

### 11.2 Mesures sans dépendance aux binaires

PR #26 harmonise le thème navigateur WAT : `#103047` dans les huit pages de portail/modules et dans `manifest.json`. Le site institutionnel utilisait déjà cette valeur. Le manifeste Nour conserve son thème propre `#0F2240`. Un test statique couvre les neuf pages WAT et vérifie que les deux manifests restent distincts.

PR #25 apporte l'accessibilité clavier aux six conteneurs de tableaux des cinq modules Lot 8, sans supprimer de colonnes ou d'actions. La validation CI observée sur son HEAD est Firestore **133/133** et Android staging réussi.

### 11.3 Dépendances de PR observées

| PR | Branche cible | Relation constatée |
|---|---|---|
| #20 | `audit/wat-connect-lot8-projects-club-khuddam` | Lot 8, branche source des parcours Club et modules |
| #22 | `fix/lot8-club-onboarding-and-access` | NH-1 empilé sur le jalon Lot 8 |
| #25 | `feature/nour-central-management-foundation` | amélioration accessibilité des registres, empilée sur #22 |
| #26 | `feature/nour-central-management-foundation` | cohérence du thème WAT, empilée sur #22 |
| #23 | `feature/nour-central-management-foundation` | audit documentaire comparatif, empilé sur #22 |
| #12 | `audit/wat-connect-lot8-projects-club-khuddam` | Lot 9 Finances, sur la base d'audit Lot 8 |
| #24 | `audit/wat-connect-lot9-finances` | harmonisation Finances empilée sur #12 |

Écart confirmé par comparaison directe des références de branches : le HEAD courant de la branche cible de PR #22 (`fix/lot8-club-onboarding-and-access`) est `e3b04361436f32425c86cf3b971e859265162d23`, tandis que la base d'intégration de PR #22 reste `fe9f51c88a4e7de58b2712fb4d0aa87b7f6f766d`. La comparaison des branches est `diverged` : PR #22 a 201 commits en avance et 22 commits en retard par rapport à sa base courante. Sept chemins sont communs aux deux ensembles de changements : `.firebaserc`, `.github/workflows/firestore-rules.yml`, `docs/ARCHITECTURE-INSCRIPTION-UNIVERSELLE.md`, `docs/SEPARATION-ENVIRONNEMENTS-FIREBASE.md`, `index.html`, `scripts/prepare-capacitor-web.mjs` et `wrangler.staging.json`. Les PR sont parfois marquées mergeable, mais ce drapeau ne suffit pas à valider la cohérence du contenu. Avant intégration, il faut réconcilier ces chemins et relancer les tests API/Firestore/Android; les PR #23, #25, #26 et #27, empilées sur #22, devront ensuite être rebasées ou reconstruites sur le nouveau HEAD. Aucune cible ni branche n'a été modifiée.

### 11.4 CI et prévisualisations

- PR #24 : le workflow GitHub Actions Firestore au HEAD `c2541ee` est terminé avec succès; job complet réussi, suite de tests précédemment lue à **191/191**.
- PR #25 : Firestore Emulator **133/133** et APK Android staging réussi au HEAD `a43c7f7`; l'APK est un artefact de test, pas une publication.
- PR #26 : Firestore Emulator et APK Android staging ont démarré au HEAD `abbc05b`; leurs résultats sont en attente au moment de cette mise à jour.
- PR #24 : le bot Cloudflare, dans un commentaire intitulé « Deploying Preview to Cloudflare », signale deux builds échoués sur `1286d11` et `c2541ee`, sans URL de déploiement. Les liens de logs pointent vers le tableau de bord authentifié, inaccessible avec les outils disponibles. Leur chemin contient toutefois `/workers/services/view/nour-al-hidaya/production/builds/`; l'environnement exact est donc ambigu. Classification prudente : build en échec du flux PR, environnement Cloudflare non confirmé. Il n'est justifié ni de le qualifier de Preview staging réussi, ni de conclure à un déploiement production. La cause racine reste inconnue et aucun déploiement n'a été lancé.

### 11.5 Suite technique ordonnée

1. Réconcilier les historiques des branches empilées en préservant les cibles et les PR ouvertes.
2. Finaliser le transfert binaire des PNG officiels puis intégrer les assets séparés dans le portail, les modules, Nour, les deux manifests, le cache PWA et la préparation Android.
3. Appliquer un shell de navigation et des composants communs aux pages WAT; garder un thème Nour distinct.
4. Auditer et tester les parcours Nour par rôle avant tout changement de gestion ou d'authentification.
5. Reprendre le Lot 9 Finances après la cohérence des modules, puis poursuivre la feuille de route sans supprimer de fonctions métier.
6. Diagnostiquer les builds Cloudflare avec les journaux authentifiés ou les paramètres de build accessibles à l'administrateur du compte.

Aucune fusion, publication, activation de route, modification de données réelles ou configuration production n'a été effectuée.



## 12. Amélioration ciblée de la navigation Nour — PR #27 — 22 novembre 2026

- Le menu inférieur/mobile et latéral/desktop est construit dynamiquement à partir des onglets propres à chaque rôle.
- Le correctif PR #27 ajoute un nom accessible à la zone de navigation, expose l'onglet actif avec `aria-current="page"` et marque les boutons comme `type="button"`.
- Les libellés et icônes restent ceux de `ro.tabs`; le correctif ne change ni les rôles, ni les écrans, ni les transitions de navigation.
- Tests statiques dédiés et workflows Firestore Emulator / Android staging déclenchés sur le HEAD initial `9a855e68b8f4cd7dadd51048428e827d517737c6`. Résultats encore en cours au moment de la rédaction; aucune réussite n'est revendiquée avant lecture des logs.



## 13. Cloudflare — comparaison statique de la branche Finance — 22 novembre 2026

La racine de la branche `feature/lot9-finance-wat-branding` a été inventoriée : elle contient `wrangler.json` avec le Worker `nour-al-hidaya` et les assets statiques `.`, mais ne contient pas `package.json`, `wrangler.staging.json`, `wrangler.jsonc`, `scripts/prepare-capacitor-web.mjs` ni le workflow `.github/workflows/cloudflare-staging-preview.yml` présents dans le socle plus récent de centralisation.

C'est une différence de configuration avérée entre les branches. Elle constitue une piste, pas une cause racine : si Cloudflare Build utilise seulement `wrangler.json`, l'absence de ces fichiers ne suffit pas à expliquer l'échec; si ses paramètres appellent un script npm/Capacitor ou attendent `wrangler.staging.json`, l'échec devient plausible. Les paramètres de build et la première erreur restent à vérifier dans le tableau de bord authentifié. Ne pas recopier à l'aveugle les fichiers staging de #20/#22 sur la branche Finance : il faut confirmer le root directory, la commande de build et l'environnement avant une correction ciblée.


Mise à jour de validation PR #27 : Firestore Emulator **133/133**, 0 échec, run [45045424472](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045424472); APK Android staging réussi, run [45045424484](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045424484). L'artefact Android est un build debug staging et ne constitue pas une publication.



## 14. Résultats actualisés des correctifs UI/UX — 22 novembre 2026

- PR #25, HEAD de code `5f32e4304d385b3223f6a49b9ef7d6438429628a` : Firestore Emulator **134/134**, run [45045681302](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045681302); Android staging réussi, run [45045681206](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045681206). Les cinq modules Lot 8 marquent maintenant la page courante dans leur navigation.
- PR #26, HEAD de code `27da8ad35942de288d5095a26f835f6a09ad96ac` : Firestore Emulator **134/134**, run [45045726614](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045726614); Android staging encore en cours au dernier contrôle.
- PR #27, HEAD `b510e1e3e870d14f91757d1dbecbb7e9cde38ecf` : Firestore Emulator **133/133**, run [45045584323](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045584323); Android staging réussi, run [45045584344](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045584344). Le menu Nour expose un nom de navigation, l'onglet actif et des boutons non-submit.
- Ces tests couvrent les tests statiques et les règles Firestore en Emulator; ils ne constituent pas une recette visuelle navigateur, une validation utilisateur, ni un test contre Firebase réel.



## Validation finale des lots UI/UX — PR #24 et #26 — 22 novembre 2026

- PR #24, HEAD de code `8bd9f49ec3e6da796232ef09908ad6a3563c9f40` : Firestore **193/193**, 0 échec, run [45045818833](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045818833). Les neuf tableaux Finance sont maintenant des régions accessibles au clavier; aucun build Android n'a été déclenché par ce changement Finance.
- PR #26, HEAD de code `27da8ad35942de288d5095a26f835f6a09ad96ac` : Firestore **134/134**, 0 échec, run [45045726614](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045726614); Android staging réussi, run [45045726643](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45045726643). Le portail a maintenant un lien d'évitement clavier vers son contenu.
- Les validations Firestore/Android ne remplacent pas les tests visuels réels; aucune capture de navigateur ni recette sur appareil physique n'est revendiquée.
