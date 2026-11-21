# Exigences structurantes — inscription et accès à Nour Al-Hidaya

## Décision produit

Nour Al-Hidaya conserve son ambition de plateforme numérique complète de l'ONG Wafa Al-Turath. Les contraintes d'équipement, de connexion, d'adresse e-mail ou de maîtrise du numérique des bénéficiaires ne doivent jamais réduire les capacités de l'outil ni l'exigence de gestion de l'ONG.

**Principe : adapter le parcours d'accès, jamais affaiblir le système central.**

## Inscription numérique universelle

Toute personne suivie par Nour Al-Hidaya doit pouvoir être enregistrée dans le système central, qu'elle suive les cours en présentiel dans une mosquée ou à distance, et qu'elle dispose ou non d'un smartphone, d'Android ou d'une adresse e-mail.

L'inscription est toujours numérique dans la base centrale. L'absence d'e-mail ne doit pas empêcher la création du dossier.

### Parcours assisté par un agent habilité

1. Un responsable, enseignant ou agent WAT habilité ouvre le formulaire sécurisé depuis le portail web ou l'application.
2. Il enregistre les informations nécessaires du bénéficiaire sur son appareil, y compris pendant une activité de terrain.
3. Le système attribue un identifiant unique de dossier, indépendant de l'e-mail et du numéro de téléphone.
4. Le dossier est synchronisé avec la base centrale dès qu'une connexion est disponible. En cas de coupure, une file locale chiffrée ou protégée et contrôlée conserve les opérations en attente jusqu'à synchronisation.
5. Le bénéficiaire peut ensuite recevoir une carte, un code ou un identifiant permettant à l'équipe de retrouver son dossier.

### Accès personnel facultatif

- Un dossier bénéficiaire n'est pas obligatoirement un compte d'authentification.
- L'e-mail et le téléphone sont des moyens de contact facultatifs, non des identifiants obligatoires.
- Un accès personnel peut être activé plus tard si le bénéficiaire dispose d'un moyen adapté et le souhaite.
- Un compte d'accès ne doit jamais être créé avec une adresse e-mail fictive ou partagée pour contourner les règles d'authentification.
- Un identifiant de dossier ou un code QR ne doit pas, à lui seul, donner accès aux données personnelles.

## Exigences pour les équipes et les opérations

La plateforme doit offrir des formulaires professionnels et complets pour les équipes au siège et sur le terrain. Les agents habilités doivent pouvoir :

- enregistrer et retrouver un bénéficiaire sans e-mail ;
- vérifier les doublons avant création ;
- associer une personne à un programme, une mosquée, un groupe, une session et un parcours pédagogique ;
- mettre à jour le dossier avec traçabilité de l'auteur et de la date ;
- enregistrer les présences, évaluations, progressions, orientations et accompagnements ;
- travailler hors connexion puis synchroniser les opérations sans perte ni duplication ;
- appliquer les droits par rôle et périmètre, avec journalisation des opérations sensibles.

L'inscription numérique assistée est un canal officiel de collecte. Elle ne constitue pas un mode dégradé et ne doit pas être présentée comme une solution secondaire.

## Sécurité et qualité des données

- Les dossiers des bénéficiaires sont privés par défaut.
- Les droits d'accès sont accordés selon la mission de l'agent et le principe du moindre privilège.
- Les données des mineurs et les informations de leurs responsables légaux sont traitées avec des protections adaptées.
- Le système doit conserver les consentements et leur contexte lorsque cela est requis.
- Les identifiants de dossier sont générés de manière unique et non prédictible.
- Les opérations hors connexion doivent être idempotentes ou protégées contre les doublons à la synchronisation.
- La révocation d'un accès doit empêcher les nouvelles consultations en ligne ; les risques liés aux données déjà mises en cache sur un appareil doivent être encadrés par des règles d'utilisation et de verrouillage.

## État technique constaté dans le prototype actuel

Le code existant contient un formulaire d'inscription de démonstration qui crée un bénéficiaire dans un état local de navigateur. Le parcours Firebase réel, lui, attend un compte Auth avec e-mail vérifié et un document `users/{uid}` dont le rôle est `apprenant`. La synchronisation de la progression et de certaines données pédagogiques est rattachée à cet UID.

Ces mécanismes ne constituent donc pas encore une inscription centrale universelle sans e-mail. Il faudra distinguer explicitement :

1. le dossier bénéficiaire central ;
2. le compte d'authentification facultatif ;
3. le profil pédagogique et les inscriptions aux programmes ;
4. les identifiants et moyens de contact ;
5. les droits des agents et des responsables.

Cette évolution doit être conçue avec les spécifications initiales du projet et les contraintes Firebase/Firestore, puis testée par des scénarios sans e-mail, sans smartphone personnel, hors connexion, multi-agent et multi-mosquée.

## Portée de cette exigence

Ce document formalise une orientation produit. Il ne prétend pas que les fonctions décrites sont déjà opérationnelles. Le cahier des charges initial transmis par l'ONG servira à préciser les champs, les rôles, les processus et les règles de gestion avant implémentation.
