# Rapport de reprise WAT Connect et Nour Al-Hidaya

23 novembre 2026 · Point de départ pour l’ONG et ChatGPT Work

## Dépôt, branches et livraisons

Le dépôt existant a été cloné. `main` pointe sur `510896a` et contient le prototype Nour, son manifeste et son service worker. Les 29 branches distantes hors `main` portent les lots WAT, les évolutions Nour, les identités graphiques, l’isolation Firebase et les travaux Cloudflare. Aucun de leurs sommets n’est intégré dans `main`. Les résultats GitHub couvrent 29 PR, dont le brouillon #29, ouvert et non fusionné.

La PR #29 ajoute 24 commits et modifie 10 fichiers par rapport à `dfe3a67`. Son sommet `fc44c5a` ajoute l’accolade manquante dans `render()`. Les contrôles Firestore et Android ont réussi sur ce sommet. L’APK testé auparavant provenait de `d7a2283`. L’APK de `fc44c5a` est disponible sur GitHub Actions avec une expiration annoncée le 7 décembre 2026 à 17 h 25 UTC.

- [PR #29](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/29)
- [Recette APK initiale](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45099978990)
- [APK staging de fc44c5a](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45227186449/artifacts/14846235031)
- [Contrôle Firestore de fc44c5a](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45227186456)

## Services et accès

| Ressource | Vérification du 23 novembre | Accès encore nécessaire |
|---|---|---|
| GitHub | Clone, refs, PR et métadonnées Actions consultés | Droits d’écriture à confirmer lors de la publication |
| Firebase Hosting public | [Site principal](https://wat-connect.web.app) répond 404 « Site Not Found » | Accès en lecture au projet `wat-connect` et à l’historique des versions |
| Firebase V6 | [Aperçu V6](https://wat-connect--v6-test-6rwh9sg5.web.app) répond 200 et sert une page Nour Al-Hidaya | Relier la version servie à son commit et tester le parcours |
| Firebase Auth et Firestore | Configuration et règles versionnées accessibles | Lecture des projets concernés et comptes de recette staging vérifiés, avec rôles WAT et apprenant |
| Netlify | [Prototype](https://quiet-babka-48d7a0.netlify.app) répond 401 « Login Redirect » | Accès au site dans l’équipe Netlify propriétaire |
| Cloudflare | Le connecteur authentifie l’utilisateur ONG. Le dépôt contient des configurations Worker | Associer les comptes et ressources visibles au projet avant de conclure sur les déploiements |
| Références | Cahier général et assets WAT/Nour dans GitHub | PDF institutionnel et cahier Nour v2.2 à retrouver pour vérifier le logo de l’ONG et le périmètre pédagogique |

## Fonctionnalités, régressions et code à conserver

La recette antérieure rapporte l’installation, le lancement, la saisie des formulaires et l’ouverture en mode hors connexion. Elle rapporte aussi les échecs de retour, d’authentification membre, d’identité visuelle et de rendu arabe. La syntaxe corrigée et la CI verte justifient une nouvelle recette. La cause exacte du défaut RTL en WebView et la persistance du quiz dans Firestore restent à vérifier.

Le portail, l’entrée centrale, l’annuaire, les programmes, les activités et présences, les projets et le Club Khuddam sont présents sur la branche de reprise. Le registre financier, les évolutions d’accessibilité et la centralisation Nour se poursuivent sur d’autres branches. Conserver les parcours existants, le découpage des modules, les règles et tests d’accès, le cache des ressources statiques et la documentation des environnements. Reprendre uniquement les éléments nécessaires de chaque branche après comparaison de ses divergences.

## Proposition UI/UX

| Surface | Parcours et composition |
|---|---|
| Lancement et accueil WAT | Emblème officiel WAT, transition courte avec respect du mouvement réduit, accueil FR/EN/AR et accès immédiat à la connexion |
| Vitrine ONG | Logo institutionnel du PDF, lecture éditoriale par mission, axes, programmes, publications et coopération. Visuels et résultats vérifiés |
| Connexion | Formulaire lisible, état réseau et message associé à l’erreur. Après connexion, accès aux seuls espaces autorisés |
| Présidence et secrétariat | Navigation constante, décisions et validations pour la présidence, échéances et modèles documentaires pour le secrétariat |
| Finances | Journal, budgets, justificatifs et historique adaptables au mobile selon les droits |
| Projets et programmes | Vue portefeuille, puis fiche de travail avec responsables, activités, calendrier, indicateurs et rapports |
| Membres et documents | Annuaire filtrable, fiches lisibles, recherche documentaire, historique et droits explicites |
| Nour Al-Hidaya | Marque pédagogique propre, accès aux cours et progression, retour visible vers WAT. Recensement et pilotage dans WAT |
| Mobile et arabe | Navigation accessible au clavier et au toucher, ordre RTL natif, propriétés CSS logiques et vérification du changement de langue sur les parcours |

## Ordre des livrables

1. Stabilisation immédiate sur une branche issue de la PR #29. Séparer les icônes, vérifier la construction, reproduire navigation et RTL.
2. Recette staging après compilation. Tester sur Android le retour système, la connexion avec profils autorisés, le quiz, le mode hors connexion et la persistance après reconnexion.
3. Présenter les maquettes des treize écrans avant la refonte générale. La vérification du logo institutionnel dépend du PDF.
4. Intégrer par lots les parcours institutionnels puis les modules métier prioritaires. Livrer chaque lot avec sa preuve de fonctionnement et garder la validation finale à l’ONG.

Les durées des étapes de recette et de refonte dépendent de la disponibilité des comptes de test, des sources institutionnelles et de l’appareil Android.

## Premier correctif après le rapport

Les manifestes, favicons et le cache identifient maintenant séparément WAT Connect et Nour Al-Hidaya. Le générateur Capacitor utilise le PNG WAT officiel pour le lanceur natif. Les quatre tailles déclarées ont été vérifiées sur les fichiers PNG. Les 120 tests Node hors émulateur ont réussi et le bundle Capacitor local a été généré avec Firebase staging forcé. Une recette sur téléphone reste nécessaire.
