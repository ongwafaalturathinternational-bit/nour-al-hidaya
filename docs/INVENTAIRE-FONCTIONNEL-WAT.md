# WAT Connect — inventaire fonctionnel et modèles administratifs
23 novembre 2026 · Coordination, sur la base du cahier global v1.0 (§4–7, §10–16).

## Directive applicable

Le Président conçoit les nouvelles maquettes de l’ensemble de l’écosystème. Les anciennes propositions Work et Codex, notamment les PR #31, #34 et #35 et les volets graphiques des autres branches, sont conservées comme archives et écartées des références. Suspendre la conception, la refonte et la supervision graphiques jusqu’à réception des nouvelles maquettes officielles. Les exigences fonctionnelles sont à vérifier dans le cahier global et les sources validées. Work coordonne, prépare les documents et contrôle les preuves. Codex intervient sur les chantiers techniques qui lui sont confiés. Aucune fusion ni mise en production sans autorisation de la Présidence.

## Inventaire

« En brouillon » signale un travail versionné. Un workflow réussi valide les contrôles du commit, puis la recette staging doit démontrer le parcours avec les profils prévus.

| Module | Étapes documentées | Reste à vérifier ou livrer |
|---|---|---|
| Présidence | Besoins de pilotage et de décision décrits au §4.2. Aucun lot dédié repéré parmi les PR #1–35. | Registre des décisions, échéances, vue par programme, rapprochement des indicateurs avec leurs sources, droits de consultation et export. |
| Secrétariat | Agenda, réunions, convocations, PV, courriers et échéances spécifiés au §4.2. Aucun lot dédié repéré. | Valider le circuit préparation → réunion → approbation → suivi → archivage. Utiliser les modèles v0.1 ci-dessous pour une recette sur données fictives. |
| Finances | #12 en brouillon. Recettes/dépenses, justificatifs et validation par une autre personne décrits. CI Firestore réussie sur 015da87. | Recette comptable et habilitations. Vérifier couverture SYCEBNL, journaux, balance, grand livre, états, lettrage, rapprochement, SMT/SN, stock, facturation et GED. Garder le lot ouvert et reprendre son développement après validation du lot 8. |
| Projets | #10 et #11 en brouillon. Registres projets, activités, présences et affectations décrits. | Prouver le lien programme → projet → activité → présence et la restitution à un responsable habilité. Vérifier pièces, résultats et rapports. |
| Programmes | #8 registre sécurisé. #22 fondation Nour. CI API, Firestore et APK réussie sur c6d0223. API distante fermée par défaut si non configurée. | Prouver en staging le dossier sans e-mail, les périmètres agents, l’auto-inscription, le brouillon hors connexion, la reprise et l’absence de doublon. |
| Membres | #7 annuaire, #21 provisionnement. CI WAT et Firestore réussie sur 750c111. | Recetter création, vérification, activation, affectation, suspension et journalisation avec des comptes de test habilités. Aucun changement sur un compte réel. |
| Volontaires | #11 et #20 en brouillon. Affectations, espace candidat et suivi du dossier ; #33 contrôle les accès au portail. | Recetter le parcours candidature → vérification → suivi → validation → affectation ; vérifier les trois catégories, la confidentialité et les listes de présence. |
| Accès web et Android | #29–30 stabilisation ; #32 accès Nour FR/EN/AR sur b3f6f7a ; #33 accès WAT/Club sur f8bd8c4. APK staging et Firestore réussis pour #32 et #33. | Vérifier sur appareil la WebView et les retours vers WAT ; remplacer les refus simulés par des essais avec comptes staging autorisés. Séparer les corrections fonctionnelles des choix graphiques non validés. |

## Dépendances et preuves de recette prioritaires

1. **Accès** — Une personne sans habilitation ne voit aucun espace d’équipe. Un compte staging vérifié et habilité accède à son périmètre exact. Journaliser le résultat avec PR, commit, rôle, environnement et date.
2. **Lot 8** — Vérifier qu’une candidature acceptée crée la fiche attendue et que les présences et affectations remontent dans le bon projet. Relever l’état du dossier avant et après chaque étape.
3. **Nour terrain** — Enregistrer un dossier fictif sans e-mail, couper le réseau, reconnecter puis relancer l’application. Relever le statut local et l’identifiant du dossier confirmé côté serveur. Une double soumission ne doit pas créer deux dossiers.
4. **Finance** — Faire vérifier par la Trésorerie et le contrôle financier les pièces, les habilitations, les rapports et le référentiel. Un auteur ne valide pas sa propre écriture. Les écritures en attente ne contribuent pas aux soldes validés.
5. **Gouvernance** — Vérifier les instances, signataires, règles de quorum, accès et délais de conservation contre les textes approuvés avant d’automatiser ces règles.

## Modèles administratifs v0.1 — brouillons de travail

### Convocation et ordre du jour
- Référence : [ ] · Instance : [ ] · Réunion prévue le : [date, heure, lieu ou lien]
- Émetteur habilité : [ ] · Destinataires et mode d’envoi : [ ]
- Points : [sujet | rapporteur | document préparatoire | information / décision]
- Pièces jointes : [ ] · Échéance de réponse : [ ] · Validation de l’envoi : [nom, date]

### Procès-verbal
- Référence : [ ] · Instance : [ ] · Date et lieu : [ ] · Présidence de séance et secrétariat : [ ]
- Présents, représentés, absents : [ ] · Vérification du quorum selon le texte applicable : [ ]
- Pour chaque point : [résumé | décision | résultat du vote si applicable | réserves]
- Suites : [action | responsable | échéance] · Pièces annexes : [ ]
- Statut : [brouillon / soumis / approuvé] · Approbation : [date, signataires] · Version et accès : [ ]

### Registre des décisions et suivi
| Référence | Instance et PV source | Décision | Responsable | Échéance | Statut | Preuve de réalisation |
|---|---|---|---|---|---|---|
| [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

### Circuit documentaire proposé
Le Secrétariat crée un brouillon identifié, rattache les justificatifs et soumet le document au responsable habilité. Celui-ci approuve ou retourne une demande de correction motivée. Après approbation, le Secrétariat classe la version signée et lie les décisions au registre. Les corrections ultérieures créent une nouvelle version. Les règles de signature, de diffusion et de conservation sont à confirmer auprès de l’ONG.

## Validations nécessaires
Maquettes officielles pour reprendre le travail graphique. Textes de gouvernance et circuit de signature pour formaliser les modèles. Accès staging et profils de recette autorisés pour les vérifications bout en bout. La préparation des procédures et la consolidation des preuves peuvent avancer en parallèle.
