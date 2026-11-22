# Audit de compatibilité PR #21 / NH-1 — 22 novembre 2026

**Branches examinées**
- NH-1 : `feature/nour-central-management-foundation`
- Comptes d'équipe : `security/staff-account-provisioning`

**Statut : audit statique uniquement.** Aucun changement n'est apporté à la PR #21, aucun compte ni document n'est créé, aucun service n'est déployé.

## Résultat

La PR #21 fournit un mécanisme serveur utile pour créer et gérer les comptes d'équipe WAT Connect, mais elle n'est pas encore compatible avec le modèle d'autorisations Nour Al-Hidaya proposé dans NH-1.

### Écarts confirmés dans le code de la PR #21

1. **Catalogue de permissions incomplet pour NH** : `functions/index.js` définit `ALLOWED_SCOPES` avec les domaines institutionnels existants (`members.*`, `programs.*`, `projects.*`, `activities.*`, `attendance.*`, `volunteers.*`, `finance.*`). Aucun des scopes `learning.*` proposés par NH-1 n'y figure. Les fonctions de création et de modification rejetteraient donc les permissions NH.
2. **Formulaire incomplet** : `staff-accounts.html` ne présente que les scopes institutionnels et financiers. Aucun scope NH ni affectation site/mosquée/groupe/programme n'est proposé.
3. **Affectations absentes** : les fonctions écrivent le rôle et les scopes dans `staffAccess/{uid}`, mais ne créent ni ne mettent à jour `learningStaffAssignments/{uid}`.
4. **Pas de séparation des affectations et des privilèges** : la PR #21 sait attribuer une liste de scopes, mais ne vérifie pas qu'un scope NH est limité à un périmètre pédagogique déterminé.
5. **Aucun historique métier des affectations NH** : les métadonnées générales `updatedAt/updatedBy` de `staffAccess` ne remplacent pas un journal de création, modification, expiration et révocation des affectations de périmètre.

## Éléments réutilisables

- Les opérations de provisionnement sont côté serveur avec Firebase Admin SDK ; le navigateur n'écrit pas directement dans `staffAccess`.
- Les fonctions exigent une session, un e-mail vérifié, un compte non désactivé, le claim central `watAdmin` et App Check.
- Les rôles et scopes sont validés contre des listes blanches.
- Les nouveaux comptes sont initialement inactifs.
- Les changements d'état synchronisent Firestore et Firebase Authentication avec une stratégie de restauration en cas d'échec.
- Le compte administrateur central `watAdmin` est distinct du rôle métier `administrateur_systeme`.

## Décision technique

**Ne pas fusionner les PR #21 et #22 en l'état et ne pas activer de scope NH dans la PR #21.** La PR #21 peut devenir le point d'entrée de provisionnement après extension contrôlée, mais les responsabilités doivent rester séparées :

- `staffAccess/{uid}` : identité d'équipe, état du compte, rôle institutionnel et catalogue de scopes accordés ;
- `learningStaffAssignments/{uid}` : affectations NH explicites et datées ;
- vérification API NH : intersection obligatoire entre scope dans `staffAccess`, scope dans l'affectation active et périmètre réel de la ressource ;
- interface d'administration : écran d'affectation NH séparé, avec aperçu des droits effectifs avant validation.

## Plan d'intégration proposé

1. **Contrat partagé** : extraire le catalogue NH depuis le document de proposition NH-1 et le valider côté serveur ; refuser les scopes inconnus, doublons et valeurs globales implicites.
2. **Provisionnement** : étendre les fonctions PR #21 pour accepter les scopes NH autorisés, sans leur donner de sens global ; l'absence d'affectation doit laisser l'accès NH fermé.
3. **Affectations** : ajouter une opération serveur dédiée à la création, modification, expiration et révocation des affectations. Toute mutation doit exiger `watAdmin`, App Check, une raison et un journal serveur.
4. **Interface** : afficher les affectations séparément des cases de scopes ; interdire une affectation vide interprétée comme « tous les sites » ; demander une confirmation explicite avant toute extension de périmètre.
5. **API NH** : implémenter le contrôle de périmètre dans le Worker NH avant tout raccordement de route ; ne jamais faire confiance à un siteId ou groupId fourni seul par le navigateur.
6. **Tests** : tester la création sans affectation (refus NH), les scopes inconnus, l'affectation expirée, les accès inter-sites, la révocation, le compte suspendu, l'accès aux données privées et l'échec du journal d'audit.

## Conditions de sortie

La compatibilité ne sera considérée comme acquise qu'après :
- tests automatisés des fonctions de provisionnement ;
- tests d'autorisation NH avec périmètres concordants et non concordants ;
- tests négatifs de lecture des données privées ;
- vérification que les changements de rôle ne créent pas d'affectation implicite ;
- revue des deux PR ensemble, sans fusion automatique ;
- validation explicite par WAT de la matrice institutionnelle.

**État actuel :** PR #21 réutilisable comme fondation de gestion des comptes, mais extension NH bloquée par l'absence de scopes `learning.*` et d'affectations pédagogiques. Les routes NH-1 doivent rester fermées.
