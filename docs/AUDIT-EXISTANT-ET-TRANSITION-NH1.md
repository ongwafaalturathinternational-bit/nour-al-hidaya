# Audit du parcours actuel et plan de raccordement NH-1

**Branche :** `feature/nour-central-management-foundation`  
**Statut :** audit du code source; aucune modification de l'application en production.

## 1. Éléments constatés dans le dépôt

### Application apprenant

Le fichier `nour-al-hidaya.html` contient :
- des écrans apprenant, formateur, parrain, agent, responsable et bureau;
- des écrans d'inscription directe, de recensement par agent et de registre;
- des comptes, codes d'accès et profils d'exemple;
- des listes de bénéficiaires, présences, devoirs, rendez-vous et signalements de démonstration;
- une persistance locale via la fonction `store()` et un jeu de données `seed()`.

Le code initialise des identifiants et codes d'accès à partir de données locales et permet de sélectionner des rôles de démonstration. Ces écrans ne constituent pas une authentification ni un registre central sécurisés.

### Portail WAT Connect

Le fichier `index.html` authentifie déjà les comptes d'équipe avec Firebase Auth et consulte notamment `users/{uid}`, `staffAccess/{uid}` et `volunteerApplications/{uid}`.

Le parcours actuel reconnaît également un profil `users/{uid}` dont le rôle est `apprenant`. Cela correspond au modèle antérieur de compte apprenant et devra être traité avec précaution : ne pas supprimer ou convertir les comptes existants automatiquement.

### Configuration et infrastructure

- `firebase-init.js` initialise Firebase côté navigateur avec les configurations publiques des projets production et staging.
- `firebase.json` déclare les règles Firestore et Firebase Hosting.
- `wrangler.jsonc` et `wrangler.staging.json` déclarent des assets statiques, sans route Worker métier pour NH-1.
- `scripts/prepare-capacitor-web.mjs` copie les pages web et les SDK Firebase dans le paquet Android; il permet de forcer staging au build.
- Les règles Firestore existantes utilisent les scopes d'équipe et ne contiennent pas encore de règles dédiées aux dossiers Nour Al-Hidaya.

## 2. Écrans à conserver dans l'APK

L'APK reste l'outil d'apprentissage des bénéficiaires :
- accueil et accès apprenant;
- cours, leçons et contenus pédagogiques;
- exercices, quiz et progression;
- devoirs et retours pédagogiques;
- préférences d'accessibilité et de langue;
- mode discret et fonctions de protection adaptées au parcours apprenant.

Les données personnelles et les opérations de gestion ne doivent plus être administrées dans une base locale autonome.

## 3. Écrans à déplacer vers WAT Connect

Les fonctions suivantes relèvent du portail de gestion WAT Connect :
- registre et fiches des bénéficiaires;
- inscription assistée par agent;
- file des demandes publiques et décisions d'admission;
- sites, mosquées et groupes;
- affectation des formateurs et accompagnants;
- présences, devoirs, évaluations et attestations;
- rapports, suivi, protection et audit;
- création, suspension et gestion des accès d'équipe.

L'APK ne doit pas exposer un sélecteur de rôle permettant d'accéder aux fonctions d'agent, formateur, parrain ou administration.

## 4. Transition à effectuer sans rupture

1. Cartographier les comptes apprenants Firebase existants et leurs liens éventuels avec les dossiers locaux; ne pas les supprimer.
2. Définir un identifiant bénéficiaire opaque, distinct du Firebase UID et des identifiants d'équipe.
3. Mettre en place NH-1 côté serveur et staging avant tout branchement de formulaire.
4. Créer dans WAT Connect le registre central et la file de vérification.
5. Ajouter le parcours public Nour Al-Hidaya, accessible depuis l'APK et les liens externes.
6. Remplacer le formulaire agent local par le formulaire authentifié WAT Connect.
7. Mettre en place un mécanisme d'activation et de récupération de l'accès apprenant après validation du dossier.
8. Migrer uniquement les données qui auront été identifiées, vérifiées et autorisées; exclure les profils et statistiques fictifs de `seed()`.
9. Retirer les interfaces de gestion locale de l'APK après vérification fonctionnelle de leurs équivalents WAT Connect.

## 5. Décisions de sécurité non négociables

- Aucun dossier de bénéficiaire réel ne doit être écrit dans `localStorage` comme registre de référence.
- Aucun rôle d'équipe ne doit être choisi ou créé depuis l'APK.
- Aucun accès public en lecture aux dossiers.
- Aucun droit d'écriture Firestore direct accordé au formulaire public.
- Les agents doivent être authentifiés et limités à leur périmètre.
- Les demandes publiques restent en attente jusqu'à décision explicite.
- Les comptes existants ne sont pas désactivés pendant la transition.
- Les jeux de données fictifs ne sont jamais importés en staging partagé ou en production comme dossiers réels.

## 6. Ordre de réalisation technique

**NH-1A — Contrat de données et compatibilité**
- confirmer les champs nécessaires du cahier des charges;
- définir les états de demande et les règles de validation;
- définir le lien dossier bénéficiaire / compte apprenant;
- écrire les tests de compatibilité pour les comptes apprenants existants.

**NH-1B — Service serveur staging**
- créer le Worker/API dédié;
- vérifier les jetons Firebase des agents;
- protéger les secrets côté serveur;
- mettre en place limitation de débit et protection anti-abus;
- ajouter les tests unitaires et d'intégration.

**NH-1C — Registre et permissions**
- collections dédiées;
- règles Firestore fermées par défaut;
- file d'examen dans WAT Connect;
- journalisation et tests de permissions.

**NH-1D — Interfaces**
- formulaire public Nour Al-Hidaya;
- formulaire agent WAT Connect;
- confirmation et référence de demande;
- activation apprenant après validation.

**NH-1E — APK**
- bouton d'inscription publique;
- suppression progressive des outils de gestion fictifs;
- connexion apprenant selon le mécanisme retenu;
- tests Android en staging, y compris faible débit.

## 7. Critères de sortie de NH-1

NH-1 ne sera considéré comme livré que lorsque les tests prouvent :
- une inscription publique depuis l'APK et un lien externe;
- une inscription assistée par agent avec contrôle de périmètre;
- une file d'attente visible uniquement par les personnes autorisées;
- une décision d'admission traçable;
- l'absence d'écriture directe du client dans les collections protégées;
- l'absence d'import des profils fictifs;
- la continuité des comptes apprenants existants;
- la séparation staging / production.

Aucun déploiement, migration réelle ou activation publique n'est inclus dans cet audit.
