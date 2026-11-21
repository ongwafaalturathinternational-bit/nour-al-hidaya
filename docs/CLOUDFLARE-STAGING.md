# Aperçu Cloudflare de WAT Connect

## Cible de staging isolée

Le dépôt contient maintenant `wrangler.staging.json`, une configuration distincte qui cible exclusivement le Worker **wat-connect-staging**. Elle partage les mêmes fichiers statiques WAT Connect, mais ne modifie pas la configuration du Worker `nour-al-hidaya`.

Les fichiers internes et les artefacts sensibles sont exclus des assets Cloudflare et Firebase : fonctions backend, scripts d'administration, dépendances, fichiers de configuration, archives, paquets Android et clés de signature.

La validation GitHub exécute une simulation Wrangler sur cette configuration dédiée. Cette simulation ne publie rien.

## État réel observé dans Cloudflare

Le compte contient déjà une connexion Workers Builds au dépôt GitHub, mais elle est attachée au Worker **nour-al-hidaya**, pas au Worker de staging.

Configuration actuelle de ce Worker :
- branche surveillée : `security/staff-account-provisioning` ;
- builds automatiques activés ;
- builds Preview désactivés ;
- commande de build : `bun run build:android:web` ;
- commande de déploiement : `bun run preview:cloudflare`.

Le journal Cloudflare du 21 novembre 2026 confirme l'échec de la commande de build : le script `build:android:web` n'existe pas. Le dépôt ne contient pas de `package.json` à la racine définissant ces scripts. La commande de déploiement configurée n'existe pas non plus dans le dépôt.

**Précaution importante :** comme les Preview builds sont désactivés, la branche surveillée est traitée comme la branche de production de ce Worker. Il ne faut pas remplacer simplement la commande par `wrangler deploy` : cela pourrait publier la branche de travail sur le Worker actif `nour-al-hidaya`. Cette configuration de production n'a pas été modifiée.

Le Worker **wat-connect-staging** existe, mais n'a actuellement aucune configuration Workers Builds associée.

## Mise en place proposée pour staging

La configuration sûre à créer sur le Worker `wat-connect-staging` est :

- branche de production de ce Worker : `main` ;
- commandes de production : déploiement uniquement vers `wat-connect-staging`, jamais vers `nour-al-hidaya` ;
- Preview builds activés pour les branches non principales ;
- commande Preview : `wrangler preview` avec `wrangler.staging.json` ;
- jeton de build Cloudflare existant réutilisable.

Cela permettrait à la branche `security/staff-account-provisioning` de produire une URL de prévisualisation isolée, sans toucher à la production.

La création de cette configuration Cloudflare n'a pas encore été effectuée : elle active les builds automatiques du Worker de staging. J'attends l'autorisation explicite avant de l'activer.

## Workflow GitHub manuel de secours

Le workflow `.github/workflows/cloudflare-staging-preview.yml` est également préparé. Il publie uniquement sur `wat-connect-staging` après déclenchement manuel.

Il est encore dans la branche de travail de la PR 21, pas dans la branche par défaut `main`. GitHub ne rend un workflow `workflow_dispatch` disponible que lorsque son fichier existe aussi sur la branche par défaut. Cette solution nécessite également les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` dans l'environnement GitHub `staging`.

## Sécurité et état

- Aucun déploiement sur le Worker actif `nour-al-hidaya` n'a été effectué par ce travail.
- Aucun déploiement de production n'a été effectué.
- La simulation Wrangler de la configuration staging est automatisée dans GitHub Actions.
- Les fonctions Firebase restent non déployées ; App Check et la décision de facturation Firebase devront être validés avant leur activation.
