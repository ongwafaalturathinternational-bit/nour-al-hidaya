# WAT Connect — Architecture générale et plan de réalisation

**Organisation :** ONG Wafa Al-Turath (ONG WAT)  
**Produit :** WAT Connect  
**Programme pilote :** Nour Al-Hidaya  
**Statut :** document de conception — ne constitue pas une mise en production.

## 1. Vision

WAT Connect est le système numérique central de l'ONG. Il doit réunir, dans un environnement cohérent, les opérations administratives, humaines, pédagogiques, sociales, financières et opérationnelles. Le site institutionnel public et les espaces privés de gestion partagent l'identité visuelle, les référentiels et, lorsque cela est approprié, les services communs.

L'objectif est d'éviter la multiplication d'outils isolés, les doubles saisies et la perte d'informations, tout en gardant des accès strictement adaptés aux fonctions de chacun.

## 2. Principes non négociables

1. **Sécurité par défaut :** aucune donnée privée n'est accessible sans règle explicite.
2. **Moindre privilège :** chaque rôle n'accède qu'aux fonctions et dossiers nécessaires.
3. **Séparation des données :** les données personnelles des apprenants, bénéficiaires, membres et employés ne sont pas publiques.
4. **Traçabilité :** les opérations sensibles (finances, accès, validations, modifications importantes) doivent être journalisées.
5. **Hors connexion :** les formulaires de terrain peuvent fonctionner temporairement hors ligne, avec file d'attente, statut de synchronisation et résolution des conflits.
6. **Pas de perte silencieuse :** toute donnée en attente de synchronisation doit être visible et récupérable.
7. **Coût maîtrisé :** privilégier les offres gratuites et les services déjà disponibles. Aucun service payant ne doit être activé sans décision explicite de WAT.
8. **Déploiement prudent :** branches et prévisualisations pour les tests; aucune fusion ou publication en production sans validation expresse.
9. **Données minimales :** ne collecter que les informations nécessaires à la mission et définir des durées de conservation.
10. **Accessibilité :** interface adaptée aux téléphones modestes, connexions lentes et utilisateurs peu familiarisés avec le numérique.

## 3. Architecture fonctionnelle cible

### A. Portail institutionnel public
- Présentation de l'ONG, vision, mission, gouvernance et transparence.
- Programmes, projets, activités, actualités et rapports publiables.
- Pages partenaires, soutien, dons et contact.
- Formulaires publics d'intérêt : bénévolat, adhésion, partenariat et demande d'information.
- Accès clairement séparé vers WAT Connect.

### B. Espace privé WAT Connect
- Tableau de bord adapté au rôle.
- Annuaire et gestion des membres, bénévoles et personnel.
- Gouvernance : organes, mandats, réunions, décisions et procès-verbaux.
- Programmes, projets, activités, planification et rapports.
- Bénéficiaires, demandes, critères, décisions et historique des aides.
- Finances : budgets, recettes, dépenses, dons, pièces justificatives et rapports.
- Logistique : stocks, équipements, affectations et mouvements.
- Documents : modèles, courriers, conventions, archives et accès contrôlés.
- Indicateurs transversaux et exports autorisés.

### C. Applications/programmes métier
Nour Al-Hidaya est le premier programme pilote. Les futurs programmes utilisent les mêmes comptes, référentiels et composants communs, sans être forcés dans un écran unique.

## 4. Rôles et autorisations — modèle cible

Les rôles ci-dessous sont des profils fonctionnels. Leur attribution doit être faite par une personne habilitée, jamais par l'utilisateur lui-même.

| Rôle | Périmètre indicatif |
|---|---|
| Administrateur système | Configuration technique et gestion des accès; accès aux données limité au besoin opérationnel |
| Président / Direction exécutive | Vue générale, arbitrages et validations institutionnelles |
| Responsable administratif | Membres, personnel, gouvernance, courriers et archives autorisés |
| Responsable financier | Budgets, écritures, justificatifs et rapports financiers |
| Responsable de programme | Dossiers et indicateurs de son programme |
| Coordonnateur | Planification et suivi opérationnel selon délégation |
| Formateur / Agent terrain | Saisie limitée aux activités et bénéficiaires affectés |
| Bénévole | Missions et informations strictement nécessaires |
| Apprenant / Bénéficiaire | Son propre dossier et ses propres démarches autorisées |
| Commissaire aux comptes | Consultation contrôlée des pièces et rapports nécessaires à sa mission |

Les permissions seront aussi limitées par programme, projet, site ou dossier lorsque nécessaire. Un rôle ne doit pas donner automatiquement accès à toutes les données de l'ONG.

## 5. Modèle de données logique

Les collections ci-dessous sont une cible logique, pas une instruction de créer immédiatement toutes les collections.

- `users/{uid}` : profil utilisateur minimal et préférences.
- `staffAccess/{uid}` : rôle(s), périmètre(s), état du compte et délégations. Écriture réservée à un processus d'administration de confiance; jamais modifiable par le titulaire.
- `members/{memberId}` : adhésion et informations institutionnelles.
- `volunteers/{volunteerId}` : disponibilité, compétences et missions.
- `programs/{programId}` et `projects/{projectId}` : programmes et projets.
- `beneficiaries/{beneficiaryId}` : dossier social avec accès très restreint.
- `activities/{activityId}`, `sessions/{sessionId}`, `attendance/{recordId}` : activités, séances et présences.
- `learning/{recordId}` : éléments pédagogiques; les notes personnelles d'un apprenant restent privées.
- `financeEntries/{entryId}`, `budgets/{budgetId}`, `funding/{fundingId}` : données financières, avec séparation des droits de lecture et de validation.
- `inventory/{itemId}`, `stockMovements/{movementId}` : biens et mouvements.
- `documents/{documentId}` : métadonnées; fichiers stockés séparément avec règles d'accès.
- `meetings/{meetingId}`, `decisions/{decisionId}` : gouvernance et décisions.
- `auditLogs/{logId}` : journal des opérations sensibles, non modifiable par les utilisateurs ordinaires.
- `notifications/{notificationId}` : notifications ciblées.

