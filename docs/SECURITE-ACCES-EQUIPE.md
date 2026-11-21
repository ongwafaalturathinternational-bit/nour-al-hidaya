# Registre sécurisé des comptes d'équipe

## Principe d'autorité

Le registre `staffAccess/{uid}` est la source d'autorité pour reconnaître un membre de l'équipe WAT. Le document est identifié par le Firebase Authentication UID exact du titulaire. Il est distinct du profil apprenant `users/{uid}`.

Le rôle décrit la fonction institutionnelle. Les `scopes` définissent les opérations réellement autorisées. Un rôle seul n'ouvre aucun module. L'administration centrale `watAdmin` est un claim distinct, réservé au provisionnement des comptes et à la gestion du registre.

## Schéma d'accès

```json
{
  "displayName": "Nom confirmé du membre",
  "email": "adresse-confirmee@example.org",
  "role": "formateur",
  "scopes": ["programs.read", "activities.read"],
  "active": false,
  "createdAt": "Firestore Timestamp",
  "createdBy": "UID administrateur",
  "updatedAt": "Firestore Timestamp",
  "updatedBy": "UID administrateur"
}
```

- `active` doit rester `false` jusqu'à la vérification de l'adresse et l'activation explicite.
- Les rôles et périmètres sont validés par listes autorisées dans les fonctions serveur.
- Les changements de fonction et de permissions sont horodatés et associés à l'UID de l'administrateur.
- Aucun mot de passe, hash ou secret d'authentification ne doit être enregistré dans ce document.

## Rôles institutionnels disponibles

`president`, `administrateur_systeme`, `responsable_administratif`, `responsable_financier`, `controleur_financier`, `responsable_formation_islamique_orientations`, `responsable_programme`, `coordonnateur`, `formateur`, `agent`, `commissaire_aux_comptes`, `bureau`.

## Périmètres actuellement acceptés par le serveur

- Annuaire : `members.read`, `members.manage`
- Programmes : `programs.read`, `programs.manage`
- Projets : `projects.read`, `projects.manage`
- Activités : `activities.read`, `activities.manage`
- Présences : `attendance.read`, `attendance.manage`
- Bénévoles : `volunteers.read`, `volunteers.manage`
- Finances : `finance.read`, `finance.manage`, `finance.validate`, `finance.budgets.manage`, `finance.accounts.manage`, `finance.periods.manage`

L'acceptation d'un périmètre par le formulaire ne signifie pas qu'il est déjà appliqué à chaque écran ou collection. Les règles Firestore correspondantes restent la barrière d'autorisation effective.

## Fonctions d'administration

Les fonctions callable sont hébergées en région `us-central1` et exigent toutes App Check.

- `createStaffAccount` : crée un compte Firebase non vérifié et inactif, crée son document d'accès, puis génère les liens de vérification et de définition du mot de passe. En cas d'échec du provisionnement, elle tente de supprimer le compte partiel.
- `listStaffAccounts` : fournit le registre à l'administration centrale, sans exposer de secret d'authentification.
- `updateStaffAccountAccess` : modifie le rôle et les périmètres d'un compte existant, avec journalisation de l'auteur et de l'heure ; l'auto-modification des droits est refusée.
- `setStaffAccountStatus` : exige une adresse vérifiée avant activation. En suspension, le droit Firestore est fermé avant la désactivation Firebase Authentication.

L'écran `staff-accounts.html` permet de créer, consulter, activer/suspendre et modifier les droits des comptes. Il est accessible uniquement à une session vérifiée portant le claim `watAdmin`.

## Provisionnement initial de l'administration centrale

Le script `scripts/bootstrap-wat-admin.js` est limité au projet Firebase `wat-connect-staging` et à l'adresse administrateur explicitement autorisée dans le script. Il refuse un compte désactivé ou dont l'adresse n'est pas vérifiée.

Ce script n'a pas été exécuté dans le cadre de cette PR. Ne jamais élargir la liste des adresses ni exécuter le script sur un autre projet sans autorisation explicite et vérification préalable.

## Blocages avant activation réelle

- La clé de site publique reCAPTCHA Enterprise dédiée au staging est intégrée dans `staff-accounts.html`. Il reste à enregistrer l'application Web de staging dans Firebase App Check et à vérifier l'activation du fournisseur. Ne pas contourner App Check.
- Les fonctions Firebase ne sont pas déployées.
- La validation CI actuelle comprend des contrôles de syntaxe, des tests source et la compilation des règles Firestore ; elle ne remplace pas un test d'intégration Firebase Emulator ni un test réel de bout en bout.
- Les règles de cette branche ne sont pas publiées en production.
- Toute activation nécessitant Firebase Blaze ou une ressource payante attend une décision explicite.

## Contrôles obligatoires avant ouverture

1. Un membre ne peut lire que son propre document `staffAccess`.
2. Aucun client ne peut créer, modifier, supprimer ou lister les documents `staffAccess`.
3. Un utilisateur sans document d'accès ou avec `active: false` est refusé.
4. Une adresse non vérifiée ne peut pas être activée.
5. Un rôle seul ne donne aucun droit sur les données métier.
6. Un scope non attribué ne donne aucun accès.
7. La suspension ferme d'abord l'accès Firestore, même si un ancien jeton Firebase est encore valide.
8. Les données pédagogiques privées d'un apprenant restent protégées des autres apprenants et des rôles qui n'en ont pas besoin.
