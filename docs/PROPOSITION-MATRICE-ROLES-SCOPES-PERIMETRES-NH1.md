# Proposition de matrice d'autorisations et de périmètres — Nour Al-Hidaya

**Statut : proposition à valider par l'ONG Wafa Al-Turath.**  
**Date : 22 novembre 2026**  
**Branche :** `feature/nour-central-management-foundation`

Ce document prépare les contrôles serveur NH-1. Il ne crée aucun droit réel, ne modifie aucune règle Firestore et ne présume pas des attributions individuelles. Les rôles institutionnels ne donnent jamais implicitement accès à toutes les données.

## 1. Principes non négociables

1. Refus par défaut : absence de scope, d'affectation valide ou de périmètre explicite = refus.
2. Séparation des capacités : consulter un dossier, créer une demande, examiner une demande, modifier un dossier et consulter des données privées sont des droits distincts.
3. Séparation des personnes et des fonctions : le titre institutionnel ne suffit pas ; les scopes sont attribués explicitement à chaque compte.
4. Périmètre limité : un scope n'est utilisable que dans les sites, mosquées, groupes et programmes attribués à la personne.
5. Données privées : coordonnées, informations de mineurs et pièces justificatives nécessitent un scope privé distinct.
6. Contrôle serveur à chaque requête. Le masquage d'un menu dans WAT Connect n'est pas une mesure d'autorisation.
7. Journalisation des consultations et décisions sensibles ; aucun journal fiable ne doit dépendre du navigateur.

## 2. Catalogue de scopes proposé

| Scope | Capacité envisagée | Limite |
|---|---|---|
| `learning.beneficiaries.read` | Lire les champs non sensibles d'un dossier | Périmètre affecté |
| `learning.beneficiaries.create` | Créer une demande ou un dossier par parcours agent | Périmètre affecté |
| `learning.beneficiaries.update` | Modifier les champs autorisés d'un dossier | Périmètre affecté ; champs privés exclus |
| `learning.beneficiaries.review` | Examiner, accepter, retourner ou refuser une demande | Périmètre affecté ; décision motivée |
| `learning.private.read` | Lire les données personnelles strictement nécessaires | Périmètre affecté ; accès séparé et journalisé |
| `learning.groups.manage` | Gérer les groupes et leurs affectations | Groupes/sites affectés |
| `learning.sessions.manage` | Gérer les séances et présences | Groupes/programmes affectés |
| `learning.results.read` | Lire évaluations et résultats | Groupes/programmes affectés |
| `learning.results.manage` | Saisir ou corriger évaluations et résultats | Groupes/programmes affectés |
| `learning.reports.read` | Consulter les rapports pédagogiques agrégés | Périmètre affecté ; agrégation par défaut |
| `learning.audit.read` | Consulter les traces d'audit | Accès réservé, sans droit de modification |

Aucun scope global de type `learning.admin` n'est proposé à ce stade. Toute extension devra être nommée, justifiée et testée.

## 3. Matrice fonctionnelle proposée (non attribuée)

| Fonction à confirmer | Lecture dossiers | Création | Décision dossiers | Données privées | Groupes/séances | Résultats | Audit |
|---|---:|---:|---:|---:|---:|---:|---:|
| Administration technique WAT | À décider | À décider | À décider | Non par défaut | À décider | À décider | À décider |
| Direction / coordination Nour Al-Hidaya | À décider | À décider | À décider | Non par défaut | À décider | À décider | À décider |
| Responsable de site / mosquée | Périmètre local | Périmètre local | À décider | Non par défaut | Périmètre local | Périmètre local | Non par défaut |
| Formateur | Seulement ses apprenants selon besoin | Non par défaut | Non | Non par défaut | Séances affectées | Saisie limitée à ses groupes | Non |
| Agent d'inscription | Champs nécessaires | Périmètre affecté | Non par défaut | Minimum nécessaire, à décider | Non | Non | Non |
| Secrétariat / accueil | À décider | À décider | Non par défaut | Non par défaut | Non | Non | Non |
| Commissaire aux comptes | Rapports et traces validés | Non | Non | Non | Non | Agrégé par défaut | Lecture seule à définir |
| Bénévole / apprenant | Aucun accès au registre interne | Aucun accès administratif | Aucun | Aucun | Aucun | Seulement ses propres résultats si parcours prévu | Aucun |

Cette matrice n'est pas une attribution de droits. Les cases « à décider » doivent être arbitrées par WAT avant la création des comptes ou l'activation de scopes.

## 4. Modèle de périmètre proposé

Conserver `staffAccess/{uid}` comme registre d'identité d'accès et ajouter un document serveur dédié :

`learningStaffAssignments/{uid}`

