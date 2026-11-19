# Lot 9 — Refonte comptable SYCEBNL de WAT Connect

**Organisation :** ONG Wafa Al-Turath (ONG WAT)  
**Module :** Finance  
**Statut :** cadrage fonctionnel et technique — à implémenter par étapes, non validé pour production.  
**Branche :** `audit/wat-connect-lot9-finances`

## 1. Décision de conception

WAT Connect vise une comptabilité générale complète fondée sur le **SYCEBNL**, avec journaux, grand livre, balance et états financiers annuels. Le registre actuel de recettes/dépenses constitue un outil de suivi opérationnel : il ne doit pas être présenté comme une comptabilité générale SYCEBNL.

Le système doit distinguer :
- la **comptabilité générale**, fondée sur le plan de comptes officiel SYCEBNL et les écritures en partie double ;
- la **comptabilité analytique**, qui suit les programmes, projets, activités, bailleurs, financements et budgets de WAT ;
- la **gestion de trésorerie**, qui suit les caisses, banques et comptes Mobile Money ;
- le **workflow de contrôle**, qui sépare saisie, validation, consultation et contrôle.

Les catégories actuelles « humanitaire », « éducation », « fonctionnement », « logistique », etc. sont des axes de gestion ou d'analyse. Elles ne doivent jamais être utilisées comme substituts aux numéros de comptes SYCEBNL. Attention : la classe 9 du plan SYCEBNL contient elle-même les comptes de contributions volontaires en nature et des comptes de comptabilité analytique ; elle doit donc être traitée selon ses règles propres, sans être confondue avec les axes analytiques complémentaires de WAT.

## 2. Référentiel normatif et points à confirmer

Références officielles de travail :
- Présentation officielle OHADA de l'Acte uniforme relatif au SYCEBNL (adopté le 22 décembre 2022, publié le 22 février 2023, en vigueur depuis le 1er janvier 2024) : https://www.ohada.org/acte-uniforme-relatif-au-systeme-comptable-des-entites-a-but-non-lucratif/
- Copie consultable du Journal officiel OHADA n° spécial du 22 février 2023, Acte uniforme et annexe SYCEBNL (422 pages ; plan des comptes détaillé, Partie 2, chapitre 2, pages imprimées 75 à 105) : https://www.ohada.com/uploads/actualite/6692/SYSCEBNL.pdf
- Notice OHADA précisant le champ d'application, les exclusions et l'existence du système normal et du système minimal de trésorerie : https://www.ohada.org/disponibilite-de-lacte-uniforme-relatif-au-systeme-comptable-des-entites-a-but-non-lucratif/
- Guide officiel d'application SYCEBNL : https://www.ohada.org/disponibilite-du-guide-dapplication-du-syscebnl/
- PDF officiel du guide : https://www.ohada.org/wp-content/uploads/2023/04/SYCEBNL-GUIDE-D-APPLICATION.pdf

**Choix de conception retenu : système normal.** L'article 5 pose le système normal comme régime de principe, sous réserve des exceptions liées à la taille. L'article 6 prévoit que les petites entités répondant aux seuils de ressources relèvent du système minimal de trésorerie (SMT), sauf option pour le système normal. Les seuils mentionnés sont de 30 000 000 FCFA pour chacune des catégories de ressources énumérées et la règle prévoit également l'examen des ressources cumulées sur deux exercices. La demande du responsable de WAT Connect est de construire une comptabilité complète : le logiciel sera donc conçu sur le système normal, correspondant à une option pour ce système si WAT est éligible au SMT. Le professionnel comptable de WAT devra confirmer formellement l'éligibilité, l'option à exercer, les obligations locales au Bénin et les modalités de dépôt/présentation avant la première clôture réglementaire.

