# Recette fonctionnelle Agenda — réservation et rapprochement
24 novembre 2026 · Jeux fictifs uniquement · Complément aux scénarios Agenda du journal Work.

Filiation #49 → #51 → #52 → #53. Les Actions Firestore de ces quatre PR ont réussi aux exécutions 45306105704, 45306552055, 45314290017 et 45314765962. Le transport est simulé dans les PR examinées. Aucun résultat de distribution réelle n’est établi.

| Cas | Mise en situation | Preuve attendue |
|---|---|---|
| AG-01 — deux traitements | Révision 3, destinataire éligible, deux traitements concurrents | Un reçu et au plus un appel du transport pour la même clé opaque. |
| AG-02 — révision caduque | Remplacer la révision 3 par la 4 avant réservation | Révision 3 rejetée; aucune tentative sur la clé de l’ancienne révision. |
| AG-03 — désinscription | Révoquer le consentement avant la réservation | Ni réservation ni appel au transport pour ce destinataire. |
| AG-04 — résultat incertain | Faire expirer la réponse après l’appel transport | Reçu incertain; une réexécution ne déclenche aucun nouvel appel d’envoi. Relever l’absence de confirmation. |
| AG-05 — confirmation tardive | Rapprocher AG-04 avec un reçu confirmé par la même clé, puis simuler une mise à jour tardive du premier traitement | Acceptation conservée, aucun renvoi; la preuve du transport ne vaut pas preuve d’affichage sur téléphone. |
| AG-06 — rapprochement sans réponse | Le transport ne retrouve pas la clé | L’incertitude demeure; aucun renvoi automatique. Inscrire le cas à examiner. |
| AG-07 — accès et confidentialité | Consulter avec un profil client non habilité et lire la notification sur un appareil de test | Les reçus privés restent inaccessibles; le texte sur l’écran verrouillé ne contient aucun détail confidentiel. |

Fiche à remplir : [cas] [SHA] [environnement] [révision] [empreinte de clé anonymisée] [état avant/après] [nombre d’envois] [preuve] [écart]. Pour la recette intégrée, il faudra un fournisseur interrogeable par clé, une configuration staging isolée et des appareils de test autorisés. Enregistrer séparément réservation, acceptation transport et affichage effectif.