Structure logique proposée (exemple fictif, non écrit dans Firestore) :

```json
{
  "active": true,
  "assignments": [
    {
      "assignmentId": "opaque-assignment-id",
      "siteIds": ["site-id"],
      "mosqueIds": ["mosque-id"],
      "groupIds": ["group-id"],
      "programIds": ["program-id"],
      "scopeGrants": [
        "learning.beneficiaries.read",
        "learning.sessions.manage"
      ],
      "validFrom": "timestamp",
      "validUntil": null
    }
  ],
  "updatedAt": "timestamp",
  "updatedBy": "trusted-admin-uid"
}
```

Règles de validation à implémenter après approbation :
- document absent, inactif, expiré ou mal formé : refus ;
- scope demandé absent de `staffAccess.scopes` **ou** de l'affectation correspondante : refus ;
- ressource sans identifiant de périmètre fiable : refus pour les opérations limitées ;
- chaque identifiant de site/mosquée/groupe/programme doit être vérifié côté serveur contre la ressource demandée et la hiérarchie officielle ;
- aucun joker implicite, aucune valeur vide interprétée comme « tous les sites » ;
- accès transversal/global uniquement si WAT l'approuve explicitement et le matérialise par une attribution distincte, traçable et révocable ;
- accès privé contrôlé séparément, même si l'agent peut lire le dossier non sensible.

Le document par UID est une proposition simple à charger sans requête de liste. Le choix final doit tenir compte du nombre maximal d'affectations, de la taille du document Firestore et du besoin d'historiser les changements. Si le volume devient important, utiliser des documents d'affectation distincts et un index serveur adapté.

## 5. Contrat de contrôle serveur

Avant d'autoriser une opération, le service doit vérifier dans cet ordre :

1. Jeton Firebase valide et adresse vérifiée.
2. `staffAccess/{uid}` présent, actif et non suspendu.
3. Scope exact demandé présent dans le registre d'accès.
4. Affectation active et non expirée pour ce scope.
5. Ressource ciblée rattachée au périmètre de cette affectation.
6. Pour les champs privés : scope privé distinct et justification/contexte journalisé.
7. Pour une décision : statut courant autorisant la transition, motif et identifiant de l'auteur.
8. Journal d'audit écrit côté serveur avant de confirmer l'opération sensible.

Les réponses ne doivent pas révéler l'existence d'un dossier situé hors du périmètre de l'agent.

## 6. Tests obligatoires avant raccordement des routes

- Agent actif avec scope et affectation concordants : autorisé.
- Agent actif avec scope absent : refus.
- Agent avec scope mais sans affectation : refus.
- Affectation inactive ou expirée : refus.
- Agent du site A tentant de lire ou modifier une ressource du site B : refus.
- Agent d'une mosquée tentant d'accéder à un autre groupe non affecté : refus.
- Agent avec lecture dossier mais sans `learning.private.read` : champs privés inaccessibles.
- Agent avec droit privé mais hors périmètre : refus.
- Compte suspendu, jeton non vérifié ou registre indisponible : refus.
- Tentative de fournir un périmètre dans le corps HTTP pour s'accorder soi-même des droits : ignorée ou rejetée ; les droits viennent du registre serveur.
- Journal d'audit non disponible lors d'une opération qui l'exige : échec fermé.

## 7. Dépendances avec la gestion des comptes d'équipe

La PR #21 (`security/staff-account-provisioning`) est ouverte en brouillon et non fusionnée. Sa description annonce un provisionnement de rôles et scopes, mais elle ne prouve pas que le schéma d'affectations Nour Al-Hidaya ci-dessus est déjà pris en charge.

Avant tout raccordement :
- comparer les rôles/scopes autorisés par le provisionnement de la PR #21 avec le catalogue ci-dessus ;
- empêcher le formulaire de compte d'attribuer un scope NH non reconnu ;
- ajouter une interface d'affectation de périmètre réservée à un administrateur de confiance ;
- s'assurer que les affectations sont révocables et historisées ;
- ne pas fusionner automatiquement les PR #21 et #22.

## 8. Décisions attendues de WAT

1. Valider les fonctions institutionnelles qui auront effectivement besoin du module.
2. Valider, ligne par ligne, les capacités autorisées pour chaque fonction.
3. Définir les niveaux de périmètre réellement utilisés : national, départemental, site, mosquée, groupe, programme.
4. Décider qui peut attribuer et révoquer les scopes et affectations.
5. Définir les catégories exactes de données privées et les motifs légitimes de consultation.

**Conclusion :** ce modèle permet de préparer les tests et l'implémentation sans attribuer prématurément des privilèges. Tant que ces arbitrages ne sont pas approuvés, les routes NH-1 restent non raccordées et les collections restent fermées.
