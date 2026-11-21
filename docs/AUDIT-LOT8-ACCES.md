# Audit ciblé — accès Club Khuddam et cohérence des habilitations

**Date : 21 novembre 2026**  
**Périmètre :** branche `fix/lot8-club-onboarding-and-access`, PR #20. Audit statique des pages, règles Firestore et tests associés. Les contrôles automatisés sont distingués des essais manuels.

## 1. Correctif de confidentialité livré dans cette session

L'espace candidat charge le document `volunteerApplications/{uid}` après renouvellement du jeton Firebase. Avant ce correctif, un chargement asynchrone commencé avec un compte pouvait terminer après un changement de session et réafficher le panneau personnel dans la page, même si l'observateur d'authentification avait entre-temps masqué ce panneau.

Le chargement est maintenant associé à une génération de session et au UID réellement connecté. Après chaque attente asynchrone, l'écran vérifie que la session est toujours la même. Une déconnexion ou un changement de compte invalide les réponses précédentes et vide les éléments qui pouvaient afficher l'état du dossier. Le correctif protège l'interface contre une réapparition tardive de données; les règles Firestore restent la protection d'accès côté serveur.

Un test de régression vérifie la syntaxe du script, l'invalidation des anciennes sessions et l'ordre renouvellement du jeton / lecture du document.

## 2. Contrôles d'accès confirmés dans le code

- `activeStaff()` exige un compte authentifié, une adresse vérifiée et un document `staffAccess/{uid}` actif.
- Le rôle textuel ne donne pas de droits à lui seul : les règles vérifient les scopes explicites.
- Le registre `volunteers` reste privé; `volunteers.read` autorise la lecture et `volunteers.manage` autorise les écritures.
- Le candidat ne peut lire que son document `volunteerApplications/{uid}`, sous réserve d'une adresse vérifiée. Il ne peut ni lister les candidatures, ni modifier ses informations après dépôt, ni s'auto-approuver.
- Le traitement d'une candidature est réservé à `volunteers.manage`; la règle n'autorise qu'une décision depuis l'état `en_attente`.
- Les affectations de bénévoles sous un projet exigent un scope projet **et** un scope Club. Le seul droit projet ne révèle pas les noms du registre.

Ces constats décrivent les règles présentes dans la branche; ils ne prouvent pas que les mêmes règles sont actuellement publiées dans Firebase production.

## 3. Incohérence d'interface à arbitrer — lecture des présences

Les règles Firestore distinguent `activities.read` / `activities.manage` et `attendance.read` / `attendance.manage`. Le test des règles confirme qu'un scope Activités seul ne donne pas accès aux présences.

Cependant, `activites.html` refuse actuellement l'ouverture du module si le compte ne possède pas `activities.read` ou `activities.manage`, même lorsque `attendance.read` ou `attendance.manage` est présent. Le sélecteur de présence est alimenté par la collection des activités, que ces règles n'autorisent pas à lire à un compte « présences seulement ».

**Conséquence :** le droit de lecture des présences existe côté règles, mais ne suffit pas à utiliser l'écran actuel. Il faut choisir entre :
1. déclarer explicitement que l'écran Présences requiert aussi `activities.read` et attribuer les deux scopes ensemble aux personnes concernées ; ou
2. construire une vue Présences autonome, qui n'expose pas le registre complet des activités et utilise une référence d'activité autorisée.

Aucune règle n'a été élargie dans cette session. Cette décision n'est pas tranchée automatiquement, car elle touche au périmètre de confidentialité des activités.

## 4. Intégrité des références de présence

Le document `attendance` vérifie l'existence de l'activité, le type et la longueur de `participantRef`, le libellé et le statut. Il ne vérifie pas que la référence correspond à un document `volunteers`, `members` ou à un futur dossier bénéficiaire. La saisie libre est actuellement utilisée pour permettre d'enregistrer des invités et d'autres participants.

Pour les bénévoles du Club, l'écran propose une sélection directe lorsque l'agent possède aussi un scope Club. Pour les apprenants et bénéficiaires, la référence reste une valeur saisie manuellement : elle ne doit pas être considérée comme un lien garanti vers un dossier central.

La future inscription universelle devra remplacer progressivement cette saisie libre par une référence opaque vers le registre central, tout en conservant un parcours encadré pour les invités.

## 5. Limites à ne pas masquer

- Le formulaire public du Club utilise Firebase Auth et une adresse e-mail vérifiée. Ce parcours de candidature n'est pas l'inscription universelle des bénéficiaires de Nour Al-Hidaya.
- La persistance Firestore IndexedDB des modules opérationnels n'est pas un coffre local chiffré. Les dossiers sensibles de bénéficiaires ne doivent pas être saisis hors connexion sur cette base.
- La notification unifiée est documentée comme architecture cible; aucun service d'envoi ni centre de notifications n'est encore livré.
- Aucun test sur téléphone Android physique, aucun test multi-agent réel et aucune vérification des règles effectivement publiées en production ne sont déclarés dans cet audit.

## 6. Prochaines vérifications

1. Auditer `projets.html`, les affectations et les transitions lorsqu'un bénévole devient inactif.
2. Ajouter une recette de scopes croisés pour Activités / Présences et Club / Projets.
3. Vérifier les parcours d'erreur réseau et de synchronisation des modules opérationnels.
4. Confronter l'architecture d'inscription universelle au cahier des charges initial avant toute implémentation.
5. Exécuter la recette sur Android avec des comptes fictifs aux scopes distincts, sans données réelles de bénéficiaires.
