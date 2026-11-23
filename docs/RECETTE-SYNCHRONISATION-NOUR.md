# Synchronisation pédagogique Nour Al-Hidaya

Base technique `6283af3`. Lorsqu’un retour réseau, une reprise de session ou une nouvelle saisie déclenchaient des envois simultanés, une file réécrite depuis un ancien instantané pouvait effacer les entrées ajoutées entre-temps.

Le traitement est désormais séquentiel pour chaque file et compte dans une instance de l’application. Après confirmation, il relit la file locale et retire uniquement le contenu confirmé. Une entrée modifiée ou refusée reste disponible pour la reprise. Le changement de session interrompt le traitement après l’écriture en cours. Les clés de stockage, les collections Firestore et les formats existants restent compatibles.

Les tests locaux reproduisent l’ajout d’un nouvel élément et le remplacement d’une note pendant un envoi, puis le refus d’écriture et le changement de session. L’architecture sépare la gestion de la file des écritures Firestore et du rendu, pour faciliter la future intégration d’interfaces approuvées.

Hors périmètre de cette recette locale : synchronisation entre deux onglets, recette sur téléphone et confirmation des écritures avec des comptes autorisés dans `wat-connect-staging`.

La directive du Président suspend toute création et intégration de maquettes. Les propositions graphiques précédentes sont archivées par conservation des fichiers et branches existants. Aucun travail graphique n’est inclus ici.
