# Exigences fonctionnelles GED Finance et Achats

24 novembre 2026 · Proposition pour revue · Exemples fictifs · Périmètre documentaire Work.

## Point de départ observé

- Les PR Finance #12 et #69–71 couvrent des registres de flux, validations, soldes, exports et rapprochements. #71 partage le calcul de solde; cela ne qualifie pas un grand livre en partie double ni un générateur d’états normalisés.
- Les PR de registres #72–75 et d’Agenda #76–82 sont en cours de coordination. Réutiliser les identifiants existants et les références d’événement. Les parcours achats, fournisseurs, contrats et GED ci-dessous restent à qualifier.
- Le régime comptable choisi, les seuils d’achat, les délégations, le calendrier de conservation et les modèles émis doivent pouvoir être versionnés. Leur activation dépend des validations institutionnelles et professionnelles.

## Finance

| ID | Type | Exigence fonctionnelle | Recette fictive |
|---|---|---|---|
| FIN-01 | Normatif selon régime | Plan général versionné issu de la nomenclature SYCEBNL, distinct du moyen de paiement, du projet et du bailleur. Écriture équilibrée et pièce de référence selon le régime. | Une imputation non approuvée est refusée. Le transfert interne est neutre en revenu et dépense. |
| FIN-02 | Normatif selon régime | Produire les états de l’entité selon le régime et le type d’entité comptable validés. Journal, grand livre, balance et clôture doivent rester rapprochables. | Une clôture ne valide ni un déséquilibre ni des états incompatibles avec le régime. Historique et exports relus par un profil distinct. |
| FIN-03 | Normatif | Registre des donateurs à accès restreint; conserver qualification, pièce, restrictions et reçu. Distinguer caisse et nature. | Une contribution en nature n’augmente aucun compte de trésorerie; elle reste retraçable dans le registre. |
| FIN-04 | Contrôle interne | Séparer engagement, réception, paiement, imputation, visa et revue de rapprochement. Autoriser accès indépendant en lecture au contrôle. | L’auteur ne valide pas son opération; un rapprochement ne crée aucune écriture. |
| FIN-05 | Contractuel ou interne | Relier convention, tranches, restrictions, plan de financement, échéances et rapport bailleur. Exports limités aux périmètres. | L’extrait d’un projet ne contient aucune ligne d’une autre convention. |

Références : Acte uniforme SYCEBNL, art. 4–6 pour les états et le régime, art. 18 pour le registre des donateurs, annexes pp. 75–105 et p. 433. Les comptes et opérations détaillés seront validés avant tout paramétrage.

## Achats et contrats

- ACH-01 : rattacher le besoin à un budget et préciser le régime applicable et la convention bailleur. Soumettre l’exception urgente à justification et visa. Les seuils et exceptions sont des paramètres à approuver.
- ACH-02 : réception horodatée des offres, accès cloisonné, critères publiés, déclaration de conflit, récusation, tableau des notes, décision, pièces d’attribution. L’offre perdante reste inaccessible hors habilitation.
- ACH-03 : registre prestataires et contrats, durée annuelle ou triennale lorsque autorisée, plafond, commande, réception, facture, échéance, avenants et suivi des prestations. Recetter le blocage d’un bon après expiration, au-delà de son plafond ou sans budget.
- ACH-04 : préparer renouvellement, remise en concurrence ou résiliation avec décision et motifs. Le seul écoulement du temps ne doit pas prolonger un contrat.

## GED et registres

- GED-01 : document maître attaché à des dossiers par références. Tracer original, versions, émetteur, source, empreinte, statut, visas et période d’effet. Recherche, aperçu, téléchargement et restauration suivent le même périmètre.
- GED-02 : classer par instance, service, fonction, projet et confidentialité. Séparer espaces de travail, archives en lecture, coffre nominatif restreint et publications. Recetter retrait de mandat, partage bailleur circonscrit et conservation des preuves de contrôle.
- GED-03 : courrier reçu → affectation → réponse visée → preuve d’émission → archive. Les décisions relient réunion, version de PV, action, échéance et preuve de clôture.
- GED-04 : émettre référence et QR après validation. La vérification affiche des métadonnées minimales et distingue valide, remplacé, annulé, expiré ou inconnu. Contrôler l’intégrité du fichier présenté avec l’empreinte de référence dans une zone autorisée. Aucun document privé rendu public par QR.
- GED-05 : modèles éditables par version, préremplis selon habilitation. Associer le PDF final à la version du modèle et aux approbations. Tester que la révision d’un modèle ne modifie pas un PDF déjà émis.

Ordre proposé : identifiants et habilitations → versions GED et pièces → achats et conventions → contrôle comptable et restitution → recette intégrée sur données fictives. Ce document ne prescrit aucune modification d’architecture ou de code.
