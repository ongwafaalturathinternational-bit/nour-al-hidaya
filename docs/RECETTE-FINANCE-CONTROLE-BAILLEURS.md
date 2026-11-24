# Finance — dossier fictif de contrôle et restitution
24 novembre 2026 · Recette sur table · À rejouer sur une version staging identifiée après validation du lot 8.

Complément au modèle de demande d’achat de #36 et à la matrice #41. Le périmètre observé dans #12 comprend les flux de trésorerie validés, les transferts internes, les opérations en nature et les rapprochements. Les fiches ci-dessous sont des références de recette, sans données ni mouvement réel.

## Jeu de référence et résultats calculés

| Pièce | Mouvement fictif | Statut | Effet attendu |
|---|---|---|---|
| OUV-01 | Caisse 100 000 XOF; Mobile Money 0 XOF | Soldes d’ouverture | Base de trésorerie 100 000 XOF |
| REC-01 | Recette projet A, 50 000 XOF, caisse | Validée | +50 000 XOF en caisse |
| DEP-01 | Dépense projet A, 15 000 XOF, caisse | Validée | −15 000 XOF en caisse |
| DEP-02 | Dépense projet A, 9 000 XOF, caisse | Soumise | Aucun effet sur le réalisé ni sur les soldes |
| NAT-01 | Contribution en nature projet A, valorisée à 12 000 XOF | Validée | Rapport en nature distinct; aucun encaissement |
| TRF-01 | Caisse vers Mobile Money, 20 000 XOF | Validé | Caisse −20 000 XOF, Mobile Money +20 000 XOF; aucun flux externe |

Attendus : caisse **115 000 XOF**, Mobile Money **20 000 XOF**, trésorerie totale **135 000 XOF**. Le flux externe net est **35 000 XOF**. La contribution en nature figure séparément à **12 000 XOF**. Pour une enveloppe de projet fictive de 40 000 XOF ciblant la catégorie de DEP-01/02, le réalisé validé attendu est **15 000 XOF** et le disponible d’après réalisé **25 000 XOF**. Un affichage des engagements doit distinguer les 9 000 XOF soumis.

## Contrôles à relever

1. Vérifier la concordance des filtres, du total affiché et du CSV sur la même période et le même projet. Conserver l’identifiant de filtre et la preuve anonymisée.
2. Tenter de valider DEP-02 en tant qu’auteur; relever le refus et vérifier le statut. Tester la validation par un autre profil fictif habilité séparément du jeu de référence.
3. Si la caisse constatée est de 113 000 XOF, le rapprochement doit faire apparaître un manque de 2 000 XOF en valeur absolue. Enregistrer le sens de l’écart et vérifier que le rapprochement ne modifie aucun solde.
4. Contrôleur financier : rapprocher les références, la séparation des rôles et les pièces. Le lot #12 référence les justificatifs; la présence d’une référence ne prouve pas le dépôt d’un fichier.
5. Restitution bailleur : préparer un extrait par période, projet et financement, en séparant les natures et la trésorerie. Relever les champs à masquer et faire vérifier le document avant toute diffusion externe. Les rapports bailleurs avancés restent hors du périmètre attesté de #12.

Fiche de preuve : [cas] [SHA] [profil] [filtre] [attendu] [observé] [écart] [référence de preuve]. Les valeurs calculées ci-dessus constituent les résultats attendus; la recette de l’application et la validation réglementaire SYCEBNL restent distinctes.
