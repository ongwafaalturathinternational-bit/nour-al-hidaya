# WAT Connect et Nour Al-Hidaya — Spécifications et contrôle qualité
23 novembre 2026 · Revue de conception · Référence PR #30, commit 6283af3

Les 13 planches utilisent des données fictives. Les valeurs et dates illustrent la hiérarchie de l’information.

## Décisions de conception

- Trois identités officielles. Logo ONG sur la vitrine, emblème WAT Connect dans le portail et sur le lanceur, emblème Nour dans l’espace pédagogique. Bleu profond et turquoise pour la structure et les actions. Or réservé aux accents. La géométrie de la vitrine reprend le principe de facettes.
- L’accueil propose l’accès d’équipe et les programmes publics. Les comptes d’équipe sont créés ou activés par l’administration WAT. L’apprenant dispose de son espace pédagogique et d’un retour explicite à WAT.
- Le recensement par agent et l’auto-inscription publique alimentent le même registre WAT. Un agent agit dans les périmètres assignés. L’auto-inscription peut concerner un bénéficiaire hors mosquée. Le dossier est distinct du compte d’accès. Autoriser la saisie agent sans e-mail et prévoir consentement, traitement des mineurs et contrôle des doublons. Nour V2.2, sections 2, 5 et 6.
- Catalogues FR/EN/AR pour les libellés, validations, états et erreurs. Appliquer lang=ar et dir=rtl avant le premier rendu et mémoriser le choix. Utiliser les propriétés CSS logiques. Isoler les e-mails, identifiants et montants en texte bidirectionnel. Inverser les flèches directionnelles. Conserver l’orientation des logos.
- Privilégier des cibles tactiles d’au moins 44 px pour les actions essentielles. Montrer séparément brouillon, attente de synchronisation, confirmation et conflit. Réserver l’état synchronisé aux écritures confirmées par le serveur.
- Contrôler les permissions côté serveur. Présenter les états de vérification et d’accès uniquement lorsqu’ils sont connus. Pour des identifiants invalides, employer un message générique. Associer les retours de saisie aux champs, et ne pas exposer de données personnelles dans les diagnostics.

## Correspondance dépôt

| Planche | Base technique et suite |
|---|---|
| Lancement | PR #30 et ressources Capacitor. Vérifier le lanceur et le démarrage sur appareil. Respecter la préférence de mouvement réduit. |
| Bienvenue | index.html, portail.html. Rendre visibles le choix de la langue et les deux portes d’entrée. |
| Vitrine | site-institutionnel.html. Actualiser contenus, identité ONG et navigation trilingue. |
| Connexion | index.html et PR #21. Couvrir récupération, vérification, erreurs et autorisations. |
| Présidence | Portail, projets, programmes et présences. Construire la vue de pilotage selon les droits. |
| Secrétariat | Portail. Prévoir agenda, réunions, PV, décisions et suivi des actions. |
| Finances | finance.html, PR #12. Respecter les écritures, pièces et circuits de validation. La conformité SYCEBNL fait l’objet d’une recette propre. |
| Projets | projets.html, activites.html. Conserver fiches, historiques et liens vers les activités. |
| Programmes | programmes.html, PR #22, nour-al-hidaya.html. Conserver la distinction entre gestion WAT et apprentissage Nour. |
| Membres | administration.html, PR #21. Séparer annuaire, invitation, authentification et habilitation. |
| Documents | Espace à consolider. Prévoir versions, recherche, accès et contrôle de publication. |
| Mobile | Capacitor, service worker. Tester clavier, petits écrans, déconnexion, retour et reprise. |
| RTL | PR #30, Nour et portail. Traduire les libellés encore en français et vérifier l’ordre visuel et clavier. |

## Chaînes de référence

| Français | English | العربية |
|---|---|---|
| Siège numérique | Digital headquarters | المقر الرقمي |
| Se connecter | Sign in | تسجيل الدخول |
| Mot de passe oublié ? | Forgot your password? | هل نسيت كلمة المرور؟ |
| Retour à WAT Connect | Return to WAT Connect | العودة إلى وات كونكت |
| Hors connexion | Offline | غير متصل |
| En attente de synchronisation | Waiting to sync | بانتظار المزامنة |
| Synchronisé | Synced | تمت المزامنة |

## Conditions de recette et continuité

| Ordre | Contrôle | Preuve |
|---|---|---|
| 1 | Connexion, lancement et vitrine sur petit écran, FR → AR → EN, rechargement, affichage à 320, 360 et 768 px | Captures et résultats sur le SHA retenu |
| 2 | APK sur téléphone, icône, ouverture Nour, retour par lien et bouton Android | Version Android/WebView, SHA et résultats |
| 3 | Comptes staging vérifiés, équipe avec et sans habilitation, Club et apprenant | Résultats par rôle, aucun accès hors périmètre |
| 4 | Brouillon terrain sans e-mail, coupure réseau, reprise, redémarrage | Confirmation côté staging et absence de duplication |
| 5 | Textes publics, coordonnées, logos et visuels | Approbation institutionnelle avant mise en production |

Les PR #29 et #30 sont ouvertes en brouillon. Les workflows et l’émulation documentés dans la #30 couvrent le commit 6283af3. Il reste des libellés français dans la connexion de Nour en arabe. Reprendre par ces libellés, les états d’accès et le contrôle de la vitrine, en coordonnant les modifications avec la #30. Les profils authentifiés de recette staging et le contrôle physique Android restent à obtenir. Cette contribution documentaire est indépendante de la branche applicative de Codex.