Le plan de comptes détaillé est bien présent dans l'annexe officielle du Journal officiel OHADA : Partie 2, chapitre 2, Section 3 « Plan des comptes », pages imprimées 76 à 105 (la structure du plan commence à la page 75). Les comptes principaux, divisionnaires et comptes d'imputation doivent être extraits fidèlement. Les comptes de base d'imputation sont en principe à quatre chiffres, avec quelques comptes à cinq chiffres prévus pour le tableau des flux de trésorerie ; le texte autorise des subdivisions complémentaires respectant l'arborescence. Aucun numéro ni libellé ne doit être inventé ou importé d'un plan SYSCOHADA.

## 3. Architecture fonctionnelle cible

### 3.1 Référentiel comptable
- Plan de comptes SYCEBNL versionné : code, libellé officiel, classe, compte parent, niveau, compte imputable ou non, état actif/inactif, date d'effet et référence de source.
- Journaux comptables paramétrables : banque, caisse, opérations diverses et journaux auxiliaires requis par le référentiel et l'organisation.
- Exercices comptables, périodes mensuelles, dates d'ouverture et de clôture.
- Paramètres d'organisation : devise de tenue (FCFA/XOF), méthode de numérotation, pièces et séquences.

Les comptes de regroupement ne sont pas imputables. Une écriture ne peut viser qu'un compte terminal autorisé. Le plan est administré avec une piste d'audit et ne peut pas être réécrit rétroactivement après utilisation.

### 3.2 Saisie comptable en partie double
Chaque pièce comptable contient une ou plusieurs lignes. Chaque ligne comporte au minimum :
- compte général SYCEBNL ;
- libellé explicite ;
- montant au débit ou au crédit (jamais les deux sur la même ligne) ;
- date comptable et référence de pièce ;
- journal et exercice ;
- tiers lorsque pertinent ;
- dimensions analytiques facultatives ou obligatoires selon les règles de WAT : programme, projet, activité, bailleur/source de financement ;
- référence du justificatif.

Contrôles obligatoires :
- total débit = total crédit pour chaque pièce ;
- montants strictement positifs et précision conforme à la devise ;
- compte actif et imputable ;
- journal et période ouverts ;
- date cohérente avec l'exercice ;
- pièce justificative ou motif documenté selon la nature de l'opération ;
- absence de doublon de référence lorsque la séquence l'exige.

Une écriture comptabilisée est immuable. Une erreur est corrigée par une contrepassation ou une écriture de régularisation traçable, jamais par effacement silencieux.

### 3.3 Journaux, grand livre et balance
Le logiciel doit produire à partir des seules écritures comptabilisées :
- journaux par type, période et séquence ;
- grand livre par compte, avec report d'ouverture, mouvements débit/crédit et solde ;
- balance générale par compte avec soldes d'ouverture, mouvements de période et soldes de clôture ;
- consultation des pièces depuis chaque ligne et navigation entre journal, compte et pièce source.

Les totaux des journaux, du grand livre et de la balance doivent se réconcilier automatiquement. Les écritures en brouillon ou en attente de validation sont exclues des états officiels et clairement séparées.

### 3.4 États financiers et clôture
Pour WAT, dont le cadre institutionnel est celui d'une ONG constituée en association, le jeu complet d'états financiers annuels prévu à l'article 4 et à la Partie 4, chapitre 2 du SYCEBNL est : **bilan, compte de résultat, tableau des flux de trésorerie et notes annexes**. Les états spécifiques des projets de développement (tableau emplois-ressources, tableau d'exécution budgétaire, tableau de réconciliation de trésorerie, bilan, compte d'exploitation et notes annexes) concernent les entités ayant pour objet la gestion ou l'administration de projets de développement ; leur applicabilité à une activité/projet géré par WAT devra être examinée selon son statut, ses conventions et le référentiel. Les modèles officiels seront transcrits sans construire des états génériques d'entreprise.

La clôture comprend :
- contrôles de complétude et de cohérence ;
- contrôle des journaux et de la balance ;
- traitement des opérations d'inventaire et de régularisation nécessaires ;
- validation de clôture par une personne autorisée distincte du préparateur ;
- verrouillage de l'exercice ;
- report des soldes d'ouverture conformément au référentiel ;
- archivage de la version des états et de la piste d'audit.

