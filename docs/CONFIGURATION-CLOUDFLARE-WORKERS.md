# Configuration Cloudflare Workers — WAT Connect

## Configuration du dépôt

- Worker Cloudflare : `nour-al-hidaya`
- Répertoire racine : `/`
- Configuration Wrangler : `wrangler.jsonc`
- Dossier publié : `web-dist/`
- Commande de compilation : `bun run build:android:web`
- Commande de déploiement de production : `npx wrangler deploy`
- Commande d'aperçu des branches : `npx wrangler preview`

## Séparation production / aperçu

La branche de production Cloudflare reste `main`. Les branches de travail et les pull requests doivent être validées via les aperçus Cloudflare. Ne pas fusionner une pull request et ne pas publier en production sans autorisation explicite.

## Construction des fichiers statiques

Le script `scripts/prepare-capacitor-web.mjs` prépare le répertoire `web-dist/`, utilisé à la fois par l'application Android Capacitor et par les actifs statiques du Worker. Il copie les pages autorisées et prépare les SDK Firebase locaux nécessaires au démarrage hors connexion.

## Contrôle après modification des paramètres Cloudflare

Après toute modification des paramètres de compilation, déclencher une nouvelle compilation sur le dernier commit de la branche concernée. Vérifier les journaux de compilation, puis ouvrir l'URL d'aperçu et contrôler les pages, l'authentification et les fonctions opérationnelles avant toute fusion.
