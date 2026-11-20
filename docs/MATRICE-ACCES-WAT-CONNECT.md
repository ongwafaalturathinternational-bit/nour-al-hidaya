# Matrice de référence des rôles et périmètres WAT Connect

## Principe

Le rôle décrit la fonction institutionnelle de la personne. Le tableau `scopes` du document `staffAccess/{uid}` définit les opérations réellement autorisées. Un rôle ne confère jamais automatiquement un accès aux données. Les règles Firestore vérifient les périmètres à chaque requête.

## Rôles institutionnels

- `president` : présidence et direction de l’ONG.
- `administrateur_systeme` : administration technique et gestion des accès par un processus de confiance.
- `responsable_administratif` : administration, membres, bénévoles, réunions et archives.
- `responsable_financier` : gestion financière et justificatifs.
- `responsable_programme` : référentiels, activités et rapports de programmes.
- `coordonnateur` : coordination opérationnelle des activités autorisées.
- `formateur` : sessions et suivi pédagogique attribués.
- `agent` : opérations terrain strictement affectées.
- `commissaire_aux_comptes` : consultation des pièces et rapports nécessaires au contrôle, sans écriture.
- `bureau` : accès aux documents de gouvernance explicitement partagés.

## Périmètres déjà définis

| Domaine | Consultation | Gestion |
|---|---|---|
| Annuaire | `members.read` | `members.manage` |
| Programmes | `programs.read` | `programs.manage` |
| Activités | `activities.read` | `activities.manage` |
| Projets | `projects.read` | `projects.manage` |
| Club Khuddam Al-Turath | `volunteers.read` | `volunteers.manage` |
| Présences | `attendance.read` | `attendance.manage` |

## Périmètres futurs à implémenter

| Domaine | Consultation | Gestion |
|---|---|---|
| Finances | `finance.read` | `finance.manage` |
| Bénéficiaires / action sociale | `beneficiaries.read` | `beneficiaries.manage` |
| Affectations bénévoles aux projets | `projects.read` ou `projects.manage` **et** `volunteers.read` ou `volunteers.manage` | `projects.manage` **et** `volunteers.read` ou `volunteers.manage` |
| Pédagogie | `learning.read` | `learning.manage` |
| Documents | `documents.read` | `documents.manage` |
| Audit | `audit.read` | réservé à un mécanisme de journalisation en lecture |

Ces périmètres futurs sont une nomenclature de conception et ne donnent aucun accès tant que les règles et tests correspondants ne sont pas livrés.

**Règle déjà implémentée pour les affectations de projets :** les documents d'affectation contiennent le nom du bénévole. La consultation exige donc un périmètre projet et un périmètre Club. La création et la mise à jour exigent en plus `projects.manage`. Aucun de ces droits croisés ne doit être remplacé par le seul périmètre projet.

## Attribution prudente

1. Vérifier l’identité et l’adresse e-mail du membre de l’équipe.
2. Créer son compte Firebase Authentication.
3. Créer manuellement son document `staffAccess/{uid}` depuis une console de confiance.
4. Renseigner un rôle exact, `active: true` et uniquement les scopes nécessaires à sa mission.
5. Tester l’accès avec un compte de test avant de transmettre les identifiants.
6. Mettre `active: false` pour suspendre l’accès ; ne pas supprimer les données métier.

Aucun formulaire public ou utilisateur connecté ne peut s’attribuer un rôle ou un scope. L’automatisation de l’attribution attendra un service serveur sécurisé qui respecte le budget gratuit ; aucune fonction nécessitant un passage à une facturation payante ne sera activée sans décision explicite.