### 3.5 Spécificités des entités sans but lucratif
Le modèle doit pouvoir traiter les opérations spécifiques prévues par le SYCEBNL et illustrées par le guide officiel, notamment :
- cotisations des membres et contributions des fondateurs ;
- dons en numéraire et en nature ;
- dons en nature destinés à être distribués ou vendus ;
- subventions et financements affectés ;
- fonds affectés ou reportés et ressources non consommées en fin d'exercice ;
- projets de développement ;
- immobilisations reçues ou financées par dons/subventions ;
- frais de recherche de fonds et autres opérations spécifiques.

Ces opérations ne doivent pas être enregistrées par une règle simpliste « recette = entrée d'argent / dépense = sortie d'argent ». Leur traitement doit être paramétré d'après les comptes, conditions et exemples du SYCEBNL, puis vérifié par le comptable.

Le registre des donateurs est obligatoire pour les dons, donations et legs reçus. L'article 17 précise les informations à conserver (date, identité et coordonnées du donateur selon sa qualité, montant et mode de libération) et prévoit que les écritures soient signées par le représentant légal. Le registre peut être physique ou électronique, mais doit être coté, paraphé et numéroté en continu par la juridiction compétente de l'État concerné. Le flux applicatif devra respecter ces exigences et permettre l'édition/signature réglementaire ; la procédure pratique au Bénin sera confirmée avant mise en service.

## 4. Comptabilité analytique et gestion WAT

Les dimensions analytiques de gestion WAT sont distinctes des axes et comptes analytiques prévus par le référentiel. Le plan SYCEBNL comprend neuf classes : classes 1 à 5 (bilan), classes 6 à 8 (gestion) et classe 9 (contributions volontaires en nature et comptabilité analytique). Les contributions volontaires significatives en nature suivies en classe 9 n'affectent pas le bilan ni le compte de résultat financier. Les dimensions analytiques complémentaires de gestion WAT sont :
- programme (ex. Nour Al-Hidaya) ;
- projet ;
- activité ;
- bailleur/donateur ;
- source de financement ;
- site/zone d'intervention ;
- budget et ligne budgétaire.

Un même compte comptable peut ainsi être ventilé entre plusieurs projets ou bailleurs. Les rapports de gestion ne modifient jamais les comptes généraux et ne remplacent pas les états financiers.

## 5. Modèle de données proposé

Nouvelles collections à concevoir après validation du schéma et des règles :
- `accountingChartVersions` et `accountingAccounts` : plan SYCEBNL versionné ;
- `accountingJournals` : journaux ;
- `accountingPeriods` : exercices et périodes ;
- `accountingEntries` : pièces comptables et statuts ;
- `accountingEntryLines` : lignes débit/crédit ;
- `accountingThirdParties` : tiers/donateurs/fournisseurs selon les besoins et droits ;
- `accountingDonorRegister` : registre réglementaire des donateurs ;
- `accountingAnalyticAxes` : axes analytiques ;
- `accountingClosures` : clôtures et instantanés d'états ;
- `accountingAuditLogs` : historique des actions comptables.

Ces noms sont des propositions d'architecture, pas des collections déjà créées. Le schéma final doit être validé avant toute migration.

## 6. Sécurité et séparation des responsabilités

Droits indépendants à prévoir :
- consultation des données financières ;
- préparation/saisie des pièces ;
- validation/comptabilisation ;
- administration du plan comptable et des journaux ;
- gestion des exercices et clôtures ;
- contrôle/audit en lecture seule.

Règles :
- le créateur d'une pièce ne peut pas la valider lui-même ;
- seules les écritures validées et comptabilisées alimentent les états ;
- aucune suppression physique d'une pièce comptabilisée ;
- journal d'audit non modifiable par les utilisateurs métier ;
- clôture impossible en présence d'écritures en attente ou de contrôles bloquants ;
- exports et justificatifs soumis aux mêmes périmètres d'accès ;
- les contrôles critiques doivent être imposés côté serveur/règles sécurisées, pas seulement dans l'interface.

