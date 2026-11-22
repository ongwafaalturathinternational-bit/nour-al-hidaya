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
