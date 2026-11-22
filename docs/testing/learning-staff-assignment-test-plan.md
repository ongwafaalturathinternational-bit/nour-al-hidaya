# Nour Al-Hidaya — plan de tests fonctionnels et sécurité des affectations

Statut : plan de validation staging uniquement. Aucun compte réel, aucune affectation réelle, aucune route ouverte.

## 1. État du code observé

- `assignment-policy.js` fournit une décision pure fail-closed sur l'état, les scopes, les dates et le périmètre d'une affectation.
- `staff-auth.js` vérifie le jeton Firebase, l'e-mail vérifié, `staffAccess.active` et le scope institutionnel.
- Le contrôle d'affectation n'est pas encore raccordé au middleware d'authentification des routes.
- Le middleware ne vérifie pas actuellement, à lui seul, le statut Auth désactivé/révoqué auprès de Firebase.
- `learning-audit.js` écrit un événement avec un identifiant aléatoire; il n'offre pas encore l'idempotence par `requestId` ni une transaction atomique avec la mutation d'affectation.
- Le contrat d'intégration définit le registre et les trois opérations, mais les fonctions callable ne sont pas encore implémentées.
- Le catalogue institutionnel PR #21 ne contient pas encore les scopes `learning.*`.

Ces constats signifient que les tests unitaires de politique ne suffisent pas à déclarer l'intégration sécurisée.

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

Pour les fonctions callable prévues :

1. Création valide : une affectation serveur est créée, version 1.
2. Création ciblant un compte absent, non vérifié, désactivé ou inactif : refusée.
3. Scope inconnu ou non autorisé : refusé.
4. Périmètre vide, inexistant ou incohérent : refusé.
5. Modification avec `expectedVersion` courant : réussie, version incrémentée.
6. Modification avec version obsolète : conflit, aucune écriture.
7. Deux modifications concurrentes : une seule version gagne; aucune mise à jour silencieuse perdue.
8. Révocation : affectation conservée avec métadonnées de révocation, accès immédiatement refusé.
9. Répétition avec le même `requestId` : résultat idempotent, aucun événement d'audit en double.
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

1. Ajouter les dépendances Emulator et le script de test seulement après confirmation de la configuration Firebase existante du dépôt.
2. Créer un projet/emplacement Emulator exclusivement fictif; ne jamais réutiliser les identifiants de production.
3. Ajouter les callables create/update/revoke dans un module séparé de la gestion générale des comptes.
4. Définir le catalogue `learning.*` et la règle d'intersection entre scopes WAT et scopes NH.
5. Implémenter la transaction Firestore qui écrit ensemble l'affectation et l'événement d'audit.
6. Rendre l'idempotence `requestId` explicite et tester les collisions/réessais.
7. Connecter la vérification d'affectation au middleware avant toute ouverture de route.
8. Exécuter les tests unitaires, Emulator et règles, puis joindre les rapports à la PR.

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