### 6.1 Rôle dédié : contrôleur financier de l'ONG

Le rôle de **Contrôleur financier** est un profil central de gouvernance du module Finance. Il ne doit pas être oublié ni confondu avec le gestionnaire financier, le trésorier, le validateur opérationnel ou le responsable des budgets.

Missions dans WAT Connect :
- contrôler les recettes, dépenses, transferts, rapprochements, pièces justificatives et clôtures ;
- consulter les journaux, le grand livre, la balance, les comptes, les états financiers, les budgets et les rapports par projet, bailleur, période et affectation ;
- vérifier la cohérence entre pièces justificatives, opérations métiers et écritures comptables ;
- consulter l'historique des actions : auteur, dates, validation, rejet, contrepassation, modification autorisée et motif ;
- relever une anomalie, rédiger une observation, demander une explication ou signaler un dossier à corriger ;
- suivre la résolution des observations et produire un rapport de contrôle périodique exportable ;
- consulter les justificatifs GED dans la limite de son périmètre d'habilitation.

Limites et indépendance :
- accès de contrôle en lecture seule aux données comptables et financières ; possibilité d'ajouter des observations de contrôle dans un espace séparé et audité ;
- ne peut pas saisir ni modifier une opération financière, préparer une écriture, valider ou comptabiliser une pièce, effectuer un paiement ou un transfert, modifier un budget, lettrer/délettrer, rapprocher/valider un relevé bancaire ou clôturer un exercice ;
- ne peut pas effacer une observation ou une trace d'audit ; une observation peut être complétée ou clôturée avec une réponse documentée ;
- ne valide pas ses propres travaux et ne remplace pas le commissaire aux comptes ou l'auditeur externe lorsqu'ils sont requis ;
- ses accès peuvent être limités à une période, un projet, un bailleur, une caisse ou un compte, sans élargissement automatique à l'ensemble des données.

La désignation et le nombre des contrôleurs financiers relèvent des organes compétents de l'ONG. Le logiciel doit permettre plusieurs comptes utilisateurs portant ce rôle, sans imposer un nombre fixe. Les attributions nominatives et le périmètre exact sont configurés par une autorité habilitée et historisés.

### 6.2 Matrice de séparation des responsabilités

| Profil | Préparer/saisir | Valider/comptabiliser | Consulter les rapports | Contrôler/annoter | Administrer |
|---|---|---|---|---|---|
| Lecteur financier | Non | Non | Oui, selon périmètre | Non | Non |
| Gestionnaire financier | Oui | Non | Oui, selon périmètre | Non | Non |
| Validateur financier | Non sur ses propres pièces | Oui, si indépendant de l'auteur | Oui | Non | Non |
| Responsable des budgets | Préparer les budgets et propositions de révision | Validation budgétaire selon délégation, jamais sa propre demande | Oui | Suivi des écarts budgétaires | Non |
| Contrôleur financier de l'ONG | Non | Non | Oui, y compris historique et justificatifs autorisés | Oui, observations séparées et traçables | Non |
| Administrateur comptable | Paramétrage référentiel et exercices | Pas d'auto-validation des pièces | Oui | Suivi technique | Oui, dans les limites de délégation |

Les droits sont attribués par action et par périmètre, et non par simple accès à une page. Les contrôles serveur doivent refuser toute écriture non autorisée même si un utilisateur tente d'appeler directement Firebase ou une API. Le cumul de rôles ne doit pas permettre à une même personne de préparer et valider la même pièce, ni de contrôler une opération dont elle est l'auteur ou le validateur. Les droits d'un contrôleur financier sont distincts de ceux du commissaire aux comptes externe et ne lui confèrent pas automatiquement une qualité légale d'auditeur.

## 7. Migration du registre Finance actuel

