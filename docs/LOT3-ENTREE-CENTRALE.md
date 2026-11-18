 # Lot 3 — Entrée centrale WAT Connect

## Décision d’architecture

La racine du site (index.html) est désormais l’accueil de **WAT Connect**, portail numérique central de l’ONG Wafa Al-Turath.

Le programme Nour Al-Hidaya est conservé comme application distincte sous nour-al-hidaya.html. Il demeure le premier programme intégré au portail, sans être confondu avec l’ensemble du système d’information de l’ONG.

## Installation mobile

- manifest.json installe WAT Connect et ouvre la racine du portail.
- manifest-nour.json installe Nour Al-Hidaya et ouvre sa page dédiée.
- Les deux applications partagent les mêmes ressources hébergées et le socle Firebase existant.

## Contrôles

Les tests vérifient la syntaxe JavaScript des deux espaces, leurs titres, leurs liens croisés et les URL de démarrage des deux manifestes.

## Limites de livraison

Cette modification prépare le routage et l’identité de la plateforme. Elle ne signifie pas que les modules de gestion administrative, financière, sociale ou logistique sont déjà fonctionnels. Aucun déploiement ni service payant n’est déclenché.
