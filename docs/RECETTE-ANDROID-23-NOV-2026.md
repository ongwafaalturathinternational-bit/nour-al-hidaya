# Retour de recette Android — 23 novembre 2026

## Résultats rapportés sur appareil réel

- Installation APK réussie, mais icône WAT Connect absente du lanceur.
- Ouverture générale et navigation des rubriques fonctionnelles.
- Depuis Nour Al-Hidaya, le retour vers le portail WAT Connect ne fonctionne pas.
- L'espace membre WAT Connect refuse deux combinaisons e-mail/mot de passe; le champ mot de passe est vidé après la tentative et aucun message n'a été remarqué.
- Les formulaires d'inscription permettent la saisie.
- Les vues profil et accès sont jugées incohérentes; logo et icône absents; interface trop chargée.
- Mode hors connexion accessible et reprise normale après reconnexion.
- Le choix de la langue arabe entraîne un écran blanc persistant dans Nour Al-Hidaya.

## Corrections engagées dans la branche de suivi

- Ajout d'un garde-fou de rendu dans Nour Al-Hidaya : en cas d'erreur JavaScript, proposer une récupération en français et un retour explicite à WAT Connect.
- Lien de retour du programme rendu explicite vers `./index.html#connexion`.
- Le formulaire WAT Connect conserve le mot de passe après une authentification refusée et ne l'efface qu'après authentification acceptée.
- Ajout du logo dans l'en-tête WAT Connect à partir de l'icône existante.
- Ajout de la génération des ressources d'icône natives Android à partir de `icon-512.png`.

## Diagnostic important sur la connexion

Le portail n'accepte pas une adresse e-mail simplement saisie dans le formulaire. Le compte doit exister dans Firebase staging, avoir une adresse vérifiée et disposer d'un accès WAT actif (ou d'un profil apprenant/candidat correspondant). Les identifiants de test arbitraires ne créent pas de compte. La disparition du mot de passe après une tentative était provoquée par le code du formulaire; le correctif le conserve désormais si la connexion échoue.

## Limites et sécurité

- Le test Android a confirmé le mode hors connexion, mais ne constitue pas une validation de synchronisation complète.
- Aucun compte Firebase, mot de passe, profil réel, règle distante ou donnée de membre n'a été modifié.
- Aucun déploiement ni fusion n'a été effectué.
- Le garde-fou d'écran blanc améliore la récupération, mais la cause précise du défaut RTL/arabe doit encore être identifiée par une reproduction avec console WebView avant validation finale.
