# Lot 1 — Socle commun : plan de contrôle et de validation

Ce document accompagne `ARCHITECTURE-WAT-CONNECT.md`. Il définit les vérifications obligatoires avant d'ouvrir les modules administratifs, financiers et sociaux.

## A. Identité et comptes

- [ ] Un apprenant peut créer uniquement son propre compte apprenant.
- [ ] Un utilisateur ne peut pas modifier son propre rôle.
- [ ] Un compte d'équipe est créé uniquement par le processus de provisionnement autorisé.
- [ ] Un compte suspendu ne peut plus accéder aux données métier.
- [ ] Un compte non vérifié ne peut pas utiliser les fonctions qui exigent une adresse vérifiée.
- [ ] La fermeture de session empêche l'accès aux écrans et données privés.

## B. Matrice d'accès

Tester chaque règle avec au minimum : apprenant, formateur, coordonnateur, responsable de programme, responsable administratif, responsable financier, direction et compte sans rôle.

- [ ] Un apprenant ne lit que son propre dossier pédagogique.
- [ ] Un formateur ne lit que les groupes/séances qui lui sont attribués.
- [ ] Un coordonnateur n'accède qu'à son périmètre de coordination.
- [ ] Un responsable financier ne peut pas modifier les rôles d'équipe.
- [ ] Un responsable administratif ne peut pas consulter les pièces sociales confidentielles sans délégation.
- [ ] Un commissaire aux comptes dispose d'un accès de consultation borné, sans droit de modification.
- [ ] Un compte sans rôle et un utilisateur non connecté sont refusés par défaut.

## C. Synchronisation et résilience

- [ ] Saisie en ligne : enregistrement confirmé et visible après rechargement.
- [ ] Saisie hors ligne : élément marqué « en attente », sans faux message de succès serveur.
- [ ] Retour réseau : synchronisation automatique et statut confirmé.
- [ ] Échec de synchronisation : donnée conservée et erreur compréhensible.
- [ ] Reconnexion sur un autre navigateur : seules les données synchronisées réapparaissent.
- [ ] Double soumission : pas de doublon métier.
- [ ] Conflit de modification : règle de résolution documentée et historique conservé pour les données sensibles.

## D. Traçabilité et protection

- [ ] Les changements de rôle, suspensions et réactivations sont tracés.
- [ ] Les validations et corrections financières sont tracées avec auteur et date.
- [ ] Les suppressions de dossiers sensibles sont interdites ou soumises à une procédure d'archivage.
- [ ] Les données personnelles ne figurent pas dans les pages publiques, URL ou journaux techniques.
- [ ] Les exports sont limités aux rôles habilités et leur périmètre est vérifié.

## E. Coûts et exploitation

- [ ] Aucun plan payant n'est activé.
- [ ] Les quotas gratuits Firebase sont identifiés et surveillés.
- [ ] Les fonctions nécessitant une facturation sont exclues tant qu'une décision budgétaire n'a pas été prise.
- [ ] Les règles Firestore sont testées avant tout ajout de collection métier.
- [ ] Les environnements de test et de production sont clairement séparés.

## F. Livrables attendus du Lot 1

1. Registre d'accès d'équipe sécurisé et procédure de provisionnement.
2. Matrice de permissions documentée.
3. Règles Firestore couvrant uniquement les domaines effectivement ouverts.
4. Tests positifs et négatifs des règles.
5. Gestion commune des états en ligne/hors ligne et des erreurs.
6. Journal des opérations sensibles.
7. Prévisualisation testable et compte-rendu de validation.
8. Liste des limites restantes, sans masquer les fonctions simulées.

**Blocage de sécurité :** aucune synchronisation des présences, données financières, dossiers de bénéficiaires ou documents privés partagés ne doit être activée tant que les rôles et les règles correspondantes n'ont pas passé les tests négatifs.
