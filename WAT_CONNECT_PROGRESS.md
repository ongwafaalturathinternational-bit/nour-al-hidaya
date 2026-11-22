# WAT Connect — rapport de progression

Dernière mise à jour : 22 novembre 2026
Branche suivie : feature/nour-central-management-foundation
PR #20 : ouverte, brouillon, non fusionnée — fix/lot8-club-onboarding-and-access vers audit/wat-connect-lot8-projects-club-khuddam.
PR #22 : ouverte, brouillon, non fusionnée — feature/nour-central-management-foundation vers fix/lot8-club-onboarding-and-access.

## État vérifié à la reprise

- HEAD PR #22 avant l'amélioration de navigation : dbeb90a3e38c290b9f8f24c18fc8a816521c3dfb.
- PR #20 HEAD : d4c96e6dea969b9fce040a8536caade699bb9a9d; CI consultée : règles Firestore et build Android staging réussis.
- PR #22 CI du HEAD : API, règles Firestore sur l'émulateur fictif demo-wat-connect, et build Android staging réussis.
- Tests isolés locaux après le correctif d'idempotence : 113 réussis, 0 échec. Après l'amélioration responsive, la suite combinée ciblée passe à 115/115.
- CI du commit 52936f8 : API 44992027280, Firestore Emulator 44992027277, Android staging 44992027266 — tous réussis.
- Après ajout de previews: {}, la prévisualisation Cloudflare du commit 067bdcc a réussi : https://cc1d155c-nour-al-hidaya.ongwafaalturathinternational.workers.dev. Les workflows API, Firestore Emulator et Android staging de ce commit ont tous réussi (runs 44991535426, 44991535467, 44991535427). Le build Cloudflare précédent échouait avant déploiement; le nouveau résultat est une Preview de branche, pas une publication de production.
- Motif normalisé enregistré sur les audits grant/update/revoke et inclus dans le hash idempotent de chaque demande. Le rejeu identique ne produit pas de deuxième audit; le même identifiant avec un motif modifié entre en conflit.
- .firebaserc : défaut demo-wat-connect, alias staging wat-connect-staging, aucun alias de production. Tests Firebase explicitement ciblés sur le projet demo; Android staging cible le projet staging.
- Aucun script/workflow Firebase de déploiement production observé. Le chemin Wrangler production reste distinct et n'a pas été lancé.
- Le build Preview Cloudflare automatique des commits 195853f et 6be8c3d a échoué avant création d'URL : Wrangler signalait le bloc previews manquant dans wrangler.staging.json. Le commit 067bdcc ajoute previews vide dans la seule configuration staging; le test de confinement et le Preview de branche réussissent. Aucun déploiement de production n'a été lancé.
- PR #22 s'empile volontairement sur la PR #20 non fusionnée; main ne contient pas le fondement Lot 8 nécessaire à cette revue NH-1. Base conservée.
- Compte Cloudflare connecté en lecture seule. Workers wat-connect-staging et nour-al-hidaya existent; paramètres consultés : bindings, routes et migrations vides. Aucun secret/configuration n'a été modifié.
- Aucun connecteur Firebase, CLI firebase ou gcloud, ni credential env local détecté; l'identité institutionnelle et l'IAM staging restent impossibles à vérifier dans cette session.
- Routes métier NH-1 toujours fermées. Aucun compte réel, donnée réelle, configuration de production, merge ou déploiement production modifié/exécuté.

## Commits vérifiables

- 195853f — ajout du motif d'audit et extension de l'idempotence; tests, documentation et préparation Firebase staging.
- 6be8c3d — rapport de continuité initial WAT_CONNECT_PROGRESS.md.
- 067bdcc — correction du bloc previews Wrangler staging, test anti-régression et mise à jour du rapport; CI et Preview réussis.
- 52936f8 — test de rejeu update/revoke et mise à jour du rapport; tests locaux et CI réussis.
- CI associée : API run 44990071689 (success), Firestore run 44990071677 (success), Android staging run 44990071687 (success).

## Tâches terminées

- Audit technique initial des PR #20 et #22, branches, dépendance de base et état CI.
- Revue de cohérence de l'architecture WAT Connect et NH-1 : référentiels communs; modules distincts; moindre privilège; séparation des données bénéficiaires privées; routes NH-1 fermées.
- Contrôle statique des scripts Firebase et Wrangler par environnement.
- Durcissement des motifs d'audit/idempotence des affectations et tests de rejeu/concurrence.
- Extension des tests aux rejeux update/revoke avec changement de patch, version et motif.
- Navigation portail : liens publics conservés sur mobile, retour à la ligne et focus clavier visibles; test de régression dédié.
- Inventaire Cloudflare staging en lecture seule.
- Diagnostic Cloudflare du build échoué; correction Wrangler staging, test et Preview validés.

## Tâches restantes

1. Maintenir le blocage Firebase documenté : aucun CLI, identité ni liaison Firebase accessible. Ne pas tenter d'accéder à des comptes réels.
2. Valider l'identité institutionnelle WAT, le rôle IAM minimal Firestore/Auth et les bindings/secrets staging. État actuel : aucun binding/secrets; pas d'accès Firebase vérifié. Ne pas ouvrir les routes avant preuve des autorisations et de bout en bout.
3. PR #20/#22 : les deux sont ouvertes en brouillon, sans revue formelle ni fusion, et GitHub les signale mergeables. PR #22 a six fichiers en commun avec PR #20; le diff de branche reste grand car NH-1 est empilé au-dessus du jalon Lot 8. Ne pas changer la base sans arbitrage ni nécessité technique.
4. Poursuivre les tests Emulator uniquement avec identités/données fictives; vérifier l'atomicité, la concurrence, la confidentialité et le refus des clients.
5. Après les garde-fous NH-1, reprendre les modules WAT Connect dans l'ordre de la feuille de route sans fusionner leurs responsabilités.

## Décisions/éléments attendus de WAT

- Confirmation du propriétaire institutionnel du compte/projet Firebase staging et de l'identité de service dédiée, si la CLI ne permet pas de le vérifier.
- Validation du modèle de rôles/scopes et des périmètres NH-1 par WAT avant toute attribution réelle ou activation.
- Les exigences de protection des mineurs et les taxonomies restent à confirmer selon les documents NH-1 déjà préparés.

## Prochaine action

Pousser et faire valider par CI le test supplémentaire update/revoke; continuer la revue statique des modules et garder la limite Firebase IAM documentée. Ne jamais fusionner, déployer production, toucher à des comptes/dossiers réels ni ouvrir les routes.
