# Agenda et rappels WAT — procédure et recette
24 novembre 2026 · Brouillon fonctionnel · Secrétariat et responsables d’activité

S’appuie sur ARCHITECTURE-NOTIFICATIONS-UNIFIEES.md. État vérifié dans le code de #42 : aucun agenda institutionnel opérationnel ni émission de rappels dans ce lot. La procédure ci-dessous prépare une recette sur données fictives.

## Cycle d’une réunion ou activité
1. Le Secrétariat prépare un événement référencé. Champs : objet, organisateur, date et heure de début/fin, fuseau (Africa/Porto-Novo), audience habilitée, lieu ou lien, état et référence de convocation.
2. Après visa de l’organisateur habilité, publier l’événement puis rendre disponible l’ajout au calendrier individuel. Séparer la convocation officielle et le rappel facultatif.
3. En cas de report ou d’annulation, conserver la référence et incrémenter la révision. Une importation manuelle doit indiquer à l’utilisateur comment retirer l’ancienne occurrence si son calendrier ne la rapproche pas.
4. Le rappel n’est programmé que pour les profils encore autorisés et ayant choisi le canal. Réévaluer ces conditions à l’envoi. Les notifications visibles sur écran verrouillé utilisent un libellé générique, sans coordonnées de bénéficiaire ni détail confidentiel.
5. Après la réunion, associer le PV ou le compte rendu selon les droits de consultation et inscrire les décisions au registre.

## Cas de recette

| Cas | Données fictives | Preuve attendue |
|---|---|---|
| Fuseau | 10 h à Porto-Novo, relecture en UTC | L’agenda montre la même échéance absolue, 09 h UTC |
| Mise à jour | Réunion décalée de 30 min | Même référence d’événement, nouvelle révision, aucun rappel de l’ancienne heure |
| Annulation | Réunion annulée avant le rappel | Annulation visible, rappel supprimé, motif consultable par le rôle habilité |
| Droits | Un membre invité et un compte extérieur | Événement visible pour l’invité, contenu privé inaccessible à l’autre compte |
| Consentement | Révoquer le canal après programmation | Aucun envoi sur le canal révoqué |
| Réexécution | Rejouer deux fois le même traitement | Un seul rappel pour une référence, une révision, un destinataire et un canal |
| Hors connexion | Appareil hors ligne au moment du rappel | Événement consultable par les mécanismes autorisés et état du rappel distinct d’une preuve de remise |
| Android | Importer une invitation générique sur le téléphone de recette | Heure, durée et référence correctes ; aucun détail confidentiel exporté |

Premier lot code envisageable : modèle d’événement et export iCalendar local pour les événements habilités, avec données fictives. L’activation des envois nécessite un environnement staging configuré, des appareils et comptes de recette autorisés et la vérification des limites du service. Aucun envoi ni dépense fait dans ce lot.
