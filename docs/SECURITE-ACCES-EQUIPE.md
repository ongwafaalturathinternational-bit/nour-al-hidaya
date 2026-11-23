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

Les fonctions callable sont hébergées en région `us-central1` et exigent toutes App Check. À chaque appel, le serveur relit aussi le compte dans Firebase Authentication : il vérifie qu'il n'est pas désactivé, que l'adresse est vérifiée et que le claim `watAdmin` est toujours présent. Un ancien jeton client ne suffit donc pas après suspension ou retrait du claim.

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


## Validation CI après correction — 23 novembre 2026

- Le test statique de l'écran d'administration a été aligné sur la sélection d'environnement actuelle : hostname dédié ou variable injectée par le build, sans bascule par paramètre d'URL.
- Workflow WAT Connect validation : **réussi** — [run 45086639295](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45086639295).
- Firebase Emulator / règles Firestore et suite applicative : **183 tests réussis, 0 échec** — [run 45086639296](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45086639296).
- Ces résultats couvrent les règles et tests du dépôt; ils ne valident pas encore le déploiement des fonctions, App Check réel, ni le parcours complet avec Firebase staging.
- Aucun bootstrap administrateur, déploiement de fonction, modification de compte réel, fusion ou publication en production n'a été effectué.

## Revalidation du commit documentaire — 23 novembre 2026

HEAD vérifié : `2449aa853bcfafaf9ccb791ea03462a9497f5f61`.

- [Validation WAT Connect](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45086787116) : réussie — syntaxe, contrôles du portail/configuration et compilation à blanc du Worker staging.
- [Tests Firestore Emulator](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45086787122) : réussis — compilation des règles et suite complète `tests/*.test.mjs`.
- Ces validations concernent le commit indiqué. Elles ne constituent pas un déploiement, ni une vérification App Check en conditions réelles, ni un test de bout en bout des fonctions Firebase.
