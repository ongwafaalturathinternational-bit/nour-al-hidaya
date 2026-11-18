# Stratégie des applications installables de WAT Connect

## Décision d'architecture

WAT Connect est le portail numérique central de l'ONG Wafa Al-Turath. Les applications métier doivent pouvoir être utilisées depuis le portail et, lorsque cela est pertinent, installées et utilisées de manière autonome.

Une application autonome reste reliée aux services communs autorisés de WAT Connect (authentification, données, synchronisation et règles de sécurité). Elle ne constitue pas une base de données indépendante.

## Canaux de distribution

### 1. Application web progressive (PWA)
- Chaque application compatible possède son propre manifeste, son nom, ses icônes, son écran de lancement et son URL de démarrage.
- Sur Android et les navigateurs compatibles, l'utilisateur peut l'installer depuis le navigateur sur l'écran d'accueil.
- Cette voie permet une distribution directe sans boutique d'applications et sans frais de publication.
- Les capacités hors connexion doivent être conçues explicitement : cache de l'interface, file locale des opérations et synchronisation contrôlée. Une PWA installée n'est pas automatiquement entièrement hors ligne.

### 2. Application Android APK
- Pour les applications qui justifient une distribution Android dédiée, produire un paquet APK installable.
- Étudier et valider une enveloppe Android Capacitor autour de l'application web existante, en conservant les mêmes services Firebase et les mêmes règles d'accès.
- Construire les APK de façon reproductible avec GitHub Actions, sans imposer Android Studio à l'équipe WAT.
- Publier les APK de test comme artefacts ou versions GitHub, puis fournir un téléchargement depuis la fiche du programme dans WAT Connect.
- Signer les versions de distribution avec une clé protégée dans les secrets du dépôt ou un mécanisme équivalent. Ne jamais committer la clé privée, les mots de passe ou les fichiers de signature.
- Prévoir un numéro de version, des notes de version, une vérification d'intégrité et une procédure de mise à jour. Les mises à jour directes hors Play Store peuvent demander à l'utilisateur d'accepter l'installation de sources externes et de mettre à jour l'application.

### 3. Boutiques officielles
- La publication Google Play pourra être étudiée ultérieurement, mais elle n'est pas nécessaire au fonctionnement du système et peut entraîner des frais de compte développeur.
- Aucun compte payant, abonnement, service payant ou frais de publication ne sera activé sans autorisation explicite.
- Pour iPhone/iPad, privilégier dans un premier temps l'installation PWA ; la distribution native iOS impose des contraintes et coûts supplémentaires.

## Cas prioritaire : Nour Al-Hidaya

Nour Al-Hidaya doit conserver deux portes d'entrée :
1. accès web depuis WAT Connect ;
2. accès autonome via PWA installable et, après validation technique, APK Android téléchargeable.

Les deux modes doivent partager le même backend, les mêmes comptes apprenants, les mêmes données et les mêmes règles Firestore. Un apprenant ne doit pas créer un second compte simplement parce qu'il utilise l'APK.

## Exigences de sécurité et de qualité

- Aucun secret Firebase Admin ou clé privée dans le code client ou le dépôt.
- Authentification et autorisations validées côté serveur par les règles Firestore.
- Les opérations hors connexion sont mises en file locale et synchronisées sans écrasement silencieux.
- Les fichiers APK distribués sont signés, versionnés et associés à un artefact de build vérifiable.
- Les tests couvrent le routage portail/application, les manifestes, la compatibilité mobile et les parcours d'authentification.
- Le téléchargement d'un APK n'est activé qu'après validation du build, de la signature, des permissions et de la politique de confidentialité.

## Déploiement progressif

1. Stabiliser les applications web et leurs PWA.
2. Valider Nour Al-Hidaya sur plusieurs appareils Android.
3. Ajouter une chaîne de build APK reproductible dans GitHub Actions.
4. Publier une version pilote téléchargeable et tester installation/mise à jour.
5. Réutiliser le modèle pour les autres applications WAT qui nécessitent une présence Android autonome.

## Limites de coût

L'architecture vise 0 FCFA de frais mensuels en s'appuyant sur les offres gratuites disponibles. Les quotas, la capacité de stockage, les limites de build et les conditions des fournisseurs devront être surveillés. Le zéro coût ne doit pas compromettre la sécurité ni la conservation des données.
