# Journal de continuité — WAT Connect / Nour Al-Hidaya

**Dernière mise à jour : 21 novembre 2026**  
**PR de travail :** [#20 — Correctif parcours candidat et Club Khuddam](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/20)  
**Branche :** `fix/lot8-club-onboarding-and-access`  
**Base de PR :** `audit/wat-connect-lot8-projects-club-khuddam`

## Point de reprise vérifié avant les changements de cette session

- Head de PR #20 : `ea8b8d2955df32b360df14cdc633d56d2785ebef`.
- PR ouverte, en brouillon, non fusionnée; aucune publication de production.
- Le commit précédent ajoutait l'architecture cible des notifications unifiées. Cette architecture ne correspond pas à une fonction de notification déjà livrée.
- Sur ce head exact, le workflow Firestore a réussi avec **108 tests, 0 échec, 0 ignoré** : [run 44844830257](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44844830257).
- Sur ce même head exact, le build Android debug a réussi : [run 44844830267](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44844830267). Artefact [14682447612](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44844830267/artifacts/14682447612), 4 370 493 octets, expiration prévue le 5 décembre 2026.
- Ces résultats remplacent les résultats antérieurs pour le contrôle du head courant; les validations historiques des commits précédents ne sont pas réutilisées comme preuve du head.

## Travail engagé dans cette session

- Correction d'une course de session dans l'espace candidat : un chargement asynchrone ancien ne doit plus pouvoir réafficher le dossier après déconnexion ou changement de compte.
- Ajout d'un test de régression de session et de syntaxe.
- Ajout d'un audit ciblé des règles Club / Projets / Présences.
- Les validations CI du nouveau commit sont à inscrire ici après leur conclusion; ne pas confondre le SHA parent ci-dessus avec le commit de correction.

## Constats à garder visibles

- Les règles Firestore protègent le registre du Club, les candidatures et les affectations par compte vérifié, état actif et scopes explicites.
- L'interface Activités exige actuellement `activities.read/manage` même pour un compte qui possède seulement `attendance.read/manage`; l'écran de présence dépend du chargement des activités. Décider si les deux scopes doivent être attribués ensemble ou si une vue Présences autonome doit être développée. Aucune élévation de droit n'a été faite.
- Les références de présence saisies librement ne sont pas encore des liens garantis vers un dossier bénéficiaire central.
- Le cache IndexedDB Firestore n'est pas chiffré au niveau applicatif.
- Le formulaire du Club avec e-mail vérifié n'est pas l'inscription universelle sans e-mail de Nour Al-Hidaya.
- Le cahier des charges initial de Nour Al-Hidaya n'est pas encore disponible dans les fichiers consultés; ne pas implémenter le registre universel avant de le confronter à l'architecture proposée.

## À faire par l'utilisateur

1. Transmettre le cahier des charges initial de Nour Al-Hidaya pour arbitrer les champs, les rôles, les structures et les règles de gestion.
2. Installer l'APK debug sur un téléphone Android réel et exécuter la recette `docs/RECETTE-OPERATIONNELLE-LOT7-8.md` avec des comptes et données fictifs.
3. Confirmer la politique d'accès Présences : scope `attendance.read` seul autonome, ou dépendance explicite à `activities.read`.
4. Effectuer les essais de connexion / vérification d'e-mail et de traitement d'une candidature avec des comptes Firebase de test, puis confirmer le comportement observé.

## Je poursuis de mon côté

1. Auditer `projets.html`, les affectations et les transitions lorsqu'un bénévole devient inactif.
2. Auditer la cohérence des requêtes Activités / Présences et des filtres de scopes sans élargir les règles.
3. Vérifier le shell PWA, les ressources Capacitor et les scénarios de synchronisation.
4. Préparer une feuille de recette Lot 8 claire avant toute validation utilisateur.

## Limites d'autorisation

Aucun merge, déploiement Cloudflare/Firebase, changement de règles ou données de production, création de comptes réels ou publication Android n'est autorisé. Les PR #10, #11 et #12 restent inchangées; le Lot 9 Finances reste suspendu jusqu'à validation explicite du Lot 8.
