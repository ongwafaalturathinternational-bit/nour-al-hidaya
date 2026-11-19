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

Les catégories actuelles « humanitaire », « éducation », « fonctionnement », « logistique », etc. sont des axes de gestion ou d'analyse. Elles ne doivent jamais être utilisées comme substituts aux numéros de comptes SYCEBNL.

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

Les dimensions analytiques sont distinctes du plan comptable :
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
- Le plan de comptes détaillé est identifié dans la copie consultable du Journal officiel OHADA (pages imprimées 76 à 105) ; son extraction structurée, la vérification de chaque compte et son import dans l'application restent à réaliser.
- Le régime légal effectivement applicable à WAT et les états précis à produire restent à confirmer avec un professionnel comptable au Bénin.
- L'environnement Preview Cloudflare utilise actuellement le projet Firebase `wat-connect` : aucune donnée réelle ni écriture financière réelle ne doit être saisie depuis la prévisualisation tant que l'isolation backend n'est pas établie.
- Ce document est un cadrage de développement. Il ne constitue ni une certification de conformité, ni un avis comptable ou juridique.
