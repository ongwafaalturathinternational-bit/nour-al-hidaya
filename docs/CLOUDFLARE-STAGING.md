# Aperçu Cloudflare de WAT Connect

## Fonctionnement

Le workflow `.github/workflows/cloudflare-staging-preview.yml` prépare une publication manuelle du dépôt sur le Worker **wat-connect-staging**.

- Déclenchement : manuel uniquement depuis la branche `security/staff-account-provisioning`.
- Cible : Worker de prévisualisation `wat-connect-staging`.
- Aucun déploiement sur `nour-al-hidaya` ni sur la production.
- Aucun déploiement automatique à chaque commit.
- Le contrôle `wrangler deploy --dry-run` reste exécuté séparément dans le workflow de validation.

## Configuration requise une seule fois

Dans GitHub, ouvrir le dépôt puis **Settings → Secrets and variables → Actions → Environments** et créer/ouvrir l'environnement `staging`. Ajouter ces secrets à l'environnement :

- `CLOUDFLARE_API_TOKEN` : jeton API Cloudflare limité au compte WAT et aux permissions nécessaires au déploiement des Workers (Workers Scripts: Edit ; Account Settings: Read si demandé par Wrangler).
- `CLOUDFLARE_ACCOUNT_ID` : identifiant du compte Cloudflare WAT.

Ne jamais mettre le jeton dans le dépôt, dans un fichier de configuration ou dans une conversation. Ne pas utiliser un jeton global ou des droits administrateur complets.

## Déclenchement

Dans GitHub : **Actions → Cloudflare staging preview → Run workflow**, choisir la branche `security/staff-account-provisioning`, puis lancer.

Le workflow refuse toute autre branche et échoue explicitement si l'un des deux secrets manque. La publication réelle ne se produit qu'après ce déclenchement manuel.

## État actuel

Le Worker de staging existe et la simulation Wrangler a réussi. Le workflow est préparé, mais aucun secret GitHub n'est créé ou consulté par ce dépôt depuis cette automatisation. Aucun déploiement réel n'a été lancé.
