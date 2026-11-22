# Décision technique — lot NH-1 (registre central Nour Al-Hidaya)

**Statut :** décision préparatoire, aucune API ni écriture de données livrée.  
**Branche :** `feature/nour-central-management-foundation`.

## 1. Constat vérifié dans le dépôt

- Le dépôt ne contient actuellement aucun dossier de fonctions serveur Firebase/Cloudflare dédié à Nour Al-Hidaya.
- `wrangler.jsonc` et `wrangler.staging.json` déclarent uniquement des assets statiques (`web-dist`) : aucun Worker métier, binding de base de données ou secret serveur n'est déclaré.
- `firestore.rules` protège les collections par défaut et ne déclare pas encore de règles pour un registre Nour Al-Hidaya.
- Les scopes bénéficiaires/pédagogiques mentionnés dans la matrice sont futurs et ne sont pas encore opérationnels.
- `members` et `volunteers` sont des registres institutionnels distincts. Ils ne doivent pas être réutilisés comme dossiers d'apprenants.
- Les documents d'architecture antérieurs proposent déjà un dossier bénéficiaire distinct du compte Firebase Auth et du profil pédagogique.

## 2. Décision de modèle

Le registre NH-1 sera un registre métier propre à Nour Al-Hidaya, distinct des membres, bénévoles et comptes d'équipe.

Collections cibles, à créer seulement avec les règles correspondantes :
- `learningBeneficiaries/{beneficiaryId}` : identifiant opaque, état de dossier, provenance et métadonnées non sensibles minimales.
- `learningBeneficiaryPrivate/{beneficiaryId}` : coordonnées et informations personnelles strictement nécessaires, accès restreint.
- `learningEnrollments/{enrollmentId}` : programme, période, site facultatif et statut de demande.
- `learningRegistrationReceipts/{operationId}` : idempotence et résultat technique, sans recopier les données personnelles.
- `learningAuditLogs/{eventId}` : événements sensibles append-only côté serveur.

Cette nomenclature préfixée `learning` évite les collisions avec les collections existantes. Avant création, chaque champ sera validé avec le cahier des charges initial et les règles de conservation de WAT.

## 3. Service serveur requis

Les deux formulaires (public et agent) doivent appeler une API de confiance. Le navigateur ne doit jamais disposer d'un privilège d'écriture général sur le registre.

Contrat fonctionnel envisagé :
- `POST /api/learning/registrations/public` : demande publique, sans authentification d'équipe, sans e-mail obligatoire et sans rattachement obligatoire à une mosquée.
- `POST /api/learning/registrations/agent` : création par un agent authentifié; le serveur revalide son compte, ses scopes et son périmètre.
- `GET /api/learning/registrations/review` : file de dossiers en attente, réservée aux personnes habilitées.
- `POST /api/learning/registrations/{id}/decision` : accepter, demander une correction ou refuser; motif et auteur journalisés.
- `POST /api/learning/registrations/{id}/duplicate-review` : signaler et examiner des correspondances sans fusion automatique.

Réponses publiques génériques : elles ne doivent jamais révéler si une personne existe déjà dans le registre.

## 4. Sécurité obligatoire

- Validation serveur stricte, taille maximale du corps, limitation de débit et protection anti-automatisation.
- Vérification Turnstile côté serveur pour le parcours public, si le service est retenu et configuré.
- Vérification Firebase ID token côté serveur pour les parcours d'équipe; vérification de l'état actif et des scopes actuels à chaque opération.
- Les scopes proposés pour NH-1 sont `learning.beneficiaries.read`, `learning.beneficiaries.create`, `learning.beneficiaries.review`, `learning.beneficiaries.update` et `learning.private.read`. Ils restent inactifs tant que règles, backend et tests ne sont pas livrés.
- Aucun accès direct public en lecture Firestore; aucune écriture directe du navigateur dans les collections privées.
- Aucun compte d'équipe, rôle ou scope ne peut être créé depuis le formulaire public.
- Données des mineurs minimisées; consentement du représentant légal selon les exigences validées.
- Détection de doublons par candidats à examiner; aucune fusion automatique sur le nom, le téléphone ou l'e-mail seuls.
- Journalisation côté serveur; aucun journal réputé fiable ne peut être écrit par le client.

## 5. Choix d'hébergement à confirmer techniquement

Le dépôt utilise déjà Cloudflare Workers pour servir les assets statiques et Firebase/Firestore pour les données. Un Worker métier Cloudflare peut être étudié pour l'API, avec accès Firestore via une identité de service conservée uniquement dans les secrets Cloudflare. Aucune clé privée ne doit être placée dans Git, dans le JavaScript public ou dans l'APK.

Avant toute implémentation connectée, il faudra vérifier :
1. la possibilité d'utiliser une identité de service à privilèges minimaux et son mode de rotation ;
2. l'authentification Firebase des agents et la validation des jetons côté Worker ;
3. la vérification anti-abus du formulaire public ;
4. les limites et coûts des offres effectivement disponibles ;
5. l'isolation stricte des projets staging et production.

Aucun secret n'est actuellement supposé disponible. Aucun service payant ni changement de facturation ne sera activé sans décision explicite de WAT.

## 6. Ordre de livraison NH-1

1. Valider le schéma minimal et les champs du formulaire depuis le cahier des charges source.
2. Construire l'API et ses tests avec données fictives.
3. Écrire les règles Firestore fermées par défaut et les tests d'accès.
4. Construire la file de vérification et les décisions côté WAT Connect.
5. Construire les deux formulaires et les raccorder à l'API.
6. Tester abus, doublons, mineurs, permissions, répétition de requête et séparation staging/production.
7. Présenter les résultats en PR brouillon; aucun déploiement ni migration réelle sans accord.

## 7. Limite de cette étape

Cette décision documente un choix d'architecture et les dépendances réelles observées. Elle ne constitue pas une inscription fonctionnelle. Il serait dangereux de créer maintenant un formulaire qui écrirait directement dans Firestore ou qui simulerait une confirmation sans service serveur, règles dédiées et tests de sécurité.
