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

## 3. Politique d'accès confirmée — écran commun Activités / Présences

Les règles Firestore distinguent `activities.read` / `activities.manage` et `attendance.read` / `attendance.manage`. L'écran actuel reste volontairement un écran commun : son ouverture exige `activities.read` ou `activities.manage`, et l'affichage des feuilles exige en plus `attendance.read` ou `attendance.manage`.

**Décision retenue pour le Lot 8 :** les responsables qui utilisent cet écran commun doivent recevoir les deux périmètres nécessaires. Un compte disposant uniquement d'un scope Présences conserve son accès Firestore à la collection `attendance`, mais ne peut pas lire les activités ni ouvrir cet écran commun. L'interface indique explicitement le scope manquant. Aucun droit supplémentaire n'est accordé automatiquement.

Une vue Présences autonome reste une évolution fonctionnelle ultérieure, à concevoir séparément si l'ONG souhaite déléguer le pointage sans donner accès au registre des activités.

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

## 7. Affectations après désactivation d'un bénévole

L'audit a relevé qu'une affectation créée pour un bénévole actif pouvait ensuite être repassée à « proposée » ou « confirmée » après que la fiche du bénévole était devenue inactive. La création vérifiait bien le statut actif, mais la règle de mise à jour ne le revalidait pas.

Le correctif ajoute une vérification côté Firestore de l'état final du document bénévole avec existsAfter/getAfter. Une affectation d'un bénévole absent ou inactif peut être clôturée (« retirée »), mais ne peut plus être réactivée. L'interface désactive les choix incompatibles et explique la raison; la règle serveur reste décisive si le statut change après le chargement de la page.

Les tests de règles vérifient aussi qu'une opération atomique qui désactive le bénévole tout en confirmant son affectation est refusée (contrôle de l'état final via existsAfter/getAfter), puis que les états « proposée » et « confirmée » restent refusés après désactivation tandis que la clôture est autorisée. Un test d'interface vérifie la disponibilité de la seule action de clôture.


## 8. Frontière du cache PWA — contrôle complémentaire

L'inspection de `sw.js` confirme que le service worker met en cache un ensemble explicite de ressources statiques de l'application et trois SDK Firebase versionnés. Les requêtes autres que GET sont ignorées; les ressources externes non listées et les URL locales absentes de la liste ne sont pas interceptées par la stratégie de cache. Les appels Firestore/Auth ne figurent pas dans les ressources précachées.

Un fichier de tests statiques `tests/service-worker-cache.test.mjs` a été ajouté pour verrouiller ces frontières : liste des ressources, liste blanche des SDK, refus des requêtes non-GET et absence de cache des URL métier non listées. Ce contrôle de code ne remplace pas un essai hors connexion réel sur Android ni une inspection des caches du navigateur.


## 9. Matrice de lecture des affectations — contrôle négatif et positif

Un test de règles supplémentaire verrouille les trois cas de lecture des sous-collections d'affectations :
- projects.read + volunteers.read : lecture autorisée;
- projects.read seul : lecture refusée;
- volunteers.read seul : lecture refusée.

Le test utilise des comptes fictifs et des documents de test. Il confirme que les noms de bénévoles présents dans les affectations ne sont pas révélés par un seul des deux périmètres. La règle Firestore existante reste inchangée; cette évolution renforce sa couverture de tests.

 
## 10. Format des dates et cohérence des périodes — 22 novembre 2026

L'audit a relevé que les règles vérifiaient principalement une longueur de dix caractères pour les dates. Cette contrainte acceptait des valeurs mal formées lorsqu'une écriture contournait les formulaires HTML. Les formulaires Programmes contrôlaient l'ordre début-fin côté interface, mais les règles Firestore ne garantissaient pas cet ordre.

Correctif appliqué dans la branche :
- ajout d'un contrôle partagé du format YYYY-MM-DD dans les règles Firestore ;
- application aux dates facultatives des programmes et projets, avec contrôle serveur de l'ordre début-fin lorsque les deux dates existent ;
- application aux dates obligatoires des activités, à la création comme à la mise à jour ;
- ajout de trois tests Emulator couvrant les formats invalides et les périodes inversées, y compris les mises à jour.

**Limite explicite :** le contrôle serveur valide la forme ISO et la longueur, mais ne calcule pas le calendrier grégorien. Une valeur telle que 2027-02-31 conserve une forme correcte et n'est pas rejetée par cette seule règle. Les formulaires utilisent des champs HTML de type date ; une validation calendaire serveur plus complète pourra être ajoutée si les dates deviennent des données critiques pour des traitements automatisés.

Validation automatisée du HEAD 46ea6cc77594f9a53124d88d2838fd6679691e34 : 129 tests Firestore/applicatifs réussis, 0 échec, 0 ignoré. La construction APK staging a également réussi; elle ne constitue pas un test sur téléphone physique.


## 11. Cohérence entre acceptation et registre des bénévoles — 23 novembre 2026

L'audit des règles a relevé un écart entre l'interface et la garantie serveur : l'interface traitait l'acceptation dans une transaction qui créait aussi la fiche volunteers/{uid}, mais la règle autorisait un gestionnaire à passer directement une candidature à acceptee sans créer cette fiche. Une écriture directe ou un client modifié pouvait donc produire un dossier accepté absent du registre opérationnel.

Correction apportée dans la branche :
- une candidature ne peut être acceptée que si aucune fiche bénévole de même identifiant n'existait avant l'opération ;
- la fiche correspondante doit exister après l'opération, être active et reprendre les données essentielles de la candidature ;
- son auteur, son horodatage de création et son dernier auteur/horodatage doivent correspondre au gestionnaire et à l'opération courante ;
- l'acceptation et la création doivent donc être réalisées dans le même batch/transaction Firestore ;
- le refus reste une décision autonome et ne crée pas de fiche bénévole.

Tests ajoutés : acceptation directe refusée, création atomique avec identité divergente refusée, création atomique cohérente acceptée. La validation Emulator du commit est suivie dans le journal de continuité.