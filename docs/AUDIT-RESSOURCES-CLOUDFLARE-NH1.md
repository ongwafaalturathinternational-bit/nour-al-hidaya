# NH-1 — audit réel des ressources Cloudflare staging

Date : 22 novembre 2026  
Périmètre : lecture seule du compte Cloudflare connecté et du dépôt GitHub.  
Aucune ressource Cloudflare n'a été créée, modifiée, supprimée ou déployée.

## 1. Compte et ressources repérés

Le compte Cloudflare connecté expose un compte standard unique pour l'organisation.

Deux Workers existent :
- `wat-connect-staging` — URL workers.dev déjà activée ; dernière mise à jour observée le 21 novembre 2026.
- `nour-al-hidaya` — URL workers.dev déjà activée ; dernière mise à jour observée le 18 novembre 2026.

Le Worker `wat-connect-staging` est la cible logique pour l'API de gestion, sous réserve de garder le staging isolé de la production. Le Worker `nour-al-hidaya` reste distinct pour la vitrine / les ressources du programme.

## 2. Configuration vérifiée

Pour chacun des deux Workers, la configuration retournée par l'API Cloudflare indique :
- aucun binding déclaré ;
- aucune date/flag de compatibilité Node.js ;
- aucune ressource de stockage liée ;
- aucune configuration de secrets répertoriée.

La liste Cloudflare des secrets de ces deux Workers est vide. Cela confirme qu'aucun secret Worker n'est actuellement disponible via cette configuration ; aucune valeur secrète n'a été lue.

Le Worker staging a une version déployée à 100 % depuis le 21 novembre. Son observabilité est désactivée. Le Worker Nour Al-Hidaya a les logs activés, mais les traces désactivées. Ces réglages n'ont pas été modifiés.

## 3. Conséquence pour NH-1

Le compte Cloudflare est bien connecté et le Worker staging existe déjà : il n'est donc pas nécessaire de créer un nouveau Worker pour commencer le travail.

En revanche, le Worker staging n'a actuellement ni binding Firestore, ni secret serveur, ni configuration d'authentification serveur. Il ne peut donc pas encore enregistrer de bénéficiaires en toute sécurité.

La prochaine implémentation doit réutiliser le Worker staging existant uniquement après :
1. choix d'une méthode serveur Firebase officiellement prise en charge ;
2. création/validation d'une identité de service staging à privilèges minimaux ;
3. ajout du secret ou binding requis dans le seul environnement staging ;
4. ajout du code API, des tests et des contrôles d'accès ;
5. validation de bout en bout sans données personnelles réelles.

Aucun de ces changements de configuration n'a été effectué.

## 4. Limite d'accès Firebase

Aucun connecteur Firebase administrable n'est exposé dans les outils disponibles pour cette session. Le dépôt confirme le nom du projet staging `wat-connect-staging`, mais cette revue n'a pas pu vérifier dans la console Firebase :
- les comptes de service existants ;
- les rôles IAM ;
- les méthodes d'authentification serveur déjà activées ;
- les règles et données réellement déployées sur le projet staging.

Il ne faut donc pas supposer qu'une identité Firebase Admin existe ou qu'elle est disponible. Les secrets et clés ne doivent jamais être copiés dans GitHub, dans l'APK ou dans le JavaScript public.

## 5. Prochaine étape de réalisation

Préparer le code API NH-1 en local sur la branche de fonctionnalité, avec validation stricte et tests sans écriture Firestore. En parallèle, obtenir la confirmation de l'identité serveur staging. L'intégration Firestore et les tests d'intégration ne seront activés qu'une fois cette identité vérifiée.

## 6. Références

- Worker staging : `wat-connect-staging`
- Worker programme : `nour-al-hidaya`
- Configuration observée : bindings vides pour les deux Workers.
- Secrets observés : aucune entrée pour les deux Workers.
- Dernier déploiement staging observé : 21 novembre 2026.
