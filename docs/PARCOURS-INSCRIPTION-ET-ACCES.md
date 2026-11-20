# Parcours d'inscription et d'accès — WAT Connect

**Statut :** spécification opérationnelle et correction du parcours candidat.  
**Périmètre :** Club Khuddam Al-Turath, portail WAT Connect et comptes de l'équipe.

## 1. Trois identités à ne pas confondre

1. **Compte Firebase** : identifiant et mot de passe personnels; l'adresse e-mail doit être vérifiée.
2. **Candidature au Club** : dossier personnel créé par le candidat dans `volunteerApplications/{uid}`; il peut consulter uniquement son propre dossier.
3. **Fiche bénévole active** : créée par une transaction exécutée par un responsable habilité après acceptation. Elle ne donne pas à elle seule des droits d'administration.

La vérification du courriel ne vaut ni acceptation de la candidature, ni attribution d'un rôle interne.

## 2. Parcours candidat corrigé

1. Le candidat ouvre `club-khuddam-inscription.html`, crée son compte ou se connecte.
2. Il vérifie son adresse depuis le lien reçu par e-mail.
3. Il revient sur le formulaire et utilise « J'ai vérifié mon adresse e-mail » si l'état n'a pas été actualisé automatiquement.
4. Il complète et envoie sa candidature; le document est créé sous son UID.
5. En cas de dossier existant, le formulaire affiche le lien vers `club-khuddam-espace.html`, au lieu de laisser le candidat sans indication.
6. Depuis l'espace candidat, il se connecte et consulte son statut : en attente, acceptée ou refusée.
7. Seul un responsable doté de `volunteers.manage` peut accepter/refuser. Une acceptation crée la fiche bénévole; le candidat ne peut ni s'approuver ni modifier son dossier.
8. Le candidat accepté reçoit les instructions de prise de contact et d'intégration. L'espace candidat n'est pas le registre interne du Club.

Le candidat peut aussi ouvrir « Suivre ma candidature au Club » depuis la page d'accueil.

## 3. Accès des membres de l'administration

Il n'existe volontairement aucun formulaire public « devenir administrateur ». Un tel formulaire permettrait à n'importe qui de demander ou de s'attribuer des droits institutionnels.

**Procédure provisoire sécurisée :**
1. La Présidence confirme l'identité, la fonction et la décision de nomination/délégation.
2. Un administrateur de confiance crée le compte Firebase Authentication avec l'adresse exacte du membre.
3. Le membre vérifie son adresse et communique son UID à l'administrateur par un canal sûr.
4. L'administrateur crée `staffAccess/{uid}` dans la console Firebase avec le nom, l'adresse, le rôle, `active: true` et uniquement les scopes approuvés.
5. Le membre se connecte depuis la page d'accueil WAT Connect. Le portail lit son document d'accès et n'affiche que les modules autorisés.
6. L'administrateur teste l'accès positif et négatif. Pour suspendre l'accès, il passe `active` à `false`; il ne supprime pas l'historique.

Les règles Firestore interdisent au titulaire de créer ou modifier son propre document `staffAccess`. Le rôle seul ne confère aucun droit : les scopes sont contrôlés dans les règles de sécurité.

### Procédure technique détaillée — provisionnement manuel

Cette procédure est réservée à la personne de confiance qui administre le projet Firebase. Elle n'est pas un formulaire public.

1. Ouvrir Firebase Console et sélectionner le projet **wat-connect**.
2. Aller dans **Authentication → Users → Add user**; saisir l'adresse personnelle/institutionnelle validée et un mot de passe temporaire robuste. Ne jamais envoyer ce mot de passe dans un groupe WhatsApp.
3. Transmettre au membre la procédure de connexion et de vérification de son adresse. Le membre choisit un mot de passe personnel après la première connexion si le mécanisme de réinitialisation est utilisé.
4. Dans la liste Authentication, copier l'UID exact du compte créé.
5. Ouvrir **Firestore Database → Data → staffAccess → Add document**. L'identifiant du document doit être exactement cet UID.
6. Ajouter les champs suivants (types Firestore indiqués) :

