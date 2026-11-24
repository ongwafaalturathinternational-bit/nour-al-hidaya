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
