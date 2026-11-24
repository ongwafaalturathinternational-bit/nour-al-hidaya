# Matrice permanente des exigences WAT

V0.1 · 24 novembre 2026. Inventaire des directives accessibles. Les exigences composites sont à scinder à mesure que les preuves sont établies. Les références de directive sont des titres de sources de travail, à rapprocher du cahier des charges officiel lors de la revue de couverture.

Statuts : **à étudier** (analyse à faire), **documenté** (besoin et contexte décrits), **spécifié** (comportement et contrôle attendus), **développé** (preuve GitHub limitée au périmètre cité), **testé** (recette rattachée à un environnement et un SHA), **validé** (visa daté), **mis en production** (déploiement et vérification attestés). Un test CI ne vaut recette métier. Un tiret indique que la preuve ou la PR n’a pas été identifiée sur ce passage. La priorité P1 couvre les prérequis ou risques majeurs et P2 les autres chantiers.

Origines : D1 = cahier des charges et ordre permanent ; D2 = transmission du référentiel et priorité financière ; D3 = approfondissement v0.2 ; D4 = contrôle d’exhaustivité ; D5 = réorganisation des responsabilités et séparation Work/Codex ; D6 = complément de suivi PR. Les numéros de document correspondent au référentiel v0.2. A1–A6 renvoient à [l’addendum](ADDENDUM-ADMINISTRATION-WAT.md). Résultats de recette : aucun résultat métier staging attribué par défaut. Pour ADM-06, CI Firestore relevée dans le journal, transport réel à qualifier. Pour FIN-03, calculs vérifiés sur données fictives, staging à qualifier. Pour NOU-01, tests API partiels déclarés et scénario staging à exécuter.