Le module existant contient déjà recettes/dépenses, budgets, comptes de trésorerie, transferts, rapprochements, rapports donateurs/projets et clôtures. Ces fonctions restent utiles mais ne forment pas encore un grand livre en partie double.

Plan de transition :
1. conserver le registre actuel comme source opérationnelle historique, en lecture seule lors de la bascule ;
2. ne pas transformer automatiquement une ancienne recette ou dépense en écriture comptable sans pièce, compte, justification et validation comptable ;
3. permettre une reprise d'ouverture contrôlée à partir d'une balance certifiée ou validée ;
4. rapprocher les soldes d'ouverture des caisses et banques avec les pièces de reprise ;
5. conserver le lien entre opération d'origine et pièce comptable correspondante ;
6. documenter les opérations non reprises et les écarts.

## 8. Phasage de réalisation et critères de sortie

**Phase 0 — Sources et paramétrage**
- obtenir/extraire l'annexe officielle du plan de comptes et les modèles d'états ;
- utiliser `scripts/extract-sycebnl-chart.mjs` pour extraire localement les neuf classes depuis les pages publiques de transcription ; le fichier généré `data/sycebnl-chart.review.json` reste en statut de revue et ne doit pas alimenter les écritures ;
- comparer avec la copie de référence de WAT ;
- faire valider le régime et les traitements par un professionnel comptable ;
- figer une version de référence des données normatives.

**Phase 1 — Fondations**
- plan de comptes versionné, journaux, exercices et périodes ;
- droits, séquences, pièces et piste d'audit ;
- tests de règles et de sécurité.

**Phase 2 — Moteur comptable**
- brouillon, soumission, validation et comptabilisation ;
- équilibre débit/crédit ;
- contrepassation et régularisation ;
- tests de cas comptables SYCEBNL du guide officiel.

**Phase 3 — Livres**
- journaux, grand livre, balance ;
- réconciliation automatique des totaux ;
- filtres, exports et impression.

**Phase 4 — Opérations spécifiques EBNL**
- dons, cotisations, subventions, fonds affectés/reportés, apports en nature, projets ;
- registre des donateurs ;
- axes analytiques et rapprochements avec budgets.

**Phase 5 — Inventaire, clôture et états financiers**
- contrôles de fin d'exercice ;
- clôture verrouillée ;
- report à nouveau/ouverture ;
- états financiers et annexes conformes aux modèles applicables.

**Critères avant toute mise en service réelle :**
- aucun compte inventé ou importé d'un plan SYSCOHADA générique ;
- jeux de tests validés à partir du guide officiel ;
- égalité débit/crédit garantie côté serveur ;
- grand livre et balance réconciliés ;
- états financiers rapprochés des modèles officiels ;
- revue par le professionnel comptable de WAT ;
- sauvegarde/restauration vérifiée ;
- environnement de test Firebase séparé de la production.

## 9. Limites connues à ce stade

- Le module Finance existant n'est pas encore une comptabilité générale SYCEBNL.
- Un extracteur local a été ajouté (`scripts/extract-sycebnl-chart.mjs`). Son premier passage automatisé a parcouru les neuf pages de classe et extrait 1 133 comptes : classe 1 = 86, classe 2 = 279, classe 3 = 49, classe 4 = 224, classe 5 = 75, classe 6 = 261, classe 7 = 96, classe 8 = 46, classe 9 = 17. La page d'accueil de la transcription annonce 1 142 comptes, tandis qu'une autre transcription annonce 1 130 : les neuf comptes d'écart avec le total de la page d'accueil et les différences par classe doivent être résolus à partir du Journal officiel et de la copie détenue par WAT. Le JSON est publié comme artefact de revue, pas comme référentiel actif.
- Le régime légal effectivement applicable à WAT et les états précis à produire restent à confirmer avec un professionnel comptable au Bénin.
- L'environnement Preview Cloudflare utilise actuellement le projet Firebase `wat-connect` : aucune donnée réelle ni écriture financière réelle ne doit être saisie depuis la prévisualisation tant que l'isolation backend n'est pas établie.
- Ce document est un cadrage de développement. Il ne constitue ni une certification de conformité, ni un avis comptable ou juridique.