| Champ | Type | Valeur |
|---|---|---|
| `displayName` | string | Nom institutionnel validé |
| `email` | string | Adresse du compte Authentication |
| `role` | string | Un rôle exact de la matrice |
| `active` | boolean | `true` après décision de nomination |
| `scopes` | array | Uniquement les périmètres nécessaires |
| `createdAt` | timestamp | Date de création |
| `updatedAt` | timestamp | Date de modification |

7. Faire connecter le membre à la page d'accueil WAT Connect. Il doit avoir vérifié son adresse e-mail.
8. Contrôler avec ce compte que les modules autorisés apparaissent et que les accès non autorisés restent refusés.
9. Pour suspendre le compte, modifier `active` à `false`; conserver le document pour la traçabilité.

**Périmètres actuellement implémentés :** `members.read`, `members.manage`, `programs.read`, `programs.manage`, `activities.read`, `activities.manage`, `projects.read`, `projects.manage`, `volunteers.read`, `volunteers.manage`, `attendance.read`, `attendance.manage`. Les périmètres `documents.*`, `meetings.*`, `finance.*` et `audit.*` ne doivent pas être attribués comme s'ils étaient déjà opérationnels.

Exemple de forme de données (valeurs fictives à remplacer, ne pas coller telle quelle) :

```json
{
  "displayName": "Nom du membre",
  "email": "membre@exemple.org",
  "role": "responsable_administratif",
  "active": true,
  "scopes": ["members.read", "members.manage"],
  "createdAt": "timestamp Firestore",
  "updatedAt": "timestamp Firestore"
}
```

La création du compte Authentication et du document Firestore sont deux opérations distinctes. Si le document utilise un UID différent, si le courriel n'est pas vérifié ou si aucun scope opérationnel n'est attribué, l'accès ne fonctionnera pas.


**Évolution prévue :** écran d'invitation administrateur et gestion des affectations, uniquement après mise en place d'un service serveur de confiance (jetons à usage limité, expiration, journal d'audit, révocation et contrôles de rôle). Aucun secret Firebase Admin ne doit être placé dans le navigateur.

## 4. Site institutionnel public et portail privé

Le dépôt contient une page d'accueil publique `index.html`, qui présente l'ONG et les programmes, ainsi que l'espace privé WAT Connect. Ce n'est pas encore un site institutionnel complet avec CMS, actualités administrables, publications et gestion de contenus.

Le site public et le portail privé doivent être présentés comme deux espaces distincts, avec navigation explicite. Avant d'annoncer une adresse publique, vérifier que le Worker sert bien `index.html` à la racine et que les liens de navigation fonctionnent sur le domaine retenu.

## 5. Données personnelles et sécurité

- Le candidat lit uniquement `volunteerApplications/{son UID}`; il ne peut pas lister les candidatures.
- Les responsables ont les accès de consultation/traitement selon `volunteers.read` et `volunteers.manage`.
- Le candidat ne peut pas écrire dans `volunteers` ni `staffAccess`.
- Les pages publiques ne doivent pas exposer les coordonnées ni les dossiers de candidature.
- Les tests doivent couvrir les utilisateurs non vérifiés, candidats, candidats acceptés/refusés, membres sans scope, lecteurs et gestionnaires.
- Les erreurs réseau, les liens expirés et les mots de passe oubliés doivent afficher des instructions explicites sans divulguer l'existence d'une adresse e-mail à un tiers.

## 6. Limites de la livraison

La page d'espace candidat permet le suivi de son propre dossier; elle n'ouvre pas le registre privé ni un tableau de bord de missions bénévoles. Le véritable espace opérationnel du bénévole (missions qui lui sont affectées, convocations, disponibilités, présences qui le concernent) est un chantier distinct.

Les invitations d'équipe restent manuelles et réservées à l'administrateur Firebase de confiance jusqu'à livraison d'un backend sécurisé. Aucun compte, rôle ou scope n'est attribué automatiquement par ce parcours.
