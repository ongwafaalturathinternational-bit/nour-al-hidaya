# Séparation des environnements Firebase — WAT Connect

## Règle de sécurité

- L'application Android et tous les domaines ordinaires utilisent le projet Firebase de production `wat-connect`.
- Seul le domaine exact `wat-connect-staging.ongwafaalturathinternational.workers.dev` sélectionne le projet Firebase `wat-connect-staging`.
- Aucun paramètre d'URL ne permet de basculer un site de production vers staging.
- Si Firebase est déjà initialisé sur un projet différent de celui attendu, l'initialisation est bloquée.

## Construction et publication

Le script `npm run build:android:web` prépare les ressources dans `web-dist`. La configuration `wrangler.staging.json` ne publie que ce dossier sous le Worker `wat-connect-staging`.

Le workflow `.github/workflows/cloudflare-staging-preview.yml` est manuel (`workflow_dispatch`), limité à la branche de travail indiquée et à l'environnement GitHub `staging`. Il ne publie jamais le Worker de production `nour-al-hidaya`.

Le workflow n'est pas lancé par ce commit. Sa disponibilité pour une exécution manuelle dépend de sa présence sur la branche par défaut de GitHub. Aucune publication staging ou production n'est autorisée par cette préparation.

## Vérifications attendues

Les tests de `firebase-init.js` vérifient que :
- Android et un domaine ordinaire utilisent `wat-connect` ;
- le domaine staging exact utilise `wat-connect-staging` ;
- l'application ne mélange pas les projets Firebase lorsqu'une instance existe déjà.

## Limites

La configuration Firebase côté navigateur est publique et ne contient aucun compte de service. La séparation des projets ne remplace pas les règles Firestore, App Check, les restrictions Auth ni la validation des autorisations côté serveur. Les données personnelles réelles ne doivent pas être utilisées pour les essais avant validation complète de la sécurité et du comportement hors connexion.
