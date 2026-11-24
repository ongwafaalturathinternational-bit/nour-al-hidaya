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

## Reprise d’une inscription — complément #56

Sur c3aa7ed, le contrôle API 45316554636 est réussi. Il couvre la dérivation du reçu et de l’empreinte. L’écriture atomique du dossier et du reçu reste à raccorder. Pour qualifier le parcours intégré, relever le nombre de dossiers et de reçus avant et après chaque cas.

| Cas | Action de recette | Résultat attendu ou décision à consigner |
|---|---|---|
| NH-07 | Après une réponse perdue, répéter à l’identique une demande fictive dans le même contexte | Un seul dossier, un seul reçu et même référence de suivi lorsque la première demande a été confirmée. |
| NH-08 | Réutiliser la même référence avec un contenu modifié | Vérifier le traitement métier choisi pour cet écart. Dans tous les cas, exiger une issue explicite, traçable et sans écrasement silencieux. |
| NH-09 | Rejouer la référence dans le contexte d’un autre groupe ou acteur | Aucun accès au reçu du premier contexte et aucun rapprochement abusif. |
| NH-10 | Interrompre l’écriture entre les deux opérations du parcours de test | Aucun dossier orphelin et aucun reçu annonçant une réussite sans dossier. Vérifier après reprise que le total final est un dossier. |

Compléter la preuve avec la référence opaque, l’issue affichée après reprise et les décomptes serveur. Utiliser exclusivement des dossiers fictifs. Ces scénarios restent à exécuter.

## Qualification de la route agent — #61 et #62

#61 raccorde le service via une configuration serveur staging explicite. Les routes publiques et le Worker par défaut restent fermés. #62 rapporte 128 tests locaux simulés, dont le rejeu HTTP à identifiant identique. L’activation et la recette dans Firebase staging ne sont pas établies par ces preuves.

- Avant NH-07, relever la PR, le SHA, le projet Firebase autorisé, le profil agent fictif et les décomptes initiaux. Exécuter deux demandes identiques avec la même référence et comparer la référence renvoyée, le dossier, le reçu et la trace d’audit.
- Ajouter NH-11 : une référence d’opération invalide est refusée avant transaction. Les décomptes dossier et reçu restent identiques. Vérifier que le message ne divulgue pas le contenu de la demande.
- Ajouter NH-12 : retirer l’affectation ou changer la période pendant une reprise. Vérifier le refus selon le périmètre en vigueur et l’absence de nouvelle inscription.
- Contrôle pédagogique distinct, lié à #63 : provoquer un échec de retrait de file locale après confirmation d’un envoi fictif. Vérifier que l’entrée demeure à reprendre et que l’interface ne la compte pas comme terminée. Reprendre puis contrôler l’état local et distant. Les 8 tests ciblés sont rapportés par la PR; la recette sur appareil reste à exécuter.
