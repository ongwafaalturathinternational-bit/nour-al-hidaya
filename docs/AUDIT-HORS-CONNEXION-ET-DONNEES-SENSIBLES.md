# Audit — mode hors connexion et protection des données WAT Connect

**État vérifié : 20 novembre 2026**  
**Périmètre :** PR #20, branche `fix/lot8-club-onboarding-and-access`, commit de référence `a8308fbffe3e5e8d844bb0aa454ab58162890cfc`.

## 1. Ce qui est actuellement en place

- Le service worker précache uniquement les pages et ressources statiques explicitement listées. Il ne met pas en cache les réponses Firestore, les API métier ni les requêtes d'authentification.
- Les modules internes Projets, Activités, Club Khuddam, Administration et Programmes activent la persistance Firestore IndexedDB et attendent sa disponibilité avant leurs lectures.
- Firestore peut conserver localement les documents déjà consultés et mettre en attente les écritures autorisées pour les synchroniser au retour du réseau.
- La déconnexion sécurisée attend les écritures en attente, termine l'instance Firestore, demande l'effacement de la persistance locale, puis déconnecte le compte. Elle refuse la déconnexion hors ligne lorsque la persistance est active.
- Les règles Firestore restent applicables aux écritures synchronisées. Les tests automatisés du commit de référence ont réussi : 106 tests, 0 échec.

## 2. Limite de sécurité importante

La persistance Firestore standard dans IndexedDB **n'est pas un coffre applicatif chiffré**. Le SDK ne fournit pas, dans cette configuration, de chiffrement applicatif de bout en bout des documents stockés localement. La protection dépend donc notamment du système, du profil du navigateur, du verrouillage de l'appareil et de la maîtrise de ses accès.

La file d'écritures gérée par Firestore ne constitue pas non plus, à elle seule, le registre opérationnel complet demandé pour les inscriptions terrain : elle ne fournit pas à l'interface WAT un tableau de suivi métier des opérations en attente, de leur auteur, de leur état de rapprochement et de leur éventuel conflit.

En conséquence :
- Le cache actuel convient uniquement à des essais contrôlés et à des appareils de confiance, verrouillés et réservés à des personnes habilitées.
- Il ne faut pas y saisir ni y charger des dossiers sensibles de bénéficiaires sur des téléphones partagés, prêtés, non verrouillés ou non administrés.
- La persistance actuelle ne valide pas l'exigence d'une file locale chiffrée/protégée pour l'inscription universelle des bénéficiaires.

## 3. Décisions techniques requises avant l'inscription terrain de bénéficiaires

Concevoir et tester un mécanisme dédié, sans affaiblir les règles centrales :

1. **Dossier indépendant de l'authentification :** identifiant de dossier opaque et unique, compte Firebase facultatif, e-mail et téléphone facultatifs.
2. **Saisie assistée :** agent authentifié et habilité, périmètre limité à sa mission, attribution de l'auteur et horodatage.
3. **Stockage local protégé :** chiffrement applicatif des données en attente, clé non codée en dur, protection liée au terminal et effacement contrôlé à la déconnexion/révocation.
4. **File d'attente visible :** états brouillon, en attente, synchronisé, échec à corriger et conflit à résoudre ; aucune perte silencieuse.
5. **Synchronisation idempotente :** identifiant stable d'opération, détection des doublons, reprise après interruption et journal d'audit.
6. **Contrôle serveur :** validation des droits et des données à la synchronisation ; les contrôles locaux ne remplacent jamais les règles Firestore.
7. **Cycle de vie et confidentialité :** politique de conservation locale, verrouillage, expiration, révocation, appareil perdu, effacement et gestion des mineurs/consentements.

## 4. Tests de recette obligatoires

- Appareil verrouillé, redémarrage et réouverture en mode avion.
- Création de plusieurs dossiers sans e-mail, sans téléphone et sans compte personnel.
- Deux agents qui saisissent simultanément la même personne : détection et rapprochement sans fusion abusive.
- Coupure réseau pendant l'envoi, reprise et vérification de l'absence de doublon.
- Rejet serveur d'une opération dont le périmètre a été retiré.
- Déconnexion avec écritures en attente, fermeture forcée, stockage saturé et échec d'effacement.
- Perte ou remplacement de l'appareil : aucune exposition des dossiers en attente.
- Vérification qu'un QR code ou un identifiant public ne révèle aucune donnée personnelle.

## 5. Conclusion de l'audit

Le mode hors connexion actuel constitue une **persistance de travail pour les modules internes** et un progrès utile pour le lot opérationnel. Il ne doit pas être présenté comme une solution de stockage local chiffré ni comme l'inscription universelle terrain de Nour Al-Hidaya.

La prochaine évolution doit être un composant d'inscription assistée et de synchronisation protégé, conçu séparément du cache Firestore générique, puis raccordé au dossier central des bénéficiaires après validation du cahier des charges initial.

**Aucune donnée réelle de bénéficiaire ne doit être utilisée pour la recette de ce mécanisme avant validation de sa protection locale et de ses règles d'accès.**


## Addendum de validation — 20 novembre 2026

Le présent audit a été initialement vérifié sur le commit applicatif `a8308fbffe3e5e8d844bb0aa454ab58162890cfc`. Le commit `61ab7fba2a87909f74befef529c289bfa7954e25` ajoute cette documentation et ne modifie pas le comportement applicatif décrit ci-dessus.

Sur ce dernier commit :
- Tests Firestore et applicatifs : **106 réussis, 0 échec, 0 ignoré** — [workflow réussi](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44813393400).
- Build APK Android debug : **réussi** — [workflow réussi](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/44813393313).

Ces validations automatisées ne remplacent pas les tests multi-onglets, la recette sur appareil Android physique, ni les essais terrain avec données fictives. La limite de protection des données locales demeure inchangée.