Chaque dossier devra prévoir identifiant stable, propriétaire/responsable, statut, dates, provenance, périmètre d'accès et métadonnées de synchronisation lorsque pertinent. Les pièces financières et sociales nécessitent des contrôles spécifiques.

## 6. Sécurité Firebase — état et évolution

### État vérifié au démarrage de ce lot
- Firebase Authentication par e-mail/mot de passe est activé.
- Les règles actuelles autorisent un utilisateur à créer et lire son propre profil apprenant.
- Les résultats de quiz sont isolés par utilisateur dans `users/{uid}/progress`.
- Les notes, pratiques et devoirs écrits sont isolés par utilisateur dans `users/{uid}/learning`.
- Le reste de Firestore est fermé par défaut.
- Les profils d'équipe ne sont pas encore provisionnés comme comptes authentifiés fiables. L'interface contient encore des parcours de démonstration locaux; ils ne constituent pas un système de gestion réel.

### Décision de conception
Avant de synchroniser les présences ou les dossiers partagés, mettre en place un registre d'accès d'équipe non modifiable par les clients. Pour la première phase, les comptes et rôles d'équipe seront provisionnés manuellement par un administrateur de confiance dans la console Firebase, avec une procédure documentée et vérifiable. Les utilisateurs ne pourront jamais s'attribuer un rôle.

Les règles Firestore devront vérifier l'identité authentifiée, l'état actif, le rôle et le périmètre du compte d'équipe. Les validations financières et les opérations d'administration ne devront pas reposer sur une simple condition d'interface.

Ne pas introduire de Cloud Functions, de stockage payant ou de service nécessitant une facturation sans vérifier le coût et obtenir l'accord préalable de WAT.

## 7. Lots de réalisation

### Lot 1 — Socle commun et sécurité
- Architecture des comptes et des rôles.
- Provisionnement sécurisé des comptes d'équipe.
- Référentiels communs et conventions d'identifiants.
- Règles Firestore par domaine et tests de règles.
- Journalisation des opérations sensibles.
- Gestion des erreurs, états hors ligne et synchronisation.
- Préparation du tableau de bord et navigation selon les droits.

### Lot 2 — Nour Al-Hidaya complet
- Comptes apprenants et équipe.
- Inscriptions, groupes, cours et contenus.
- Progression, notes privées, pratiques et devoirs.
- Séances, présences, retards et justificatifs.
- Suivi des formateurs et rapports pédagogiques.
- Vues apprenant, formateur, coordonnateur et direction.

### Lot 3 — Administration et gouvernance
- Membres, bénévoles et personnel.
- Organes, fonctions, mandats et affectations.
- Réunions, décisions, PV et documents.
- Courriers entrants/sortants et archivage.

### Lot 4 — Finances et ressources
- Budgets et lignes budgétaires.
- Recettes, dons, cotisations et financements.
- Dépenses, validations et justificatifs.
- Rapports périodiques et exports.
- Inventaire et mouvements de stock.

### Lot 5 — Action sociale et bénéficiaires
- Dossiers et demandes d'aide.
- Évaluation, critères, décisions et historique.
- Distributions, bourses et accompagnement.
- Protection renforcée des données personnelles.

### Lot 6 — Site web institutionnel
- Site public administrable.
- Pages institutionnelles, programmes, actualités et rapports.
- Formulaires de contact, adhésion et partenariat.
- Liens cohérents avec les espaces privés, sans exposer les données internes.

### Lot 7 — Automatisation et pilotage
- Notifications et rappels.
- Tableaux de bord consolidés.
- Rapports et documents générés.
- Exports, archivage, contrôles et indicateurs.

## 8. Critères de validation de chaque lot

Un lot n'est considéré comme prêt que lorsque :
- les parcours principaux sont testés avec les rôles concernés;
- les accès interdits sont testés et refusés;
- les données restent présentes après déconnexion/reconnexion;
- le comportement hors ligne et la reprise de synchronisation sont vérifiés lorsque prévus;
- les erreurs sont visibles et ne détruisent pas les données en attente;
- les coûts et limites des services utilisés sont documentés;
- une prévisualisation de test est disponible;
- aucun déploiement en production n'a lieu sans accord.

## 9. État des travaux et limites connues

- Nour Al-Hidaya v7 : résultats de quiz, notes, pratiques et devoirs écrits disposent d'une synchronisation Firestore prévue pour les comptes apprenants vérifiés. Le devoir, les notes et pratiques ont été retrouvés lors des tests de navigation privée selon les retours reçus; les notes et pratiques doivent encore faire l'objet d'un test explicite après déconnexion/reconnexion pour confirmer leur persistance.
- Les présences ne sont pas encore synchronisées dans Firestore.
- Les rôles réels d'équipe ne sont pas encore opérationnels.
- Les parcours de démonstration présents dans l'interface ne doivent pas être confondus avec des fonctions administratives sécurisées.
- Le site institutionnel n'est pas encore intégré à ce dépôt comme produit final.
- Les uploads réels de pièces jointes (photos, audio, justificatifs) restent à concevoir avec des règles et un contrôle de coûts adaptés.

## 10. Règle de conduite du projet

Développer par lots cohérents, conserver les versions précédentes, automatiser autant que possible les vérifications, limiter les interventions demandées à la direction de WAT et ne présenter à l'utilisateur que les décisions réellement nécessaires. Les tests doivent être regroupés à la fin de chaque lot.