## 10. Périmètre fonctionnel complémentaire demandé pour WAT Connect

Les fonctionnalités suivantes font désormais partie du périmètre cible du module Finance. Elles seront réalisées par couches, en conservant une source comptable unique et des liens de traçabilité entre les opérations métiers et leurs écritures.

### 10.1 Plan comptable SYCEBNL
- Consultation arborescente par classe, compte parent et sous-compte, recherche par code ou libellé.
- Fiche de compte : code, libellé normatif, classe, niveau, compte imputable, statut, dates d'effet et historique.
- Import uniquement d'une version de plan rapprochée du Journal officiel OHADA et validée ; aucune transcription secondaire ne devient automatiquement officielle.
- Gestion des subdivisions internes sans altérer les comptes normatifs, avec contrôle de leur conformité à l'arborescence.
- Toute modification du référentiel est versionnée et auditée.

### 10.2 Saisie d'opérations et journal comptable
- Saisie manuelle guidée et génération assistée depuis les modules métiers (factures, stocks, banque, caisse, dons).
- Brouillon, soumission, validation indépendante, comptabilisation, contrepassation et régularisation.
- Pièces multi-lignes, tiers, échéances, axes analytiques, référence et justificatifs.
- Journaux filtrables par exercice, période, journal, compte, tiers, projet, statut et numéro de pièce.
- Une opération métier ne produit pas de doublon si elle est retraitée ; chaque pièce générée conserve son identifiant de source.

### 10.3 Grand livre, balance et interrogation des comptes
- Balance générale avec soldes d'ouverture, mouvements débit/crédit et soldes de clôture.
- Grand livre détaillé par compte avec solde progressif, regroupement par période et accès à la pièce d'origine.
- Interrogation d'un compte : solde à une date, mouvements, contreparties, tiers, projet, pièces et justificatifs.
- Navigation descendante depuis les états vers le compte, le journal, l'écriture puis la pièce GED.
- Contrôle de concordance automatique entre journaux, grand livre et balance.

### 10.4 Lettrage des comptes
- Lettrage manuel et proposition automatique pour les comptes et tiers concernés.
- Règles de rapprochement : montant, devise, tiers, référence, échéance et tolérance autorisée.
- Lettrage partiel et délettrage réservé aux rôles autorisés, avec motif et journal d'audit.
- Les différences, avances, acomptes et règlements partiels restent visibles ; le lettrage ne modifie jamais les montants des écritures.
- Ne pas appliquer indistinctement le lettrage à tous les comptes : les comptes éligibles seront paramétrés selon leur nature.

### 10.5 Rapprochement bancaire et trésorerie
- Import contrôlé des relevés bancaires (CSV/format bancaire disponible) et saisie manuelle en secours.
- Correspondance entre lignes de relevé et mouvements comptabilisés, rapprochement partiel, frais bancaires et opérations en suspens.
- État de rapprochement daté, préparé puis validé par une autre personne.
- Écarts expliqués, non effacés ; historique des rapprochements conservé.
- Les soldes de banque ne sont jamais ajustés par une simple modification de formulaire : toute correction doit produire une écriture autorisée et traçable.

### 10.6 GED et archivage des pièces
- Référentiel documentaire sécurisé : facture, reçu, convention, relevé bancaire, preuve de paiement, bon d'entrée/sortie, inventaire, procès-verbal et pièce comptable.
- Métadonnées : type, numéro, date, tiers, montant, exercice, projet, compte lié, auteur, niveau de confidentialité et durée de conservation.
- Fichiers conservés dans un stockage objet privé, avec règles d'accès, liens temporaires, contrôle de type/taille, empreinte d'intégrité et journal des consultations/téléchargements.
- Une pièce comptabilisée ne peut pas perdre son justificatif par suppression silencieuse ; remplacement et versionnement doivent être auditables.
- Les références de fichiers seules dans Firestore ne constituent pas un archivage sécurisé : l'intégration GED exige un stockage privé et des règles serveur.

