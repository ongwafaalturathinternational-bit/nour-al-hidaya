# Consolidation technique WAT

## Socle et ordre de revue

| PR | Sommet vérifié | Dépendance et contrôles |
|---|---|---|
| #20 | `dfe3a67` | Dépend du Lot 8 (`6a1432c`). Contrôler permissions Club, candidature personnelle, acceptation atomique et maintien du registre. Le sommet est déjà ancêtre de #30. |
| #30 | `6283af3` | Dépend de #29 (`fc44c5a`), elle-même issue de #20. Contrôles historiques Firestore `45241208825` et APK `45241208881`. Socle applicatif de la recette locale. |
| #37 | `084208c` | Sur #30. Tester la reprise et la conservation des entrées ajoutées pendant l’envoi. Firestore `45286839273`. |
| #38 | `8ed1647` | Sur #37. Son sommet embarque déjà #37. Tester deux contextes, avec et sans Web Locks selon l’environnement. |
| #39 | `97bbb8a` | Sur #30. Peut être contrôlée en parallèle de #37/#38. Tester initialisation du cache, purge bloquée, nouvelle tentative et isolation du compte. Firestore `45289022627`. |
| #40 | `88e4a82` | Sur #20. Apporter seulement sa différence au sommet applicatif. Tester visiteur, vérification, renouvellement du jeton et dossier unique. |
| #36 | `ba65361` | Trois fichiers documentaires sur `main`. Ajouter à l’assemblage documentaire en dernier, sans en faire une base applicative. Fiche de recette et procédures complémentaires. |

Vérification locale réalisée en partant de #38, puis en combinant #39, #40 et #36 dans des objets Git temporaires. Aucun conflit textuel. Arbre `cbc834e1b678773330cd43e0be9dc381ecb1529d`, 126 tests Node hors émulateur réussis et bundle Capacitor staging généré. Aucune référence distante n’a été modifiée par cet assemblage. Toute promotion du résultat comme candidat de recette devra revalider les sommets, exécuter Firestore Emulator sur `demo-wat-connect` puis vérifier que l’APK désigne `wat-connect-staging`.

## Cloudflare et PR #36

Les journaux de deux builds, `08bffba4-5277-4d02-a92a-b00de7038591` et `bedeb45b-c558-46ca-8090-eac2629de128`, s’arrêtent à `bun run build:android:web`, avec `Script not found "build:android:web"`. La branche documentaire issue de `main` ne contient ni `package.json`, ni le script Capacitor, ni le fichier Wrangler du socle applicatif. Le même paquet web se prépare localement avec la pile applicative assemblée. Pour une future revue, conserver le contrôle sur une base applicative complète ou l’exclure des branches purement documentaires selon la politique d’intégration retenue. Aucun réglage Cloudflare distant n’a été changé.

## Recette avec comptes fictifs de staging

Complète `docs/RECETTE-ACCES-WAT-STAGING.md` de #36.

| Scénario | Action et preuve attendue |
|---|---|
| Club | Candidat vérifié sans dossier, puis avec dossier. Ouvrir directement, vérifier le statut, vérifier qu’un autre compte ne peut pas ouvrir le dossier et qu’un responsable habilité peut accepter atomiquement la candidature et la fiche. |
| Déconnexion | Dans deux onglets, mettre une écriture fictive en attente. Reconnecter, vérifier la confirmation, déclencher une purge alors que l’autre onglet est actif, fermer cet onglet et retenter. Confirmer que le compte suivant ne voit aucune donnée de la session précédente. |
| Nour | Modifier une réflexion pendant un envoi, avec deux onglets, puis vérifier la version enregistrée et la file locale. Répéter après coupure et changement de compte. Relever si Web Locks est disponible. |
| Programmes et Projets | Utiliser un compte en lecture et un compte gestionnaire. Confirmer les habilitations. Soumettre deux fois pendant un envoi, puis changer de compte. Vérifier une seule création et le fonctionnement du formulaire dans la nouvelle session. |

Relever SHA, projet, rôle fictif, navigateur ou appareil et résultat. Masquer les données d’accès dans les preuves. Aucun profil de recette distant n’a été utilisé pour cet assemblage.

## Modules et prochaines validations

- Présidence et Secrétariat : les modèles de décision, de procès-verbal, de registre et de rapport sont disponibles dans #36. Tester le circuit avec des pièces fictives. Les délégations, signataires et seuils d’engagement restent une décision de l’ONG avant automatisation.
- Finance : examiner le lot #12 sur sa propre base, avec recettes de séparation des fonctions, contrôle des pièces et rapprochement. Son intégration est distincte de cette pile.
- Programmes et Projets : le lot courant remet les commandes en état au changement de session et bloque une nouvelle soumission pendant l’envoi. Les règles et périmètres Firestore restent inchangés.
- Club Khuddam : conserver la validation atomique de #20 et le rafraîchissement du jeton de #40 dans la recette commune.

Travaux graphiques suspendus. Aucune fusion de pull request ni publication de production.
