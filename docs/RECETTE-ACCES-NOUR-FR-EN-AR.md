# Recette de l’accès Nour Al-Hidaya

Ce lot part de `6283af3` sur la branche de la PR #30. Il ajoute les traductions des écrans de connexion et d’inscription, des annonces de validation et du retour au portail. Les champs e-mail conservent le sens gauche-droite et les libellés restent au-dessus des champs. Une tentative refusée ou une demande de réinitialisation conserve le formulaire.

L’écran du règlement et la déconnexion renvoient également à la section connexion de WAT. La navigation principale reprend le libellé accessible et l’indication de page active du commit `3796ef1` de la PR #27.

## Résultats locaux

- 121 tests Node hors émulateur réussis et préparation Capacitor avec l’environnement `wat-connect-staging`.
- Chrome en émulation Pixel 7. Ouverture de Nour depuis WAT, sélection de l’anglais et de l’arabe, formulaire d’inscription, annonce de validation, refus simulé sans perte de saisie, persistance de la langue, retour tactile à WAT et réouverture du portail hors réseau.
- Données fictives et appels externes bloqués pendant le test navigateur. Le refus est simulé dans le navigateur.

## Recette restante

Sur un appareil Android, vérifier le bouton Retour système depuis les écrans de connexion, de règlement et de programme. Avec des comptes vérifiés de `wat-connect-staging`, tester la connexion, l’e-mail de réinitialisation, le candidat Club Khuddam et la synchronisation des données pédagogiques après coupure réseau.

Pour le prochain lot, comparer la branche `feature/wat-portal-theme-consistency` avec la PR #30 avant toute reprise de styles. Le PDF institutionnel et le cahier pédagogique 2.2 restent nécessaires pour valider les maquettes et les contenus correspondants avec Work.
