# Audit des autorisations WAT Connect — prérequis NH-1

Date : 22 novembre 2026  
Référence : branche `feature/nour-central-management-foundation`, règles Firestore héritées de `fix/lot8-club-onboarding-and-access`.  
Portée : inspection statique des fichiers du dépôt, sans lecture de données réelles ni modification des règles distantes.

## 1. État vérifié des règles Firestore existantes

Le fichier `firestore.rules` existant contient un registre `staffAccess/{uid}` :
- un membre connecté peut lire uniquement son propre document (`get`) ;
- la lecture en liste est refusée ;
- création, modification et suppression depuis les clients sont refusées ;
- le serveur doit donc provisionner les accès par un mécanisme de confiance.

Les règles définissent les champs de contrôle `active`, `role` et `scopes`. L'accès aux collections existantes s'appuie sur les scopes exacts suivants :
- `programs.read`, `programs.manage`
- `activities.read`, `activities.manage`
- `attendance.read`, `attendance.manage`
- `members.read`, `members.manage`
- `projects.read`, `projects.manage`
- `volunteers.read`, `volunteers.manage`

Aucun scope `learning.*` n'est actuellement déclaré dans les règles Firestore héritées. Les collections NH-1 ne disposent d'aucune règle métier dédiée et restent couvertes par le refus global final. C'est le comportement sûr à conserver tant que les règles NH-1 ne sont pas conçues et testées.

## 2. État vérifié du portail

Le portail WAT Connect charge le document `staffAccess/{uid}` après authentification, puis utilise `active`, `role` et `scopes` pour afficher les modules institutionnels.

Le raccourci Nour Al-Hidaya était auparavant affiché à tout compte d'équipe actif, sans vérifier de scope pédagogique. Il est maintenant masqué sauf si le document d'accès contient au moins un scope commençant par `learning.`. Ce filtrage est uniquement une règle de navigation côté interface ; il ne constitue jamais une autorisation d'accès aux données ou à l'API.

## 3. État de l'autorisation serveur NH-1

Le helper `authorizeStaffScope()` :
- vérifie le Firebase ID token côté serveur ;
- exige une adresse e-mail vérifiée ;
- relit `staffAccess/{uid}` depuis Firestore ;
- exige `active == true` et le scope exact demandé ;
- échoue fermé si le registre est indisponible.

Il ne vérifie pas encore de périmètre organisationnel (site, mosquée, groupe, programme) et ne doit donc pas encore être utilisé pour exposer des listes ou dossiers réels à des agents multi-sites.

## 4. Écarts bloquants avant raccordement des routes

1. **Provisionnement des scopes NH** : aucun scope `learning.*` n'est encore attribué par un flux d'administration livré sur cette branche.
2. **Périmètres** : les règles actuelles et le helper isolé ne définissent pas encore une politique vérifiable de limitation par site, mosquée, groupe ou programme.
3. **Données privées** : il faut une séparation explicite entre lecture du dossier général et lecture des coordonnées/données de mineurs.
4. **Matrice des rôles** : les rôles visibles dans le portail (présidence, administration système, responsables, formateurs, agents, commissaire aux comptes, bureau) doivent être associés explicitement aux scopes et périmètres approuvés par l'ONG ; aucun rôle ne doit hériter implicitement de tous les droits.
5. **Tests de règles** : les règles NH-1 devront être testées avec accès autorisé et refusé, y compris les tentatives inter-sites et les comptes désactivés.

## 5. Décision de sécurité

Ne pas raccorder les routes de lecture ou d'écriture NH-1 et ne pas créer de dossiers réels tant que ces écarts ne sont pas résolus. Ne pas ouvrir Firestore aux clients pour accélérer le développement. Les prochaines implémentations doivent rester sur données fictives et tests automatisés.

Aucune règle Firestore distante, aucun compte, aucun scope réel et aucune donnée bénéficiaire n'a été modifié par cet audit.


## 6. Préparation du modèle de périmètre

Une proposition distincte est maintenant disponible dans `docs/PROPOSITION-MATRICE-ROLES-SCOPES-PERIMETRES-NH1.md`. Elle décrit le catalogue de scopes, une matrice fonctionnelle non attribuée, le schéma logique proposé pour `learningStaffAssignments/{uid}`, les contrôles serveur et les tests inter-sites. Il s'agit d'une proposition à arbitrer par WAT, pas d'une configuration active. Aucun droit n'a été accordé et le helper serveur n'a pas encore été modifié.
