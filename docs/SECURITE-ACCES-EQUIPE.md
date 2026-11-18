# Registre sécurisé des comptes d'équipe

## Objectif

Le registre `staffAccess/{uid}` devient la source d'autorité pour reconnaître un membre de l'équipe WAT. Il est séparé du profil apprenant `users/{uid}`. L'identifiant du document doit être exactement le Firebase Authentication UID du titulaire.

## Schéma de document

Exemple de structure à créer manuellement dans Firebase Console pour un compte autorisé :

```json
{
  "displayName": "Nom confirmé du membre",
  "email": "adresse-professionnelle-ou-personnelle-confirmee@example.org",
  "role": "formateur",
  "active": true,
  "scopes": ["nour-al-hidaya:p1"],
  "createdAt": "Firestore Timestamp",
  "updatedAt": "Firestore Timestamp"
}
```

Règles de données :
- `displayName` : nom validé par WAT.
- `email` : doit correspondre à l'adresse du compte Firebase Authentication.
- `role` : un seul rôle principal au démarrage; les délégations multiples seront modélisées explicitement plus tard.
- `active` : booléen. Passer à `false` suspend l'accès métier sans supprimer l'historique.
- `scopes` : liste de périmètres attribués, par exemple `nour-al-hidaya:p1`, `programme:ramadan` ou `organisation:administration`. Ne pas utiliser `*` ou `all` par facilité.
- `createdAt` et `updatedAt` : horodatages Firestore.

## Identifiants de rôles

Rôles historiques du prototype pédagogique :
- `agent`
- `formateur`
- `parrain`
- `responsable`
- `coordonnateur`
- `bureau`

Rôles institutionnels à introduire progressivement, après définition des permissions de chaque module :
- `president`
- `responsable_administratif`
- `responsable_financier`
- `commissaire_aux_comptes`
- `administrateur_systeme`

Un rôle institutionnel n'est pas automatiquement équivalent à un rôle pédagogique. Les permissions détaillées devront être vérifiées dans les règles Firestore, pas seulement masquées dans l'interface.

## Procédure provisoire de provisionnement

Cette procédure est réservée au propriétaire ou à un administrateur de confiance du projet Firebase. Elle ne doit pas être proposée comme une fonction libre dans l'application.

1. Vérifier l'identité du membre, sa fonction et son autorisation institutionnelle.
2. Créer son compte Firebase Authentication avec son adresse e-mail exacte.
3. Faire vérifier son adresse e-mail.
4. Récupérer le Firebase UID du compte.
5. Dans Firestore, créer `staffAccess/{UID}` avec les champs ci-dessus.
6. Vérifier le rôle, le périmètre et l'état actif avant toute remise des accès.
7. Pour suspendre l'accès, mettre `active: false`; ne pas supprimer le document ni les données historiques.
8. Consigner hors de l'application qui a autorisé et réalisé le changement, jusqu'à ce qu'un journal d'audit serveur soit disponible.

Ne jamais demander au membre de créer lui-même son document `staffAccess`. Les règles interdisent volontairement toute écriture cliente dans cette collection.

## État technique actuel

- Les règles de la branche de travail autorisent uniquement la lecture du document d'accès correspondant au UID connecté.
- Les listes de documents sont interdites.
- La création, la modification et la suppression par client sont interdites.
- Les fonctions `activeStaff()` et `staffHasRole(role)` sont des primitives de sécurité préparatoires. Elles ne donnent encore aucun droit sur les collections métier.
- Aucun écran d'administration de comptes d'équipe n'est activé.
- Les identifiants et codes des acteurs de démonstration dans l'ancien prototype ne sont pas des comptes réels et ne doivent pas être utilisés en production.

## Contrôles obligatoires avant ouverture des modules

1. Un apprenant ne peut pas lire le document d'accès d'un autre UID.
2. Un membre d'équipe ne peut pas lire le document d'accès d'un autre UID.
3. Un utilisateur ne peut ni créer ni modifier ni supprimer son propre document d'accès.
4. Un utilisateur sans document d'accès est refusé.
5. Un compte avec `active: false` est refusé.
6. Un compte actif n'obtient que les permissions de son rôle et de ses périmètres.
7. Un rôle inconnu ou un périmètre non attribué ne donne aucun accès.
8. Les données pédagogiques privées d'un apprenant restent invisibles aux autres apprenants et aux rôles qui n'en ont pas besoin.

**Important :** les règles préparatoires de cette branche ne sont pas déployées dans Firebase. Il faut les compiler et exécuter les tests positifs et négatifs avant toute publication. La connexion réelle des membres d'équipe et les présences synchronisées restent bloquées jusqu'à la livraison complète de cette étape.
