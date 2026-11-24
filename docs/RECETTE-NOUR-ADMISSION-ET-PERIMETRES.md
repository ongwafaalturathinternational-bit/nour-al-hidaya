# Recette fonctionnelle Nour — affectations et admission
24 novembre 2026 · Profils et dossiers fictifs uniquement

Les PR #54 (3d4d603) et #55 (61bb8ea) sont empilées sur #22. Les vérifications GitHub API 45315790208 et 45316191136 ont réussi. #55 ajoute un lecteur de demandes JSON mais ne le raccorde à aucun parcours d’inscription. Les cas de bout en bout ci-dessous restent à exécuter dès qu’une version staging les expose.

| Cas | Préparation | Contrôle attendu |
|---|---|---|
| NH-01 | Agent A affecté à un groupe pour la période en cours; groupe B hors périmètre | Admission possible uniquement pour le groupe A. La demande hors périmètre ne crée aucun dossier. |
| NH-02 | Préparer une affectation à période inversée ou des droits dupliqués | Registre refusé dans son ensemble; relever l’état antérieur et vérifier sa conservation. |
| NH-03 | Présenter une affectation expirée puis une nouvelle affectation valide | L’accès effectif évolue selon la période. Relever le fuseau et l’heure retenus pour les bornes. |
| NH-04 | Saisir sur le terrain un dossier fictif sans e-mail et sans compte personnel | Le dossier administratif est enregistré sans adresse fictive ni création forcée de compte. Cette exigence n’est qualifiée que sur le parcours métier raccordé. |
| NH-05 | Soumettre une demande non conforme du point de vue format ou taille au parcours raccordé | Demande refusée sans création partielle; aucune donnée de la demande reproduite dans les messages d’erreur. |
| NH-06 | Couper le réseau après saisie, puis rétablir et relancer la demande | Un seul dossier confirmé côté serveur. Le statut local reste en attente jusqu’à confirmation. Vérifier sur le flux d’inscription, distinct des files pédagogiques #37–38. |

**Preuve par cas** : [SHA] [environnement] [agent fictif et périmètre] [référence anonymisée] [compte de dossiers avant/après] [résultat] [écart]. Le parcours complet dépend du raccordement de l’API au flux d’inscription et de comptes staging fictifs habilités.
