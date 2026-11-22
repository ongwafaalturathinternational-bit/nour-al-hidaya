# Nour Al-Hidaya — plan de tests sécurité des affectations

Statut : handlers internes testés avec identités fictives; intégration Firebase staging réelle non validée. Les routes restent fermées et aucun compte ou document réel n'est utilisé.

## 1. État vérifié

Au commit de code 62c46395771df3a02b24370282ac400ea517f92c :

- Tests NH-1 Node.js : 113/113 réussis. Ils utilisent des mocks isolés pour Auth, Firestore et les appels réseau.
- Règles Firestore dans l'émulateur avec le projet fictif demo-wat-connect : 144/144 réussis.
- Build APK debug explicitement routé vers Firebase staging : réussi.
- Les tests d'affectation couvrent grant/update/revoke, contrôle de scope et périmètre, dates, version attendue, concurrence, commits atomiques, motifs d'audit et rejeux idempotents avec un seul reçu et un seul événement.
- Les tests HTTP confirment que les mutations d'affectation ne sont pas exposées; les routes d'inscription restent en 503.
- Aucun de ces résultats ne valide les credentials, l'IAM ou les bindings du projet Firebase staging réel.

Les handlers sont des fonctions internes. Ils ne sont pas raccordés au routeur HTTP ou à des callable functions. Aucun scope learning.* n'a été accordé à une personne réelle.

## 2. Matrice des tests automatisés existants

### A. Identité Firebase et habilitations WAT

Les tests dans tests/learning-api-staff-auth.test.js, tests/learning-api-google-auth.test.js et tests/learning-api-assignment-service.test.js couvrent :

- jeton absent, mal formé, invalide, expiré ou rattaché à un autre projet : refus;
- e-mail non vérifié : refus;
- compte Auth désactivé ou non vérifié, UID incohérent ou état Auth illisible : refus;
- session révoquée ou état validSince invalide : refus;
- staffAccess absent/inactif, scope WAT exact absent ou registre illisible : refus;
- compte cible d'une affectation absent, désactivé, non vérifié ou inactif : refus;
- auto-attribution et tentative d'accorder learning.staffAssignments.manage : refus.

Le test de la dépendance réelle à l'identité WAT reste à faire après vérification institutionnelle du compte de service staging et des permissions minimales.

### B. Politique NH et périmètres

Les tests dans tests/learning-api-assignment-policy.test.js, tests/learning-api-learning-authorization.test.js et tests/learning-api-resource-resolver.test.js vérifient :

- scope exact, affectation active et dates valides;
- refus des scopes inconnus, dates impossibles, affectations expirées et inactives;
- présence et cohérence des périmètres structure/site/groupe/programme;
- résolution des ressources depuis les documents canoniques et refus des références absentes ou inactives;
- refus des ressources hors périmètre et absence de combinaison de scopes provenant d'affectations distinctes;
- séparation du scope des dossiers privés et des inscriptions en attente.

### C. Mutations, audit et concurrence

Les tests isolés dans tests/learning-api-assignment-service.test.js vérifient :

- grant, update et révocation douce avec incrément de version;
- motif normalisé et requestId présents dans les événements d'audit grant/update/revoke;
- un seul commit contient registre, reçu idempotent et audit; une panne ne laisse aucune écriture partielle;
- rejeu identique : même résultat et aucun nouvel événement d'audit;
- réutilisation du requestId avec motif, cible, opération, patch ou expectedVersion modifiés : conflit;
- demandes concurrentes identiques : un résultat initial, un rejeu, un reçu et un événement;
- mises à jour concurrentes avec la même version : une seule mutation gagne;
- version périmée, périmètre incohérent et champs serveur forgés : refus.

Les tests utilisent des documents et UID fictifs, sans requête à Firebase réel.

### D. Règles Firestore et routes

La suite Firebase Emulator charge les règles du dépôt avec le projet demo-wat-connect. Elle couvre les refus d'accès client aux collections protégées, les écritures de profil hors périmètre et les validations de données des modules existants. Les logs PERMISSION_DENIED associés aux cas négatifs sont attendus; le statut du workflow et le décompte de tests restent les critères de résultat.

La suite API vérifie que les URL candidates d'affectation ne sont pas raccordées au Worker (404) et que les routes d'inscription non configurées restent en 503. Toute nouvelle route est interdite dans ce jalon.

## 3. Validation d'intégration réelle staging — en attente

À effectuer uniquement après confirmation de l'identité institutionnelle WAT :

1. Confirmer que le projet est bien wat-connect-staging et que le compte de service appartient à l'organisation WAT.
2. Examiner les permissions IAM nécessaires aux lectures Auth, aux lectures de référence Firestore et aux commits des trois collections d'affectation. Retenir le rôle minimal, sans droit de gestion des comptes.
3. Confirmer les bindings/secrets du Worker de staging; vérifier leur absence d'accès à la production.
4. Utiliser un projet Emulator ou un espace staging dédié avec identités et documents fictifs.
5. Vérifier la lecture de l'état Auth (désactivation, vérification e-mail, révocation) puis l'autorisation WAT et le périmètre NH.
6. Exécuter des essais positifs, négatifs, de concurrence et de panne d'audit; vérifier le registre, le reçu et le journal créés atomiquement.
7. Vérifier à nouveau que les routes HTTP demeurent fermées et que les clients Firestore ne peuvent pas écrire dans les collections protégées.

Cette session ne dispose pas de credentials Firebase ou d'une preuve IAM WAT. Ne pas remplacer ces contrôles par des mocks et ne pas ouvrir de route en leur absence.

## 4. Décisions institutionnelles avant toute activation

WAT doit valider :

- l'autorité habilitée à attribuer les affectations nationales ou multi-structures;
- la matrice des rôles et scopes, dont l'accès aux dossiers identifiables et aux données de mineurs;
- les périmètres structure/site/groupe/programme et les durées d'affectation;
- les taxonomies pédagogiques et le parcours de protection des mineurs;
- la clé anti-doublon des inscriptions, séparément du requestId technique des mutations.

## 5. Garde-fous

- Utiliser exclusivement des identités et données fictives.
- Ne créer, activer, désactiver ni modifier aucun compte réel.
- Ne modifier aucun dossier réel de membre ou bénéficiaire.
- Ne modifier aucune configuration de production.
- Ne pas ouvrir les routes métier, fusionner une PR ou déployer en production.
- Maintenir les PR #20 et #22 ouvertes et la PR #22 empilée sur sa base Lot 8 tant que cette dépendance reste présente.
