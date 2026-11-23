# Consolidation WAT — 23 novembre 2026

## Ordre et dépendances

| PR | SHA vérifié | Base ou relation | Actions Firestore / APK |
|---|---|---|---|
| #20 | dfe3a67 | #11, lui-même empilé sur les lots antérieurs | 45096788793 / 45096788833 réussis |
| #30 | 6283af3 | #29 → #20 → #11 | 45241208825 / 45241208881 réussis |
| #37 | 084208c | #30 | 45286839273 / 45286839412 réussis |
| #38 | 8ed1647 | #37 | 45289005818 / 45289005744 réussis |
| #39 | 97bbb8a | #30, parallèle à #37–38 | 45289022627 / 45289022618 réussis |
| #40 | 88e4a82 | #20, indépendante des autres corrections | 45289943138 / 45289942874 réussis |
| #36 | ba65361 | main, documentation uniquement | Aucun workflow Actions sur le SHA |

Pour préparer la recette, prendre #38, qui inclut #37, #30, #29 et #20. Ajouter les diffs #39, #40 et #36. Cela a été exécuté dans une copie locale au commit temporaire cf43a67, sans conflit. Ne pas empiler #39 et #40 l’une sur l’autre : leurs bases actuelles préservent leur indépendance. Maintenir #36 comme livrable documentaire. La comparaison avec les branches de base doit être répétée si les commits changent.

Le rapprochement de #39 et #38 impose une vérification fonctionnelle du retour réseau et de la déconnexion pendant une écriture. #40 et #20 partagent le parcours Club, à recetter ensemble. #21, qui fournit le parcours de provisionnement, et #22, fondation du registre Nour, sont hors du regroupement demandé. Leurs interfaces doivent faire l’objet de recettes distinctes avant toute combinaison. Aucun travail graphique ne doit être repris à partir des anciennes planches.

## Validation locale

126 tests Node hors émulateur ont réussi sur l’assemblage. La suite complète sous l’émulateur Firestore, projet fictif demo-wat-connect, donne 179 réussites, 0 échec, 0 test ignoré. Le bundle web Capacitor de staging a généré 23 ressources web et trois SDK Firebase locaux. Le ciblage staging de firebase-init.js a été vérifié. La réussite des builds APK individuels ne qualifie pas l’APK de l’assemblage.

## Cloudflare #36

Build bedeb45b-c558-46ca-8090-eac2629de128, branche work/inventaire-fonctionnel-wat, commit ba65361. Le déclencheur exécute bun run build:android:web à la racine. Le journal s’arrête sur « Script not found "build:android:web" », avant la commande d’aperçu. Le diff de #36 par rapport à main ajoute trois documents. La racine de cette branche ne contient aucun package.json. La commande npm équivalente reproduit localement une erreur ENOENT. Le statut indique un déclencheur de build inadapté à cette branche documentaire.

Traitement proposé : exclure explicitement la branche documentaire du déclenchement d’aperçu (ou filtrer les chemins docs/** au niveau approprié) et réserver les aperçus aux branches compilables. Une exclusion ciblée limite l’effet sur les autres PR. Ne pas ajouter de dépendances Android à #36 pour satisfaire un check qui ne correspond pas à son contenu. Les réglages Cloudflare n’ont pas été modifiés.

## Recette Firebase staging

Utiliser des comptes fictifs déjà autorisés. Avant toute écriture, vérifier le projectId staging sur le bundle et dans la console. Relever SHA, profil, appareil, résultat et preuve anonymisée. Nettoyer les données conformément au protocole de staging.

| Cas | Précondition et action | Critère |
|---|---|---|
| Équipe | Tester un profil actif et un profil suspendu, tous deux de test | Droits conformes au périmètre; suspension effective et trace du changement |
| Club | Ouvrir comme visiteur, vérifier le courriel de test, recharger, déposer puis rouvrir le dossier | Jeton renouvelé, un dossier, suivi du seul titulaire et décision responsable liée à la fiche |
| Déconnexion | Déconnexion avec deux onglets, écriture en attente, puis reprise après fermeture de l’autre onglet | Purge complète ou message de reprise; aucune donnée de la session précédente après reconnexion |
| Nour | Quiz et note hors connexion; reconnecter deux onglets; ajouter une note pendant un envoi | La confirmation ne retire que la version envoyée; la dernière note est visible côté serveur; aucun envoi redondant observé avec Web Locks |
| Registre Nour | Recette distincte #22; agent de test habilité et agent hors périmètre | Inscription sans e-mail, périmètre respecté, reprise après coupure, un seul dossier final |

## Lot de procédures — preuves et validation des modules

| Module | Déclencheur | Trace attendue |
|---|---|---|
| Présidence | Dossier soumis à arbitrage | Décision, délégation applicable, date d’effet, responsable, échéance et preuve de clôture |
| Secrétariat | Réunion ou décision approuvée | Références croisées convocation, PV, registre des décisions et actions; copie signée et trace de diffusion |
| Finance | Demande d’achat puis opération soumise | Référence budgétaire, pièce, contrôle par un rôle distinct et justification du rejet ou visa |
| Programmes | Validation d’un rapport périodique | Synthèse par programme, périodes et sources; anomalies de qualité et suivi |
| Projets | Jalon évalué à échéance | Fiche projet, activité, présences agrégées, justificatif et mesure corrective |
| Club Khuddam | Candidature acceptée puis affectation | Approbation et fiche bénévole, compétence, mission, présence et clôture |

Prochain lot indépendant : éprouver ces circuits avec des dossiers fictifs, relier chaque échec au test ou au composant concerné, et compléter les tests applicatifs où une régression est reproductible. L’autorisation de la Présidence est nécessaire uniquement pour la fusion, la production, ou une modification des accès réels. Les scénarios Firebase nécessitent la disponibilité de profils de recette autorisés.

### Dossiers fictifs à préparer pour l’exercice métier

- DÉMO-01 : une convocation, un PV retourné pour correction, puis une version approuvée. Vérifier que le registre lie la décision à la bonne version et que le responsable clôture l’action avec une preuve.
- DÉMO-02 : une demande d’achat avec pièce manquante, puis complétée. Relever les états rejetée, soumise, validée et vérifier que seule la dernière écriture validée alimente le rapport. Faire intervenir un valideur distinct de l’auteur.
- DÉMO-03 : un programme, un projet, une activité, une candidature Club acceptée et une fiche bénévole. Vérifier l’affectation et la présence; comparer le total du rapport à la liste source. Tester ces chaînages là où les modules le permettent et consigner les étapes manuelles proposées.
