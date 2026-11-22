# Parcours réel d'inscription — Nour Al-Hidaya

**Statut :** spécification UX à implémenter dans NH-1; aucune inscription réelle n'est activée par ce document.

## Principe pour le bénéficiaire

Le bénéficiaire n'a pas à connaître WAT Connect et ne doit pas être obligé de créer un compte WAT Connect.

### Parcours depuis l'APK Nour Al-Hidaya

1. Sur l'écran d'accueil de Nour Al-Hidaya, afficher une action visible : **« S'inscrire à Nour Al-Hidaya »**.
2. L'action ouvre une page publique sécurisée, adaptée au téléphone, avec l'identité visuelle Nour Al-Hidaya. Le nom WAT Connect n'est pas une étape technique demandée au bénéficiaire.
3. Le formulaire demande uniquement les informations nécessaires au dossier d'inscription, avec un parcours adapté aux mineurs et à leur représentant légal.
4. Le choix d'une mosquée ou d'un site est facultatif. L'absence d'agent, de mosquée, d'adresse e-mail ou de compte Firebase Auth ne bloque pas une demande publique.
5. Après envoi, la personne reçoit une confirmation et une référence de suivi. Le dossier reste **« En attente de vérification »**; l'envoi ne vaut pas admission.
6. L'équipe habilitée examine et traite le dossier dans WAT Connect. Les corrections, décisions et rapprochements éventuels sont tracés.
7. Après validation, l'accès apprenant à l'APK est activé selon un mécanisme d'accès apprenant distinct des comptes de l'équipe WAT. Ce mécanisme doit être conçu et testé avant d'annoncer une connexion automatique.

## Autres points d'entrée

Le même formulaire public doit être accessible par :
- un lien partagé sur WhatsApp;
- le site institutionnel WAT;
- un QR code sur les supports d'information;
- l'action d'inscription depuis l'APK.

Tous ces points d'entrée appellent le même service serveur et créent un dossier dans le même registre central. Aucun canal ne possède sa propre base de bénéficiaires.

## Parcours agent

Un agent connecté ouvre le module Nour Al-Hidaya dans WAT Connect et crée le dossier au nom du bénéficiaire. Le serveur vérifie les droits et le périmètre de l'agent. L'agent ne doit pas utiliser un formulaire public pour contourner ses permissions.

## Exigences techniques et de sécurité

- Le formulaire public est une page de présentation et de saisie; il ne reçoit jamais de privilège Firestore.
- L'envoi passe par l'API serveur NH-1; les validations, contrôles anti-abus et écritures sont exécutés côté serveur.
- Une réponse de confirmation ne révèle pas si un dossier similaire existe déjà.
- Les répétitions de requête ne doivent pas créer plusieurs dossiers pour le même envoi (clé d'idempotence).
- Aucun rapprochement de doublons ni aucune fusion automatique.
- Les informations personnelles des mineurs sont minimisées et protégées.
- L'interface doit être utilisable sur Android, faible débit et petits écrans.
- La page publique peut être ouverte dans le navigateur intégré de l'APK ou le navigateur du téléphone. Une intégration entièrement embarquée pourra être envisagée après validation du fonctionnement et de la sécurité.
- Le formulaire et les messages doivent être disponibles au minimum en français; les besoins linguistiques seront confirmés depuis le cahier des charges.

## État actuel vérifié

Le portail WAT Connect actuel indique encore que les apprenants créent leur compte depuis Nour Al-Hidaya et le code de connexion accepte un profil Firebase Auth de rôle `apprenant`. Ce comportement existant ne constitue pas le nouveau parcours public centralisé. Il devra être harmonisé pendant NH-1, sans couper les comptes existants ni déplacer des données réelles sans plan de migration validé.

Le prototype précédemment audité repose sur des données locales de démonstration. Le bouton et le formulaire décrits ici ne sont donc pas présentés comme déjà fonctionnels.

## Critères d'acceptation

1. Une personne peut commencer dans l'APK sans connaître WAT Connect.
2. Une personne sans compte, sans e-mail et sans mosquée peut soumettre une demande si les champs indispensables validés le permettent.
3. Une personne hors mosquée peut s'inscrire seule.
4. Une inscription publique, une inscription agent et les liens/QR partagent le même registre central.
5. Seuls les agents habilités et administrateurs peuvent consulter les dossiers dans WAT Connect.
6. Le bénéficiaire reçoit une référence, sans promesse d'admission avant examen.
7. Les comptes apprenants existants ne sont pas supprimés ni migrés automatiquement.
