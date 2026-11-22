# Nour Al-Hidaya — plan de tests fonctionnels et sécurité des affectations

Statut : plan de validation staging uniquement. Aucun compte réel, aucune affectation réelle, aucune route ouverte.

## 1. État du code observé

- `assignment-policy.js` fournit une décision pure fail-closed sur l'état, les scopes, les dates et le périmètre d'une affectation.
- `staff-auth.js` vérifie le jeton, l'état courant Firebase Auth (désactivation, e-mail vérifié, révocation), `staffAccess.active` et le scope exact. Les erreurs d'API Auth et les états incomplets bloquent l'accès.
- `learning-authorization.js` applique le contrôle institutionnel avant la résolution d'une ressource et le contrôle du périmètre d'affectation NH.
- `learning-assignment-service.js` contient les handlers internes grant/update/revoke. Ils exigent `learning.staffAssignments.manage`, vérifient le compte WAT cible et ne sont raccordés à aucune route HTTP.
- `firestore-rest.js` regroupe registre, reçu idempotent et événement d'audit dans un commit atomique avec préconditions de version ou d'absence. Les versions périmées et réutilisations conflictuelles de `requestId` sont refusées.
- Le catalogue attribuable est en liste blanche; le scope d'administration ne peut pas être attribué par ce service.
- Le compte de service, son droit IAM staging et le catalogue institutionnel restent à confirmer. Aucun compte ou document réel n'a été consulté ou modifié.

Les tests avec mocks valident le comportement local, mais ne prouvent pas encore les permissions IAM et l'intégration avec Firebase staging.

## 2. Niveaux de tests à mettre en place

### A. Tests unitaires — politique d'affectation

Fichier cible proposé : `tests/learning-assignment-policy.test.js`.

| Cas | Résultat attendu |
|---|---|
| Affectation active, scope exact, dates valides, ressource dans le périmètre | Autorisé |
| Affectation absente, inactive ou mal formée | Refusé |
| Scope absent, inconnu, dupliqué ou différent | Refusé |
| Avant validFrom | Refusé |
| À partir de validUntil | Refusé |
| Périmètre absent, vide, incomplet ou invalide | Refusé |
| Ressource hors structure/site/groupe/programme autorisé | Refusé |
| Dimensions de la ressource et de l'affectation incohérentes | Refusé |
| Horloge invalide | Refusé |
| Deux affectations séparées nécessaires pour reconstituer scope + périmètre | Refusé |

### B. Tests d'intégration — authentification et autorisation

À exécuter avec Firebase Emulator et des identités entièrement fictives.

- Jeton absent, invalide, expiré ou destiné à un autre projet : HTTP 401.
- E-mail non vérifié : HTTP 403.
- Compte WAT absent, suspendu ou désactivé dans Firebase Auth : HTTP 403.
- Compte actif sans affectation NH : HTTP 403.
- Affectation active mais sans scope institutionnel correspondant : HTTP 403.
- Affectation révoquée ou expirée : HTTP 403 dès la requête suivante.
- Scope valide mais ressource hors périmètre : HTTP 403.
- Ressource dont les dimensions de sécurité sont incomplètes : HTTP 403.
- Aucun cumul de scopes ou périmètres provenant d'affectations différentes.

Le statut Auth désactivé/révoqué doit être vérifié par une source serveur fiable; ne pas considérer le seul champ Firestore `staffAccess.active` comme une preuve suffisante.

### C. Tests des opérations d'affectation

Les tests isolés avec des identités et documents fictifs couvrent désormais les opérations internes :

1. Grant, update et révocation douce : registre versionné, reçu et audit.
2. Même requête rejouée : même résultat, motif conservé, sans second événement d'audit.
3. Réutilisation du requestId avec un motif différent : conflit, aucun nouvel événement.
3. Même identifiant avec contenu différent : conflit.
4. Deux mises à jour concurrentes avec la même version : une seule gagne.
5. Échec du commit : aucune écriture partielle.
6. Cible Auth désactivée, scope non autorisé ou périmètre incohérent : refus.

1. Création valide : une affectation serveur est créée, version 1.
2. Création ciblant un compte absent, non vérifié, désactivé ou inactif : refusée.
3. Scope inconnu ou non autorisé : refusé.
4. Périmètre vide, inexistant ou incohérent : refusé.
5. Modification avec `expectedVersion` courant : réussie, version incrémentée.
6. Modification avec version obsolète : conflit, aucune écriture.
7. Deux modifications concurrentes : une seule version gagne; aucune mise à jour silencieuse perdue.
8. Révocation : affectation conservée avec métadonnées de révocation, accès immédiatement refusé.
9. Répétition avec le même `requestId` et le même contenu : résultat idempotent, motif conservé, aucun événement d'audit en double.
10. Réutilisation du même `requestId` avec un motif, une cible, une affectation, une version ou un patch différent : conflit, aucune nouvelle mutation ni audit.
10. Échec d'écriture de l'audit : mutation annulée intégralement.
11. Suspension WAT : toutes les affectations deviennent inutilisables sans être effacées.
12. Réactivation WAT : ne réactive aucune affectation révoquée ou expirée.

### D. Tests des règles Firestore

Avec les règles réelles chargées dans l'émulateur :

- Client non authentifié : lecture/écriture du registre d'affectations refusée.
- Membre connecté : écriture directe du registre refusée.
- Administrateur connecté : écriture directe toujours refusée; opérations exclusivement via callable serveur.
- Client : création, modification et suppression des journaux d'audit refusées.
- Historique d'une affectation révoquée : aucune suppression client ou serveur ordinaire.

### E. Tests de confidentialité

- Les scopes d'administration pédagogique ne donnent pas automatiquement accès aux champs privés des bénéficiaires.
- Les dossiers concernant des mineurs restent refusés sans permission dédiée et explicitement attribuée.
- Les événements d'audit ne contiennent ni nom, ni contact, ni document, ni donnée sensible du bénéficiaire.
- Les réponses API ne renvoient que les champs nécessaires à la fonction demandée.

## 3. Préconditions techniques avant d'exécuter les tests d'intégration

1. Vérifier que le compte de service staging détient `firebaseauth.users.get` et l'accès Firestore requis.
2. Valider avec WAT le catalogue `learning.*` et l'attribution du scope administratif.
3. Exécuter les commits avec l'émulateur Firestore et des identités entièrement fictives.
4. Revoir le schéma, les périmètres et les règles de protection des mineurs avant tout raccordement futur.
5. Garder les routes fermées jusqu'à une décision de mise en service explicite.

## 4. Critères de sortie staging

La validation ne peut être considérée réussie que si :

- tous les tests positifs attendus passent;
- tous les tests de refus passent;
- les cas de concurrence et de panne d'audit prouvent l'absence d'écriture partielle;
- les règles Firestore refusent les écritures directes;
- les tests de suspension, révocation et expiration prouvent le refus immédiat;
- les rapports CI sont attachés à la PR et reproductibles.

## 5. Garde-fous

- Données de test fictives uniquement.
- Aucun compte réel créé, activé ou modifié.
- Aucun scope `learning.*` accordé à un membre réel.
- Aucune inscription ou route publique activée.
- Aucune fusion de PR et aucun déploiement sans autorisation explicite.
- Les décisions institutionnelles sur les délégations et les données privées restent à approuver avant toute activation.
