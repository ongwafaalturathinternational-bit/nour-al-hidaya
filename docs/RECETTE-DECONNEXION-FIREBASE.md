# Déconnexion et purge du cache Firestore

Une déconnexion déclenchée pendant l’ouverture du cache attend son résultat. Les appels concurrents partagent la même opération. Si la fermeture du client réussit mais que la purge échoue, une nouvelle tentative reprend à la purge. La session Firebase et la navigation ne changent qu’après la réussite de la purge lorsque la persistance est active.

Les tests isolés contrôlent l’ordre des appels, l’échec hors connexion, le blocage par un autre onglet, la reprise après échec et les clics simultanés. Le test de blocage multi-onglets simule le refus du SDK. La vérification réelle dans deux onglets et avec un compte autorisé reste à effectuer sur staging.

Code de référence : `firebase-init.js`. Socle : PR #30, `6283af3`. Aucun échange avec Firebase distant, aucune modification de règles, d’habilitations ni de données réelles.
