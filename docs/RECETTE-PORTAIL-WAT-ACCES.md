# Accès au portail WAT Connect

Ce lot couvre les planches Connexion et Mobile décrites dans la PR de coordination #31. Il reprend trois changements de la PR #26 sur la base de la PR #30. Le lien d’évitement déplace le focus vers le contenu principal. Le navigateur et la PWA utilisent le bleu profond WAT sur le portail et l’espace Club. L’identité PWA Nour conserve sa propre couleur.

Le formulaire relie son message d’état à la zone de connexion. Un refus générique conserve les champs et laisse le membre réessayer. Les candidats rejoignent la fiche Club dans les programmes, qui garde un seul lien de candidature. La connexion fournit aussi un lien vers Nour pour les apprenants.

## Vérifications

- 121 tests Node hors émulateur réussis. Bundle Capacitor généré avec Firebase staging.
- Chrome à 320, 360 et 768 px. Activation du lien d’évitement au clavier, navigation vers la connexion, absence de débordement, refus simulé avec conservation de la saisie, accès à la fiche Club et présence d’un seul lien de candidature.
- La recette authentifiée du membre et du candidat reste à exécuter avec des profils vérifiés de `wat-connect-staging`. Ce lot ne modifie ni les habilitations ni le modèle de données.
