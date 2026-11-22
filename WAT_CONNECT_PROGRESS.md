# WAT Connect — rapport de progression

Dernière mise à jour : 22 novembre 2026
Branche suivie : feature/nour-central-management-foundation
PR #20 : ouverte, brouillon, non fusionnée — fix/lot8-club-onboarding-and-access vers audit/wat-connect-lot8-projects-club-khuddam.
PR #22 : ouverte, brouillon, non fusionnée — feature/nour-central-management-foundation vers fix/lot8-club-onboarding-and-access.

## État vérifié à la reprise

- HEAD PR #22 avant ce correctif : 6be8c3d9042210c9a8d7c8bff21d5bdbf1ec8c47.
- PR #20 HEAD : d4c96e6dea969b9fce040a8536caade699bb9a9d; CI consultée : règles Firestore et build Android staging réussis.
- PR #22 CI du HEAD : API, règles Firestore sur l'émulateur fictif demo-wat-connect, et build Android staging réussis.
- Tests isolés locaux après le correctif Wrangler : 112 réussis, 0 échec.
- Motif normalisé enregistré sur les audits grant/update/revoke et inclus dans le hash idempotent de chaque demande. Le rejeu identique ne produit pas de deuxième audit; le même identifiant avec un motif modifié entre en conflit.
- .firebaserc : défaut demo-wat-connect, alias staging wat-connect-staging, aucun alias de production. Tests Firebase explicitement ciblés sur le projet demo; Android staging cible le projet staging.
- Aucun script/workflow Firebase de déploiement production observé. Le chemin Wrangler production reste distinct et n'a pas été lancé.
- Le build Preview Cloudflare automatique des commits 195853f et 6be8c3d a échoué avant création d'URL : Wrangler signalait le bloc previews manquant dans wrangler.staging.json. Correctif local ajouté : previews vide dans la seule configuration staging; test de confinement ajouté. Aucun déploiement Preview n'a eu lieu pendant ces échecs.
- PR #22 s'empile volontairement sur la PR #20 non fusionnée; main ne contient pas le fondement Lot 8 nécessaire à cette revue NH-1. Base conservée.
- Compte Cloudflare connecté en lecture seule. Workers wat-connect-staging et nour-al-hidaya existent; paramètres consultés : bindings, routes et migrations vides. Aucun secret/configuration n'a été modifié.
- Aucun connecteur Firebase, CLI firebase ou gcloud, ni credential env local détecté; l'identité institutionnelle et l'IAM staging restent impossibles à vérifier dans cette session.
- Routes métier NH-1 toujours fermées. Aucun compte réel, donnée réelle, configuration de production, merge ou déploiement production modifié/exécuté.

## Commits vérifiables

- 195853f — ajout du motif d'audit et extension de l'idempotence; tests, documentation et préparation Firebase staging.
- 6be8c3d — rapport de continuité initial WAT_CONNECT_PROGRESS.md.
- Prochain commit — correction de wrangler.staging.json et test anti-régression du bloc Preview.
- CI associée : API run 44990071689 (success), Firestore run 44990071677 (success), Android staging run 44990071687 (success).

## Tâches terminées

- Audit technique initial des PR #20 et #22, branches, dépendance de base et état CI.
- Revue de cohérence de l'architecture WAT Connect et NH-1 : référentiels communs; modules distincts; moindre privilège; séparation des données bénéficiaires privées; routes NH-1 fermées.
- Contrôle statique des scripts Firebase et Wrangler par environnement.
- Durcissement des motifs d'audit/idempotence des affectations et tests de rejeu/concurrence.
- Inventaire Cloudflare staging en lecture seule.
- Diagnostic Cloudflare du build échoué et correction staging préparée, validée localement.

## Tâches restantes

1. Maintenir le blocage Firebase documenté : aucun CLI, identité ni liaison Firebase accessible. Ne pas tenter d'accéder à des comptes réels.
2. Valider l'identité institutionnelle WAT, le rôle IAM minimal Firestore/Auth et les bindings/secrets staging. État actuel : aucun binding/secrets; pas d'accès Firebase vérifié. Ne pas ouvrir les routes avant preuve des autorisations et de bout en bout.
3. Étendre l'audit des checks, commentaires, fichiers et dépendances de PR #20/#22; préserver leur séquencement.
4. Poursuivre les tests Emulator uniquement avec identités/données fictives; vérifier l'atomicité, la concurrence, la confidentialité et le refus des clients.
5. Après les garde-fous NH-1, reprendre les modules WAT Connect dans l'ordre de la feuille de route sans fusionner leurs responsabilités.

## Décisions/éléments attendus de WAT

- Confirmation du propriétaire institutionnel du compte/projet Firebase staging et de l'identité de service dédiée, si la CLI ne permet pas de le vérifier.
- Validation du modèle de rôles/scopes et des périmètres NH-1 par WAT avant toute attribution réelle ou activation.
- Les exigences de protection des mineurs et les taxonomies restent à confirmer selon les documents NH-1 déjà préparés.

## Prochaine action

Publier le correctif Wrangler staging, confirmer que le build Preview réussit sans liaison à une ressource réelle, puis poursuivre les tests Emulator et l'audit des dépendances PR. Ne jamais fusionner, déployer production, toucher à des comptes/dossiers réels ni ouvrir les routes.