| ID | Directive | Exigence | Document | Spécification | PR ou preuve | Dépendances / visas | Priorité | Statut |
|---|---|---|---|---|---|---|---|---|
| ADM-01 | D4 | Courrier entrant et sortant | 01,06 | A1 | — | Délégations, GED | P1 | spécifié |
| ADM-02 | D4 | Registres administratifs et institutionnels | 01,06 | A1 | #72–75 métier uniquement | GED | P1 | spécifié |
| ADM-03 | D4 | Accès par organe, service, commission et projet | 08,09 | A2 | — | Annuaire, statuts | P1 | spécifié |
| ADM-04 | D4 | Délégations et pouvoir de signature | 09 | A2 | — | Statuts et règlement intérieur | P1 | spécifié |
| ADM-05 | D4 | Agenda institutionnel consolidé et export téléphone | 01 | A3 | #47, #80 | Registres et visibilité | P1 | développé |
| ADM-06 | D4 | Notifications, rappels et reçus | 01,08 | A3, RECETTE-AGENDA-RECONCILIATION | #48–53, #76–80 | Compte staging, transport | P1 | développé |
| ADM-07 | D4 | Réunions présentielles, virtuelles et hybrides | 01 | A3 | — | Agenda, fournisseur vidéo | P2 | spécifié |
| ADM-08 | D4 | Décisions et suivi de leur exécution | 01 | SPECIFICATIONS-PROCEDURES-ET-MODELES-WAT | — | Registre, agenda | P1 | spécifié |
| ADM-09 | D4 | Tableau de bord de la Présidence | 01,10 | A4 | — | Registres et habilitations | P1 | spécifié |
| ADM-10 | D4 | Réseaux sociaux et communication institutionnelle | 07 | A4 | — | Validation éditoriale | P2 | spécifié |
| ADM-11 | D4 | Échéances administratives, réglementaires et contractuelles | 01,03 | A3 | #47, #80 socle | Responsable et preuve | P1 | spécifié |
| GED-01 | D2–D4 | GED, classement, confidentialité et archivage | 06,08 | EXIGENCES-GED-FINANCE-ACHATS | #36 inventaire | Séries et conservation | P1 | spécifié |
| GED-02 | D2–D4 | Modèles, PDF, QR, numérotation et émission | 11 | SPECIFICATIONS-PROCEDURES-ET-MODELES-WAT, RECETTE-GED-ET-AUTHENTICITE | — | Délégations, GED | P1 | spécifié |
| FIN-01 | D2, D3 | Régime SYCEBNL et plan comptable officiel | 02,12,14,15 | EXIGENCES-GED-FINANCE-ACHATS | #12 socle | Ressources réelles et visa comptable | P1 | documenté |
| FIN-02 | D2, D3 | Journaux, grand livre, balance, lettrage et états | 02 | EXIGENCES-GED-FINANCE-ACHATS | #12, #71 partiels | Régime, catalogue validé | P1 | spécifié |
| FIN-03 | D2, D3 | Budget, trésorerie, caisse, Mobile Money et rapprochement | 02 | RECETTE-FINANCE-CONTROLE-BAILLEURS | #12, #70 partiels | Pièces et rapprochement staging | P1 | spécifié |
| FIN-04 | D2, D3 | Dons, cotisations, subventions, biens en nature et bailleurs | 02,14 | EXIGENCES-GED-FINANCE-ACHATS | #12 socle | Conventions et imputations | P1 | spécifié |
| FIN-05 | D2, D3 | Stocks, immobilisations, facturation et obligations Bénin | 02,16 | à préciser par volet | — | Applicabilité fiscale et pièces | P1 | documenté |
| ACH-01 | D2, D3 | Achats, consultations, fournisseurs et conflits d’intérêts | 03 | EXIGENCES-GED-FINANCE-ACHATS | — | Seuils, délégations et bailleurs | P1 | spécifié |
| ACH-02 | D2, D3 | Accords-cadres, contrats et échéances | 03 | EXIGENCES-GED-FINANCE-ACHATS | — | Visa et calendrier | P1 | spécifié |
| MET-01 | D1 | Programmes, projets et rapports | 04 | RECETTE-PROJETS-CLUB-LOT8 | #8, #11, #72–73 | Staging combiné | P1 | développé |
| MET-02 | D1 | Activités, présences et actions sociales | 04 | RECETTE-PROJETS-CLUB-LOT8, périmètre actions sociales à détailler | #10, #44–45, #74 hors actions sociales | Arbitrage #44/#45 | P1 | développé pour activités et présences |
| MET-03 | D1 | Annuaire, membres et volontaires | 05,09 | RECETTE-PROJETS-CLUB-LOT8 | #7, #11, #46 | Droits par rôle | P1 | développé |
| MET-04 | D1 | Club Khuddam : candidatures, vérification et approbation | 05 | RECETTE-PROJETS-CLUB-LOT8 | #20, #40, #84–86 | Comptes fictifs | P1 | développé |
| NOU-01 | D1 | Nour : admission sur site et sans courriel, centralisation | — | RECETTE-NOUR-ADMISSION-ET-PERIMETRES | #22, #54–62, #87–95 partiels | Raccordement staging | P1 | développé |
| NOU-02 | D1 | Nour : devoirs, quiz et suivi pédagogique | — | à compléter | #1–3 | Recette apprenant | P2 | développé |
| SEC-01 | D1 | Comptes équipe, vérification et révocation des accès | 08,09 | Recette staging à compléter | #17, #18, #21, #39 | Comptes fictifs et rôles | P1 | développé |
| SEC-02 | D1 | Séparation Firebase/Cloudflare staging et production | 08 | Journal Work | #13–16, #19, #68 | Configuration staging | P1 | développé |
| INT-01 | D4 | Interopérabilité et reprise hors connexion | 08 | A5, RECETTE-NOUR-ADMISSION-ET-PERIMETRES | #37–39, #57–65 socle | Identifiants, droits et connexion | P1 | spécifié |
| INT-02 | D4 | Services externes et alternatives | 07,08 | A6 | — | Conditions, coût total, protection des données | P2 | documenté |
| APP-01 | D1 | PWA et Android | — | Journal Work | #9, #29, #30, #81 | APK staging et appareil | P1 | développé |
| APP-02 | D1 | Trilingue FR/EN/AR, RTL et accessibilité | — | Journal Work | #27, #32, #33, #82–83 | Build combiné, recette terrain | P1 | développé |
| APP-03 | D1, D5 | Vitrine, lancement et maquettes officielles | — | Cahier des charges et réorganisation | #28, #31, #34–35 historiques | Nouvelles maquettes présidentielles | P2 | à étudier |
| GOU-01 | D1, D5 | Séparation Work/Codex et continuité horaire | — | WAT_WORK_PROGRESS | #50 (Work) | Journal et automate existant | P1 | documenté |
| GOU-02 | D6 | Consolidation des PR et diagnostic Cloudflare | — | Journal Work | #36, #41, #66 | Contrôles CI et assemblage staging | P1 | documenté |
