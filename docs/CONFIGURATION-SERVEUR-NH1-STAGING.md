# Préparation de la connexion NH-1 — Cloudflare staging et Firebase

**Statut : route agent préparée dans la PR #87.** La route reste fermée par défaut. Les contrôles de cette PR utilisent des dépendances simulées et aucune recette Firebase staging réelle n’a été exécutée.

## Cible strictement autorisée

- Worker cible : `wat-connect-staging`.
- Projet Firebase/Firestore attendu : `wat-connect-staging`.
- Base Firestore : `(default)`.
- L'environnement `production` et le projet Firebase `wat-connect` sont explicitement rejetés par le validateur NH-1.

Le fichier `.firebaserc` utilise `demo-wat-connect` par défaut, réserve l'alias explicite `staging` à `wat-connect-staging` et ne définit aucun alias de production. Les scripts de développement et de test ciblent le projet Emulator fictif; le script de déploiement Firebase ne fait pas partie de cette préparation.

## Contrat de configuration

Variables non secrètes du Worker staging :
- `WAT_ENV=staging`
- `FIREBASE_PROJECT_ID=wat-connect-staging`
- `WAT_ENABLE_AGENT_REGISTRATION=true` uniquement pour la durée d’une recette staging autorisée.

Secrets à enregistrer uniquement dans le magasin de secrets Cloudflare du Worker staging :
- `FIREBASE_CLIENT_EMAIL` : adresse de l'identité de service dédiée ;
- `FIREBASE_PRIVATE_KEY` : clé privée PKCS#8 de cette identité ;
- `TURNSTILE_SECRET_KEY` : secret anti-robot exigé par le validateur partagé.
- `WAT_REGISTRATION_HMAC_HEX` : clé dédiée de 32 octets encodée en 64 caractères hexadécimaux. Conserver la même clé pendant toute la fenêtre de rejeu.

Ne jamais mettre une clé privée dans Git, une variable de configuration publique, le navigateur, le dépôt APK ou un message ChatGPT. Ne jamais réutiliser une identité de production dans staging.

## Privilèges Firebase attendus

Créer une identité de service dédiée au Worker NH-1, limitée au projet staging. Lui attribuer uniquement les permissions Firestore nécessaires au registre NH-1, idéalement via un rôle personnalisé minimal après validation des opérations exactes. Ne pas utiliser une clé de compte propriétaire, éditeur général ou administrateur Firebase.

La création de l'identité, l'attribution IAM et la génération de la clé restent à effectuer dans le projet Firebase/Google Cloud staging. Aucun secret n'est présent dans le dépôt.

## Contrôles déjà préparés dans le code

- Le validateur refuse tout environnement autre que `staging`.
- Il refuse tout projet Firebase autre que `wat-connect-staging`.
- Il vérifie le format de l'adresse de compte de service, de la clé PEM et la présence du secret Turnstile.
- Il normalise les retours à la ligne PEM échappés.
- Les diagnostics ne reproduisent jamais les valeurs secrètes.
- La route agent nécessite l’activation explicite et les paramètres valides. La route publique et les routes de traitement restent fermées.

## Recette agent sur données fictives

Avant activation, vérifier l’identité dédiée et les autorisations de lecture, de transaction et de création requises dans staging. Préparer un agent avec les périmètres source et destination, un second compte dépourvu d’un périmètre, un bénéficiaire fictif et son inscription source, ainsi qu’un groupe destination actif.

1. Activation absente ou configuration hors staging. La route agent doit répondre `503`.
2. En staging autorisé, effectuer l’inscription avec le premier agent. La réponse doit contenir l’identifiant et l’état `pending`. Contrôler l’inscription, le reçu et l’audit sur données fictives.
3. Rejouer la même opération avec la même charge et le même agent. Vérifier que l’identifiant est identique et que le nombre d’inscriptions et d’écritures d’audit reste stable.
4. Refaire l’essai avec le second compte et vérifier le refus sans création de dossier. Après retrait d’une autorisation de test, vérifier également le refus d’une nouvelle demande du premier compte.
5. Désactiver la route et relever le retour à `503`. Consigner le SHA, les identifiants fictifs et les résultats. Garder les valeurs des secrets et les jetons hors du compte rendu.

Les [contrôles API de la PR #87](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45367285593) ont réussi. La préparation de cette fiche ne modifie aucun projet Firebase ni accès.

## Vérifications du jeton avant inscription

Tester la route activée sur le build de la [PR #90](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/90), commit `b35351e3527a8a260cc896a8d90873d4aa41e028`, après validation de ses dépendances.

| Cas sur un compte fictif | Résultat attendu |
| --- | --- |
| En-tête Bearer absent ou mal formé | HTTP 401 et en-tête `WWW-Authenticate: Bearer`. Aucune transaction. |
| Jeton signé pour un autre projet de test ou jeton expiré | HTTP 401. Aucune transaction. |
| Jeton valide avec adresse non vérifiée | HTTP 403. Aucune transaction. |
| Compte désactivé ou périmètre retiré après obtention du jeton | Refus. Aucun dossier, reçu ni audit de création. |
| Agent actif et autorisé sur les deux périmètres | Inscription `pending`, puis même identifiant lors d’un rejeu identique. |

En cas de conflit d’écriture, vérifier que le compte et les périmètres sont contrôlés de nouveau. Consigner les statuts et les résultats de la recette avec des références fictives. [CI API du commit #90](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45368083513) réussie. Les scénarios Firebase staging restent à exécuter.
