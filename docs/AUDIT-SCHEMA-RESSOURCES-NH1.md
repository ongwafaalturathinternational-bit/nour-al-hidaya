# Audit du modèle des ressources pédagogiques NH-1

Date : 22 novembre 2026  
Statut : audit documentaire du dépôt — schéma opérationnel non encore validé.

## Conclusion

Le dépôt ne contient pas de modèle Firestore opérationnel pour les sites, mosquées et groupes de Nour Al-Hidaya. Les sources disponibles sont des propositions de conception antérieures et des modules WAT Connect existants qui gèrent des objets différents. Il serait incorrect de présenter `learningGroups/{groupId}` avec `siteId`, `mosqueId` et `programId` comme un schéma existant.

## Sources vérifiées

| Source | Ce qu'elle établit | Ce qu'elle n'établit pas |
|---|---|---|
| `docs/MODELE-DONNEES-ET-PERMISSIONS.md` | Ancienne proposition : `groups/{groupId}` avec `name`, `mosqueId`, `teacherUids`, `learnerIds`. | Pas de `siteId`, pas de `programId`, et le document dit explicitement que le modèle est à valider. |
| `docs/ARCHITECTURE-INSCRIPTION-UNIVERSELLE.md` | `learningEnrollments` doit relier un dossier à un programme, une mosquée/structure, un groupe et une période. | Aucun schéma de champs final ni relation de référence validée. |
| `docs/DECISION-TECHNIQUE-NH1.md` | La décision NH-1 retient `learningEnrollments` avec programme, période, site facultatif et statut. | Elle ne définit pas de collection `learningGroups`, ni la relation site–mosquée–groupe. |
| `docs/ARCHITECTURE-WAT-CONNECT.md` | Le référentiel global prévoit des rôles et des périmètres programme/projet/site/dossier. | Pas de modèle physique des sites ou des mosquées. |
| `docs/LOT7-ACTIVITES-PRESENCES.md` | Les activités réelles utilisent `activities` avec lieu libre et rattachement facultatif à `projects`; les présences utilisent `attendance`. | Le lieu n'est pas un identifiant de site ou de mosquée; les participants ne sont pas encore reliés au registre central NH. |
| `firestore.rules` | Les projets peuvent référencer `programs/{programId}`; les profils apprenants contiennent un champ texte `mosque`. | Pas de règles pour `learningGroups`, `learningEnrollments`, sites ou mosquées. Le champ `users.mosque` est un choix de profil, pas un référentiel de structures. |

## État technique constaté

- Les programmes WAT existants sont dans `programs/{programId}`.
- Les projets WAT existants sont dans `projects/{projectId}` et peuvent référencer un programme par `programId`.
- Les activités WAT existantes utilisent `activities/{activityId}`, avec un champ `location` textuel et un `projectId` facultatif.
- Les présences WAT existantes utilisent `attendance/{recordId}`, liées à une activité par `activityId`.
- Aucun référentiel physique des sites et mosquées n'a été trouvé dans les règles et documents vérifiés.
- Le registre pédagogique NH-1 préfixé `learning*` est une cible nouvelle, non créée et non autorisée dans les règles actuelles.

## Conséquence pour le contrôle d'accès

Le helper `learning-authorization.js` qui lit `learningGroups/{groupId}` et exige simultanément `siteId`, `mosqueId` et `programId` s'appuie sur une hypothèse non prouvée. Il reste donc isolé et non raccordé aux routes. Il ne faut pas le faire pointer automatiquement vers l'ancienne collection `groups` : celle-ci est elle-même seulement proposée dans un document ancien et n'est pas une collection opérationnelle validée.

Le contexte d'autorisation devra être dérivé de références canoniques côté serveur :
1. groupe pédagogique NH ;
2. inscription NH qui rattache ce groupe au programme et à la structure/mosquée pour une période ;
3. référentiel site/mosquée si WAT confirme une hiérarchie entre ces structures.

Une dimension absente ne doit pas être inventée ni remplacée par une chaîne libre. Le serveur doit refuser l'accès tant que la relation nécessaire au scope demandé n'est pas résolue et vérifiée.

## Décisions requises avant raccordement

1. Confirmer si les mosquées sont des structures autonomes ou des sous-structures de sites.
2. Décider si un groupe appartient durablement à une mosquée ou si son rattachement varie selon chaque inscription/période.
3. Confirmer si le programme est porté par le groupe ou par l'inscription du bénéficiaire.
4. Définir les identifiants stables et les collections canoniques des sites, mosquées, groupes et inscriptions.
5. Définir comment les enseignants et agents sont affectés à ces ressources et comment les affectations expirent.
6. Approuver le modèle et ses règles avant toute activation des scopes `learning.*`.

Aucune donnée Firestore réelle n'a été lue ou créée. Aucune règle, permission, configuration, identité, secret ou déploiement n'a été modifié.
