# Préparation du déploiement Firestore — environnement staging

## État actuel

- Projet de test : `wat-connect-staging` (région Johannesburg, `africa-south1`).
- Projet de production : `wat-connect`.
- **État rapporté le 19 novembre 2026 :** l'opérateur a confirmé avoir publié dans Firebase Staging le contenu du fichier `firestore.rules` de la branche `security/verified-staff-firestore-access` (PR #17). Cette information est une confirmation opérateur, pas une vérification automatisée de la console Firebase. Avant tout test métier, comparer le contenu réellement publié avec le commit de référence et confirmer que le projet sélectionné est `wat-connect-staging`.
- Le fichier de référence du dépôt est `firestore.rules`.
- Les règles du dépôt sont compilées et testées par GitHub Actions avant toute proposition de déploiement.
- **Ce document ne déclenche aucun déploiement.** La production ne doit jamais être modifiée dans le cadre des essais staging.

## Cible Firebase explicite

Le fichier `.firebaserc` conserve la production comme projet par défaut pour ne pas modifier le comportement historique des commandes existantes. Il ajoute l'alias `staging` vers `wat-connect-staging`.

Pour toute opération de règles staging, utiliser le projet explicitement :

```bash
firebase deploy --only firestore:rules --project wat-connect-staging
```

Ne jamais utiliser une commande de déploiement sans `--project wat-connect-staging` pour cette opération. Ne pas lancer `firebase deploy` (déploiement global) : seul `firestore:rules` est concerné.

Avant toute commande, contrôler dans la console Firebase que le projet sélectionné porte exactement le nom **wat-connect-staging**. Ne jamais sélectionner `wat-connect`.

## Préconditions obligatoires avant déploiement

1. Vérifier que la PR contenant les règles et leurs tests est examinée et validée.
2. Vérifier dans GitHub Actions que le workflow **Firestore security rules** est terminé avec succès sur le commit exact.
3. Vérifier dans Firebase Console que le projet sélectionné est `wat-connect-staging`.
4. Vérifier que Firestore staging est bien la base de test et qu'aucune donnée réelle de production n'y a été copiée.
5. Obtenir une autorisation explicite de la direction avant de publier les règles staging.

Aucune règle permissive temporaire du type `allow read, write: if true` ne doit être ajoutée.

## Modèle d'accès d'équipe

Les documents `staffAccess/{uid}` sont réservés à la gestion de confiance. Un utilisateur connecté peut lire son propre document, mais ne peut ni créer, ni modifier, ni supprimer un registre d'accès.

Pour préparer un compte de test, après validation de la procédure :

1. Créer un utilisateur de test dans Firebase Authentication du projet staging uniquement.
2. Vérifier son adresse e-mail.
3. Relever son UID depuis Authentication.
4. Créer manuellement dans Firestore staging le document `staffAccess/{UID}`.
5. N'attribuer que les scopes strictement nécessaires au test.
6. Ne jamais réutiliser l'UID d'un compte de production.

Exemple de structure (valeurs fictives, à adapter au compte de test) :

```json
{
  "displayName": "Compte test WAT",
  "email": "test@example.invalid",
  "role": "testeur",
  "active": true,
  "scopes": ["programs.read"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Dans la console Firestore, les champs `createdAt` et `updatedAt` doivent être de type **timestamp**, pas des chaînes de caractères. Le rôle n'accorde pas de droits à lui seul : les règles vérifient les scopes.

## Portée actuelle des règles

Les règles couvrent explicitement les programmes, projets, activités, présences, membres, bénévoles, candidatures bénévoles, comptes et opérations financières, budgets, périodes comptables, rapprochements, profils apprenants et leurs données pédagogiques.

Les autres collections restent fermées par défaut. Les rôles d'équipe et leurs scopes doivent être attribués manuellement par une personne de confiance. Les écritures financières sont séparées des validations.

## Vérifications après déploiement (à effectuer uniquement après autorisation)

- Sans connexion : lecture et écriture refusées sur les collections privées.
- Compte de test sans document `staffAccess` : accès métier refusé.
- Compte inactif : accès métier refusé.
- Compte actif avec `programs.read` : lecture des programmes autorisée, création refusée.
- Compte actif avec `programs.manage` : opérations de programmes conformes aux règles.
- Compte apprenant : accès limité à son propre profil, ses progrès et ses données pédagogiques.
- Aucun accès croisé entre deux comptes apprenants.
- Finance : aucune opération sans scope dédié; saisie et validation restent distinctes.
- Vérifier dans Firebase Console que les essais ont été réalisés dans `wat-connect-staging`.

## Interdictions maintenues

- Aucun déploiement vers `wat-connect` sans autorisation distincte.
- Aucune fusion automatique des PR.
- Aucun service payant, changement de forfait ou activation de facturation.
- Aucune clé privée ou donnée d'identification réelle dans Git.
- Aucun compte de test créé sans décision explicite.
