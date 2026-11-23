# Architecture cible — notifications unifiées WAT Connect

**Statut : conception validée, intégration non commencée.**
Ce document prépare une implémentation progressive des notifications pour le portail WAT Connect, son PWA et son application Android Capacitor. Il ne signifie pas que l'envoi de notifications est déjà opérationnel.

## 1. Objectif

Mettre en place un service commun de notifications pour les programmes et modules de l'ONG Wafa Al-Turath : Nour Al-Hidaya, Ramadan, Tabaski, santé communautaire, séminaires, formations et futurs projets.

Canaux visés : navigateur compatible Web Push après consentement ; application Android via le plugin natif Capacitor Push Notifications ; centre de notifications interne, boîte de réception de référence si le push n'est pas disponible.

## 2. Architecture retenue

### Clients
- Web/PWA : Firebase Cloud Messaging Web, service worker dédié firebase-messaging-sw.js, API Push/Notifications du navigateur et clé VAPID publique.
- Android : @capacitor/push-notifications, configuration Firebase Android correspondant exactement à org.wafaalturath.watconnect et autorisation demandée au moment pertinent.
- Les clients enregistrent les appareils auprès du backend après authentification et consentement.

### Serveur
- Les clients ne peuvent jamais envoyer eux-mêmes un message FCM ni choisir librement les destinataires.
- L'émission passe par un environnement de confiance : fonction serveur Firebase/Cloud Functions ou backend équivalent, utilisant FCM HTTP v1 avec identifiants conservés dans les secrets du fournisseur.
- Le serveur vérifie identité, permissions, programme, préférences et appartenance du destinataire avant tout envoi.
- Les jetons FCM sont des identifiants techniques privés, jamais affichés dans l'interface ou les rapports.

### Données indicatives
- userDevices/{deviceId} : propriétaire, plateforme, jeton FCM, date d'enregistrement, dernière activité, état et consentement.
- notificationPreferences/{uid} : catégories activées, canaux autorisés et préférences de rappel.
- notifications/{notificationId} : destinataire/cible, catégorie, titre, texte non sensible, lien interne, date et état de lecture.
- notificationReceipts/{receiptId} : état d'envoi, erreur technique et horodatage.
- Les règles Firestore empêchent la lecture des appareils et notifications d'autrui. L'envoi et le ciblage restent réservés au serveur.

Les noms de collections sont indicatifs et devront être alignés sur le modèle existant avant toute migration.

## 3. Catégories et ciblage métier

Catégories initiales : gouvernance ; administration ; projets ; activités ; Nour Al-Hidaya ; bénévolat ; bénéficiaires.

Le ciblage s'effectue par utilisateur, permission, fonction, équipe, projet ou groupe autorisé. Il ne repose pas uniquement sur un rôle textuel fourni par le navigateur. Les destinataires et leurs droits sont recalculés côté serveur.

## 4. Confidentialité et sécurité

- Aucune donnée médicale, information personnelle sensible, détail de dossier, mot de passe ou contenu confidentiel dans le texte visible sur l'écran verrouillé.
- Le push contient un message générique et un identifiant/lien opaque ; le contenu détaillé est chargé après authentification et contrôle d'accès.
- Consentement explicite et révocable ; désactivation possible par catégorie ou appareil.
- Nettoyage des jetons invalides, limitation de débit, prévention des envois accidentels et journal d'audit.
- Aucune clé privée, compte de service, secret FCM ou clé privée VAPID dans Git.
- Tester les règles Firestore avec des comptes de rôles distincts avant tout déploiement.

## 5. Expérience utilisateur

Le centre de notifications proposera liste chronologique, filtres, états lu/non lu, compteur, liens internes après vérification des droits, préférences par catégorie/appareil, et indication des appareils incompatibles. Les rappels seront planifiés côté serveur avec fuseau explicite (Africa/Porto-Novo par défaut pour WAT). Les notifications ne remplacent pas les convocations officielles.

## 6. Ordre de réalisation et critères d'acceptation

1. Inventaire : versions Firebase, initialisation, pages PWA, paramètres Android, configuration du projet et identifiant de paquet.
2. Modèle et règles : collections, règles Firestore, validations et tests d'isolation.
3. PWA : service worker FCM, consentement, jeton Web si VAPID configuré, tests premier plan/arrière-plan sur navigateurs compatibles.
4. Android : plugin Capacitor natif, configuration Firebase Android fournie hors Git ou via secret CI, build APK et tests sur appareil réel.
5. Backend : fonction protégée, validation des cibles, journalisation et gestion des jetons invalides.
6. Centre : interface, préférences, lecture/non-lecture, historique et liens profonds.
7. Rappels : planification serveur, déduplication, limites de fréquence et ciblage.
8. Recette : comptes de test Président, secrétaire, responsable de projet, formateur, bénévole et bénéficiaire ; révocation, hors ligne, jeton expiré, refus d'autorisation et confidentialité écran verrouillé.

Un lot n'est terminé qu'après tests automatisés et recette réelle sur Android et navigateur compatible. Les builds debug ne sont pas des versions de distribution.

## 7. Dépendances à confirmer

- Vérifier dans Firebase Console la configuration Cloud Messaging du projet wat-connect.
- Enregistrer l'application Android Firebase avec le package org.wafaalturath.watconnect et fournir le fichier de configuration hors dépôt.
- Générer une paire VAPID pour le Web ; seule la clé publique est exposée au client.
- Choisir le backend d'envoi et vérifier les quotas/coûts avant activation. Aucun service payant ni plan de facturation sans accord explicite.
- Vérifier les navigateurs Android ciblés et leurs contraintes Web Push.

## 8. État de départ observé sur la branche

- Firebase App, Authentication et Firestore compat 11.10.0 sont utilisés.
- sw.js gère uniquement le cache du shell public et ne contient aucun gestionnaire de push.
- Le build Capacitor copie les SDK Firebase App, Auth et Firestore, sans plugin natif de notifications.
- package.json ne déclare pas encore @capacitor/push-notifications.
- Aucun centre de notifications, registre d'appareils ou backend d'émission n'a été identifié dans cette branche.

**Conclusion :** la notification unifiée est une évolution à construire, pas une fonction déjà activée. Une architecture métier commune utilisera deux adaptateurs de réception (Web et Android) et un service serveur contrôlé.