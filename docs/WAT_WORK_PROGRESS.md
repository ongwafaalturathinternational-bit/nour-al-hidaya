# WAT Connect — suivi Work
24 novembre 2026 · Périmètre fonctionnel, documentaire, organisationnel, réglementaire et qualité.

Work audite les PR et leurs preuves, prépare les recettes et documente les résultats exclusivement sur work/*. Codex est responsable du code, des règles Firebase, de l’architecture, des tests automatisés et des builds. Le journal technique WAT_CONNECT_PROGRESS.md relève de Codex. La conception des maquettes relève de la Présidence. Les anciennes maquettes restent archivées. Les PR restent en brouillon et les changements de production ou de gouvernance suivent l’autorisation de la Présidence.

## État examiné avant le lot

| PR | Constats vérifiés | Suite |
|---|---|---|
| #44 / #45 | Même base #42. Les deux touchent activites.html et WAT_CONNECT_PROGRESS.md et protègent les soumissions Activités/Présences et la transition de compte. #44 contient aussi la procédure Agenda et un test de structure; #45 a son propre contrôle exécutable. | Arbitrage Codex sur le code, les preuves à conserver et la filiation. |
| #46 | Annuaire et Club, empilée sur #44. | Confirmer la base si Codex change la filiation Activités. |
| #47 / #48 | #47 empilée sur #44; #48 dépend de #47. iCalendar et préparation des rappels sont des briques de code, sans parcours utilisateur ni envoi livré selon les PR. | Contrôle métier sur données fictives et recette ultérieure sur parcours intégré. |
| #36 / #41 | Inventaire, modèles et matrice de consolidation déjà ouverts sur des branches Work. | Réutiliser ces documents; ajouter des preuves de recette et des exigences manquantes. |

## Fiche de contrôle fonctionnel Activités, Présences et Agenda

| Cas | Préparation fictive | Résultat à relever |
|---|---|---|
| Écriture en cours | Créer une activité puis solliciter un deuxième envoi pendant le premier | Une seule activité. Répéter avec une présence. |
| Changement de compte | Ouvrir un formulaire avec A, puis changer pour B pendant l’opération | Les champs de A disparaissent. Les commandes de B reflètent ses droits. Une confirmation tardive de A ne vide pas le formulaire de B. |
| Export après report | Utiliser la même réunion fictive, reporter l’heure et relire l’invitation | Même identifiant, révision supérieure, heure correcte et absence de données privées dans le fichier. Consigner le comportement du calendrier importateur. |
| Consentement après programmation | Retirer le consentement ou l’accès, puis simuler la date du rappel | Aucune remise au profil devenu inéligible. Le résultat distingue décision du serveur et remise sur appareil. |

Fiche de résultat par cas : [PR / SHA] · [environnement] · [rôle] · [action] · [nombre d’enregistrements] · [preuve anonymisée] · [résultat / ticket]. Aucun de ces scénarios sur appareil ou Firebase distant n’est déclaré réussi sur la seule base d’un test automatisé.

## Reprise
Vérifier les PR ouvertes avant chaque lot. Après l’arbitrage Codex, reporter la filiation et les preuves de CI. En parallèle, préparer la recette Présidence–Secrétariat à partir des modèles #36 et #41, avec un dossier fictif traversant convocation, décision, version du PV et preuve de clôture. Pour une recette avec comptes Firebase staging, utiliser des profils fictifs autorisés.

## Lots documentaires livrés

- PR #50, branche work/suivi-qualite-wat. Arbitrage demandé à Codex dans la [discussion de #45](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/45#issuecomment-7119243219).
- Dossier fictif Présidence–Secrétariat dans docs/RECETTE-PRESIDENCE-SECRETARIAT.md (commit a2a3c35). Les contrôles d’application restent à exécuter.
- PR #49 repérée lors du second inventaire. Vérifier avec Codex les preuves de réservation d’un rappel avant de préparer la recette complète, en réutilisant la fiche Agenda.

## Reprise immédiate — Agenda et Nour

- Recette des reçus Agenda dans docs/RECETTE-AGENDA-RECONCILIATION.md (9860a2b). CI Firestore confirmée sur #49, #51, #52 et #53. Transport réel et affichage sur appareil restent à qualifier.
- Recette de l’admission Nour dans docs/RECETTE-NOUR-ADMISSION-ET-PERIMETRES.md (fb3178c). CI API confirmée sur #54 et #55. Le parcours raccordé et des profils fictifs habilités restent nécessaires.
- Prochaine reprise : relire les PR ouvertes et vérifier les éléments nouveaux sur les périmètres et la preuve d’admission. Compléter la recette transverse avec les modèles #36/#41. Aucun changement d’architecture ou de règles par Work.

## Contrôles suivants — reprise continue

- Nour #56 (c3aa7ed), CI API 45316554636 réussie. Quatre cas NH-07 à NH-10 ajoutés au dossier d’admission (3f26707). L’écriture atomique de la demande et de son reçu reste à raccorder par Codex.
- Dossier Finance chiffré dans docs/RECETTE-FINANCE-CONTROLE-BAILLEURS.md (18e95ce). Résultats calculés sur données fictives, recette staging non exécutée. La dépendance du lot 8 et la validation institutionnelle restent applicables.
- Reprise : relire les PR ouvertes. Examiner les résultats nouvellement disponibles, puis préparer les circuits de recette Projets et Club à partir des modèles existants. Mode objectif autonome sans exécution planifiée : aucun contrôle d’activation exposé à cette session.

## Reprise horaire — 24 novembre 2026

- Tâche existante de coordination mise à jour, fréquence horaire (fuseau Africa/Porto-Novo). Consigne de vérifier l’absence d’autre exécution Work active et de reprendre depuis ce journal. Aucune nouvelle tâche. La vérification de SHA refuse l’écrasement concurrent du journal; elle ne garantit pas un verrou global.
- Projet et Club lot 8 : docs/RECETTE-PROJETS-CLUB-LOT8.md (67acae3), six cas prêts sur un assemblage staging à identifier après arbitrage #44/#45.
- Nour : complément au dossier d’admission (3d36b8f), contrôles #61–62 pour le rejeu et les périmètres, et cas de reprise locale distinct sur #63. Résultats d’application et comptes staging fictifs restent à obtenir.
- Reprendre en vérifiant les nouvelles PR, le suivi #44/#45 et l’éligibilité du SHA de recette. Continuer les contrôles indépendants si la qualification staging est bloquée.

## Référentiel institutionnel — 24 novembre 2026

- Spécifications neutralisées GED, Finance, Achats et Contrats dans docs/EXIGENCES-GED-FINANCE-ACHATS.md (1063f08). Points de départ applicatifs contrôlés : #12 et #69–71 pour Finance; réutilisation des registres #72–75 et de l’Agenda #76–82.
- Les originaux, l’inventaire nominatif et l’audit détaillé relèvent de l’espace privé. Aucune pièce administrative ou financière n’est rattachée à la PR.
- Reprise Work : vérifier les nouvelles PR et les versions attestées. Qualifier la recette GED et QR sur documents fictifs; compléter le rapprochement comptable côté privé lorsque journaux, conventions et pièces sont disponibles. L’activation des paramètres officiels dépend de la validation du régime, des mandats et des seuils. Continuer les contrôles indépendants si ces éléments sont en attente.

- Six scénarios de recette GED et authenticité sur documents fictifs préparés dans docs/RECETTE-GED-ET-AUTHENTICITE.md (1f0a82f). À exécuter sur staging.
