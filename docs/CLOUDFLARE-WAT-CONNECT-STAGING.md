# Publication Cloudflare — WAT Connect Staging

## Objectif
Publier le portail WAT Connect sur un Worker Cloudflare distinct, sans remplacer le Worker existant `nour-al-hidaya`.

## Séparation des environnements
- Worker de staging : `wat-connect-staging`
- Projet Firebase utilisé par le portail de staging : `wat-connect-staging`
- Le portail sélectionne Firebase staging avec le paramètre `?wat-env=staging`.
- Le Worker existant `nour-al-hidaya` reste inchangé.
- Aucun déploiement en production n'est prévu par cette procédure.

## Préparation
Cette branche contient le portail WAT Connect (issu de la PR #18) et un nom de Worker séparé. Le fichier `.assetsignore` exclut les documents, tests et fichiers de configuration du répertoire des ressources publiques.

## Publication contrôlée
Depuis un environnement local de confiance où Wrangler est installé et authentifié sur le compte Cloudflare de l'ONG :

```bash
npx wrangler whoami
npx wrangler deploy --config wrangler.json
```

Vérifier que la sortie confirme le Worker `wat-connect-staging`. Ne pas modifier le nom pour `nour-al-hidaya`.

## Vérifications après publication
1. Ouvrir l'URL `https://wat-connect-staging.<sous-domaine-compte>.workers.dev/?wat-env=staging` (utiliser le sous-domaine workers.dev réellement attribué au compte).
2. Vérifier que le titre et l'accueil affichent WAT Connect — ONG Wafa Al-Turath.
3. Vérifier que l'URL de staging affiche le projet Firebase `wat-connect-staging`, jamais `wat-connect`.
4. Tester la connexion et la vérification d'adresse avec le compte de test prévu.
5. Vérifier que l'URL historique `https://nour-al-hidaya.ongwafaalturathinternational.workers.dev/` affiche toujours Nour Al-Hidaya.

## Limites et précautions
- Cette préparation ne déploie rien à elle seule.
- Ne jamais publier cette configuration avec le nom du Worker de production.
- Ne pas fusionner les PR #18 ou cette PR sans validation explicite.
- Ne pas ajouter de jeton Cloudflare, mot de passe ou secret dans Git.