### 10.7 Module Stock
- Articles, catégories, unités, dépôts/magasins, fournisseurs et seuils d'alerte.
- Mouvements : réception, sortie, transfert, retour, ajustement d'inventaire et pertes documentées.
- Bons de réception/sortie, inventaires physiques, historique par article et par dépôt.
- Valorisation, méthode de coût, traitement des dons en nature et correspondance comptable à valider avec le SYCEBNL et le professionnel comptable avant activation.
- Chaque mouvement validé doit être traçable vers son document et, lorsqu'il a un impact comptable, vers l'écriture correspondante.
- Les quantités et valeurs historiques ne sont pas modifiables directement ; les corrections passent par des mouvements d'ajustement autorisés.

### 10.8 Facturation normalisée
- Référentiel clients/tiers, articles ou services, devis si nécessaire, factures, avoirs, acomptes, échéances et règlements.
- Numérotation contrôlée, conservation des versions, calculs vérifiés et interdiction de supprimer une facture émise.
- Champs fiscaux et mentions obligatoires configurables selon la réglementation béninoise en vigueur et la catégorie d'opération.
- Prévoir une couche d'intégration avec la plateforme officielle de facturation normalisée/e-MECeF si l'accès technique et les conditions réglementaires le permettent ; ne pas simuler une certification ni générer de faux identifiants fiscaux.
- Une facture validée ou un règlement peut alimenter la comptabilité après contrôles, avec lien réciproque entre facture, règlement, pièce comptable et justificatifs.
- Le périmètre exact (vente de biens, prestations, exonérations, reçus de dons et autres documents) devra être configuré selon les activités réelles de WAT et validé par le comptable/fiscaliste.

### 10.9 Système minimal de trésorerie (SMT) et système normal (SN)
- Paramètre de régime comptable par entité et par exercice : SMT ou SN, avec date d'effet, justification, validation et historique.
- Le SMT et le SN ne sont pas deux thèmes d'affichage : ils impliquent des obligations, livres, traitements et états distincts définis par le SYCEBNL.
- Le moteur SN comprend la comptabilité générale en partie double, les livres et les états financiers du système normal.
- Le parcours SMT doit être conçu à partir des dispositions et modèles spécifiques du SYCEBNL ; il ne doit pas être présenté comme une simple balance de caisse ni réutiliser automatiquement les états du SN.
- Toute migration SMT vers SN exige une procédure d'ouverture/reprise documentée, des soldes et pièces de transition, une date de bascule et une validation professionnelle.
- WAT Connect est conçu pour supporter le SN complet demandé. Le choix effectif du régime applicable à WAT reste à formaliser avec le professionnel comptable au regard des seuils, options et obligations au Bénin.

### 10.10 Ordre de réalisation proposé
1. Stabiliser le plan de comptes officiel, les exercices, journaux, droits et environnement de test isolé.
2. Finaliser le moteur de saisie/validation/comptabilisation côté serveur.
3. Produire journaux, grand livre, balance et interrogation des comptes à partir des seules écritures comptabilisées.
4. Ajouter lettrage et rapprochement bancaire, puis GED sécurisée.
5. Ajouter le module Stock avec inventaire et valorisation comptable validée.
6. Ajouter facturation normalisée et intégration officielle éventuelle, après validation fiscale.
7. Produire les états financiers applicables au régime retenu, avec clôture et contrôles de conformité.

**Dépendances bloquantes :** aucun de ces écrans ne doit écrire de vraies données financières dans le projet Firebase de production depuis la prévisualisation. Les écritures définitives doivent passer par un service serveur transactionnel, qui contrôle les droits, la période, les comptes, l'équilibre, l'unicité et l'immutabilité. Les fichiers GED doivent être stockés dans un espace privé. Les intégrations fiscales ou bancaires ne seront activées qu'après vérification des interfaces officielles et des autorisations nécessaires.

