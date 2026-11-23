# Fiche de recette staging — comptes, Club et déconnexion
Brouillon · Utiliser des profils et dossiers fictifs autorisés. Relever pour chaque essai le SHA, le projet Firebase, la date, le rôle, le navigateur ou l’appareil et le résultat. Masquer les adresses et identifiants dans les captures partagées.

| Parcours | Précondition | Action | Résultat attendu |
|---|---|---|---|
| Club, visiteur | Session absente | Ouvrir la candidature | Message invitant à créer un compte ou se connecter. Aucun dossier affiché. |
| Club, vérification | Compte staging non vérifié | Ouvrir le lien reçu, revenir puis actualiser | Après vérification, le jeton est actualisé. Un compte sans dossier voit le formulaire. |
| Club, dossier existant | Compte vérifié et dossier fictif | Ouvrir la page directement puis accéder au suivi | Un seul dossier, état consultable par son titulaire. Aucune nouvelle candidature proposée. |
| Compte d’équipe | Profils test actif et suspendu, vérifiés | Tester l’accès séparément avec chaque profil | L’actif accède à son seul périmètre. Le profil suspendu reste exclu de l’espace interne. |
| Déconnexion | Deux onglets staging, écritures de test | Fermer la session, ouvrir un autre compte | Après traitement des écritures et purge effective, aucune donnée du compte précédent n’apparaît. |
| Nour, reprise | Deux onglets d’un navigateur compatible Web Locks | Reconnecter les deux après une saisie hors connexion | Écriture confirmée côté serveur, file vidée pour l’entrée confirmée, saisie suivante préservée. |

Dépendances : #21 pour le provisionnement de test, #20 puis #40 pour la candidature, #30 puis #39 pour la purge, #37 puis #38 pour la file Nour. Les branches restent distinctes tant qu’aucune version de recette commune n’a été approuvée. Tester chaque changement sur son SHA lorsque le staging le permet et noter les limites de combinaison. La CI #38 est réussie pour Firestore et APK, la recette réelle multi-onglets reste à effectuer.

**Compte rendu.** [Scénario] · [SHA] · [Réussi / Échec / Bloqué] · [preuve anonymisée] · [anomalie et suite].