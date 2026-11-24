# Synchronisation pédagogique Nour Al-Hidaya

Base technique `6283af3`. Lorsqu’un retour réseau, une reprise de session ou une nouvelle saisie déclenchaient des envois simultanés, une file réécrite depuis un ancien instantané pouvait effacer les entrées ajoutées entre-temps.

Le traitement est désormais séquentiel pour chaque file et compte dans une instance de l’application. Après confirmation, il relit la file locale et retire uniquement le contenu confirmé. Une entrée modifiée ou refusée reste disponible pour la reprise. Le changement de session interrompt le traitement après l’écriture en cours. Les clés de stockage, les collections Firestore et les formats existants restent compatibles.

Les tests locaux reproduisent l’ajout d’un nouvel élément et le remplacement d’une note pendant un envoi, puis le refus d’écriture et le changement de session. L’architecture sépare la gestion de la file des écritures Firestore et du rendu, pour faciliter la future intégration d’interfaces approuvées.

## APK combiné pour la recette

L’[artefact APK staging](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/actions/runs/45321134063/artifacts/14887079137) est associé au commit `1019fc090a3ff87863bf352283e1178fe9804fe0` de la [PR #67](https://github.com/ongwafaalturathinternational-bit/nour-al-hidaya/pull/67). L’archive est disponible jusqu’au 8 décembre 2026 à 03 h 42 UTC. Télécharger le ZIP depuis GitHub, puis extraire et installer l’APK sur un téléphone de test.

En complément des scénarios Nour, ouvrir le parcours Club Khuddam avec un compte candidat fictif, vérifier la reprise après validation de l’adresse et revenir à WAT Connect depuis Nour. Après l’envoi des écritures en attente, vérifier que la déconnexion aboutit et qu’un second compte ne retrouve aucune donnée privée de la session précédente. Consigner chaque résultat sur le même appareil et le même SHA.

## Recette staging sur téléphone et sur le web

Utiliser l’APK de staging associé au SHA testé et deux comptes apprenants de test distincts, avec des leçons et des données fictives. Ouvrir une session en ligne avant de couper la connexion. Pour le scénario inter-onglets, ouvrir le même aperçu staging dans deux onglets du même navigateur et vérifier que Web Locks est disponible.

| Scénario | Manipulation | Résultat à relever |
| --- | --- | --- |
| Reprise après fermeture | Hors ligne, terminer un quiz et enregistrer une réflexion. Fermer puis rouvrir l’application avant de rétablir le réseau. | Les deux saisies restent visibles après réouverture. Après reprise, une autre session du même compte relit les valeurs depuis staging. |
| Modification pendant l’envoi | En réseau ralenti, modifier la même réflexion pendant la reprise de la file et ajouter une pratique. | La dernière réflexion et la nouvelle pratique sont présentes après stabilisation. |
| Reprise sur deux onglets | Sur le même compte, créer une saisie hors ligne et déclencher la reprise dans les deux onglets. | La saisie remonte sans perte. Confirmer la coordination dans le journal réseau si les outils du navigateur le permettent. |
| Changement de compte | Interrompre la reprise avant la fin, ouvrir le second compte, puis revenir au premier. | Le second compte ne voit aucune saisie du premier. Les éléments restant à envoyer reprennent dans le premier compte. |

Consigner pour chaque essai le SHA, le lien du build, le support utilisé, la version Android ou navigateur, le résultat et les écarts. Indiquer séparément les contrôles sur téléphone physique, les contrôles web et les tests automatisés. Les erreurs de stockage et les entrées malformées sont couvertes par les tests locaux de la file dans les PR #63 et #64.

La directive du Président suspend toute création et intégration de maquettes. Les propositions graphiques précédentes sont archivées par conservation des fichiers et branches existants. Aucun travail graphique n’est inclus ici.
