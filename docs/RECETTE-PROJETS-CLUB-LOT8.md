# Recette sur données fictives — Projets et Club Khuddam
24 novembre 2026 · Complément aux PR #36 et #41 · Références applicatives #11, #20, #40, #42, #44 et #46

Ce dossier qualifie la chaîne programme → projet → activité → présence, ainsi que son lien avec le Club. Il complète la fiche d’accès existante par des décomptes et des critères de résultat. Tester sur un assemblage staging identifié, avec profils fictifs de candidat, de responsable Club, de coordonnateur et de lecteur hors périmètre.

| Cas | Action | État attendu |
|---|---|---|
| PC-01 | Candidat fictif A vérifie son adresse et dépose sa candidature. Il recharge le suivi. | Une candidature à son nom, zéro fiche bénévole avant décision. A ne voit ni le registre Club ni le dossier de B. |
| PC-02 | Responsable habilité accepte A et refuse le candidat fictif B. Répéter les décisions. | Une fiche bénévole active pour A et aucune pour B. Les décisions et leurs auteurs restent traçables. |
| PC-03 | Affecter A à PROJ-DÉMO-01, confirmer puis retirer et réaffecter A au même projet. | Une seule affectation par couple bénévole/projet. L’état reflète la dernière décision et l’historique disponible demeure consultable. |
| PC-04 | Lier PROJ-DÉMO-01 à un programme, créer une activité et inscrire la présence de A. | L’activité référence le bon projet; la présence référence l’activité et le bénévole attendus. Vérifier le résultat dans le registre et l’export existant. |
| PC-05 | Simuler une seconde soumission pendant l’enregistrement d’une présence. Changer ensuite de compte avant la réponse d’une seconde opération distincte. | Un seul enregistrement pour la double soumission. Le formulaire du compte suivant ne conserve ni les saisies ni le statut du compte précédent. |
| PC-06 | Ouvrir le tableau de présences avec puis sans le périmètre de lecture. | Les données et exports restent limités aux profils autorisés. Relever séparément l’effet des droits de lecture du Club et des activités. |

Preuve par cas : [SHA] [profils] [référence fictive] [comptes avant/après] [état] [preuve anonymisée] [écart]. Cette fiche décrit les attendus; les scénarios d’application restent à exécuter. Aligner la filiation Activités sur l’arbitrage Codex #44/#45 avant de choisir le SHA de recette.
