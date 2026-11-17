# Nour Al-Hidaya — sécurisation et évolution

## État du projet

Cette branche sert à préparer la stabilisation du prototype sans modifier `main`.

Le prototype actuel reste une application principalement exécutée dans le navigateur. Les données enregistrées dans le navigateur ne sont pas partagées automatiquement entre les appareils. La présence d'un écran de connexion ou de rôles dans l'interface ne constitue pas encore une authentification ni une autorisation sécurisée côté serveur.

## Première correction effectuée sur cette branche

Le Service Worker (`sw.js`) a été limité au cache de l'interface publique :

- seuls les fichiers statiques explicitement listés peuvent être mis en cache ;
- les requêtes vers des domaines externes ne sont pas interceptées ;
- les requêtes autres que GET ne sont pas interceptées ;
- les navigations restent accessibles hors connexion grâce à la copie locale de `index.html` ;
- les réponses de données et futures requêtes Firebase/API ne sont pas enregistrées dans le cache de l'application.

Cette correction réduit le risque qu'une future donnée privée ou réponse d'API soit conservée dans le cache hors ligne. Elle ne sécurise pas, à elle seule, les données actuellement stockées dans `localStorage`.

## Points qui restent bloquants avant un usage réel

1. Remplacer les comptes et codes PIN de démonstration par Firebase Authentication.
2. Déplacer les autorisations dans des règles Firestore et/ou des fonctions serveur ; ne jamais faire confiance au seul rôle choisi dans le navigateur.
3. Ne pas stocker de PIN, mot de passe, code de récupération ou secret d'administration en clair dans `localStorage`.
4. Concevoir les inscriptions hors ligne comme une file locale minimale, avec identifiant unique, état de synchronisation et traitement des conflits.
5. Ne synchroniser que par connexion sécurisée et après authentification ; protéger les données des mineurs et les informations liées à l'accompagnement religieux.
6. Vérifier les pièces jointes : le nom d'un fichier n'est pas un téléversement. Prévoir un stockage réel, des limites et des contrôles d'accès.
7. Ne présenter les SMS, WhatsApp, OTP, QR codes ou contrôles GPS comme opérationnels qu'après intégration et tests d'un véritable service.
8. Prévoir consentement, minimisation des données, durée de conservation et procédure de suppression.

## Ordre de réalisation recommandé

### Phase 1 — Prototype stable
- Conserver le parcours de démonstration avec des données fictives.
- Séparer explicitement le mode démonstration du futur mode de production.
- Vérifier les parcours principaux sur ordinateur et téléphone.
- Garder les données réelles hors du prototype.

### Phase 2 — Identité et permissions
- Activer Firebase Authentication.
- Définir les rôles et leurs permissions dans un modèle serveur.
- Écrire et tester les règles Firestore avant toute donnée réelle.
- Garder les collections privées inaccessibles par défaut.

### Phase 3 — Inscriptions et synchronisation
- Permettre la saisie hors connexion avec stockage local temporaire.
- Synchroniser après reconnexion et authentification.
- Afficher clairement les éléments en attente, synchronisés ou en erreur.
- Gérer les doublons et les conflits sans écraser silencieusement les données.

### Phase 4 — Services complémentaires
- Téléversement réel des documents.
- Notifications réellement envoyées.
- QR codes vérifiables et, si nécessaire, géolocalisation avec consentement.
- Rapports de coordination et tableau de bord WAT Connect.

## Règles de sécurité de cette branche

- Ne jamais utiliser de données personnelles réelles pendant les essais.
- Ne pas ouvrir les règles Firestore à tous les utilisateurs.
- Ne pas déployer une fonction présentée comme réelle si elle n'est encore qu'une simulation locale.
- Ne pas fusionner cette branche dans `main` avant revue et tests.
- La correction du Service Worker n'est pas un audit de sécurité complet.

## Limites des vérifications

La première revue est une inspection statique du code. Les tests d'exécution, les tests multi-comptes, les tests mobiles, les tests hors connexion et les tests Firebase restent à effectuer.


## Mise à jour — initialisation Firebase (17 novembre 2026)

- L'application Web Firebase « Nour Al-Hidaya Web » du projet `wat-connect` a été confirmée.
- Le SDK Firebase Web (App et Authentication, version 11.10.0) est chargé dans le prototype.
- Le fichier local `firebase-init.js` initialise le projet et expose l'objet Firebase à l'application lorsque le SDK est disponible.
- Ce fichier est inclus dans le cache de l'interface ; les scripts et services Firebase externes ne sont pas mis en cache.
- Cette étape initialise le SDK uniquement : aucun compte utilisateur n'est encore créé, aucune connexion réelle n'est encore reliée à l'écran existant et aucune donnée n'est envoyée vers Firestore.
- Les règles Firestore restent en refus par défaut. Aucun déploiement Firebase ni Cloudflare n'a été effectué.
- Prochaine étape : concevoir le parcours de connexion par e-mail et mot de passe Firebase, sans réutiliser les codes PIN locaux comme identifiants de production. Les rôles devront ensuite être attribués par un mécanisme administratif de confiance.


## Mise à jour — authentification des apprenants (17 novembre 2026)

- Le prototype propose désormais une inscription Firebase par e-mail et mot de passe (8 caractères minimum), suivie d'une vérification de l'adresse e-mail.
- À l'inscription, un profil minimal est créé dans `users/{uid}` : rôle fixe `apprenant`, adresse e-mail et préférences de base.
- La connexion vérifie l'adresse e-mail et charge le profil depuis Firestore. Les sessions Firebase persistantes sont restaurées à l'ouverture de l'application.
- Les règles Firestore autorisent chaque utilisateur à lire son propre profil, à le créer uniquement comme apprenant et à modifier certains champs sans pouvoir changer son rôle ou son e-mail. Les autres collections restent interdites.
- Les anciens accès locaux par identifiant/PIN et les rôles du personnel restent en mode démonstration uniquement ; aucune migration automatique des comptes fictifs n'est effectuée.
- Limite importante : les profils sont centralisés, mais les cours, progrès, devoirs et autres données fonctionnelles restent encore locaux à l'appareil. La synchronisation multi-appareils et la gestion administrative des rôles constituent des étapes distinctes.
- Les règles de sécurité sont préparées dans le dépôt, mais ne sont pas déployées sur Firebase depuis cette modification.
