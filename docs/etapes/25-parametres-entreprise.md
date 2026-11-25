# Étape 25 — Paramètres de l'entreprise

**Date** : 2026-11-18
**Référence cahier des charges** : ENT-08 (identité visuelle, contacts, informations légales), ENT-11 (coordonnées de reversement vérifiées), ENT-12 (paiement hors plateforme), RG-19 (journal d'audit), RG-23 (reversement vers des coordonnées vérifiées).

## Constat

Le modèle `Tenant` portait déjà `branding`, `legalInfo`, `contactEmail`, `contactPhone`, `payoutAccount`, `payoutAccountVerified`, `offlinePaymentEnabled` et `offlinePaymentInstructions`, mais aucune route ni aucun écran ne les modifiait (la page Paramètres de l'espace Entreprise disait explicitement ne rien pouvoir éditer). De plus, la demande de reversement acceptait n'importe quelle destination saisie dans le corps de la requête : le commentaire du code laissait la vérification des coordonnées « à la charge de l'appelant », et personne ne la faisait.

## Choix de conception (pris sans consultation, à valider)

1. **Nouvelle permission `settings.manage`**, donnée au Propriétaire **et** au Gestionnaire (demande du cahier de mission). Le code historique réservé `tenant-settings.manage` du Propriétaire est conservé tel quel, sans effet.
2. **Quatre routes `PUT` distinctes** (identité visuelle, contacts et légal, hors plateforme, reversement) plutôt qu'une seule : chaque onglet enregistre indépendamment, et la ré-authentification n'est demandée que pour le reversement.
3. **Le tenant vient toujours du jeton**, jamais de l'URL ni du corps : une entreprise ne peut ni lire ni modifier celle d'une autre (il n'existe aucun chemin pour viser un autre tenant côté `business/settings`).
4. **Le « nom d'affichage » est `Tenant.name`** (celui lu par `/public/tenant`). Modifier ce nom ne change pas le sous-domaine (`slug`).
5. **Branding compatible** : on écrit `branding.logoUrl`, `branding.primaryColor`, `branding.secondaryColor` (premières formes lues par `public-branding.ts`) ; les anciennes clés `logo`, `primary`, `colors` sont retirées à l'enregistrement pour qu'une valeur effacée ne soit pas « ressuscitée » par une forme héritée ; les autres clés sont conservées.
6. **Logo : `https` uniquement** (ni `http:`, `javascript:`, `data:`, ni identifiants dans l'URL), 500 caractères maximum. Couleurs : **`#RRGGBB` strict** (les formes 3/4/8 chiffres, tolérées en lecture publique, sont refusées en écriture).
7. **Hors plateforme** : instructions en **texte brut** ≤ 2000 caractères ; balises et chevrons sont retirés côté serveur, retours à la ligne conservés. Activer exige des instructions non vides (sinon l'apprenant verrait un mode sans consigne).
8. **Reversement** : type `MOBILE_MONEY` (opérateur `ORANGE_MONEY`, `MTN_MOMO`, `MOOV_MONEY` ou `WAVE`, numéro de 8 à 15 chiffres) ou `BANK` (IBAN contrôlé par la clé modulo 97, ou RIB à 23 caractères avec contrôle de la clé RIB) ; titulaire obligatoire. **Mot de passe actuel exigé** (argon2, via `UsersFacade.verifyPassword`) ; refus = `MOT_DE_PASSE_INCORRECT` (HTTP 400, volontairement pas 401 pour ne pas déconnecter le front). Le numéro est **chiffré au repos** (AES-256-GCM, `secrets-cipher`, donc `SECRETS_ENCRYPTION_KEY`) ; seuls les 4 derniers caractères sont stockés en clair (`last4`) pour le masque `***1234`. **Toute modification remet `payoutAccountVerified` à `false`**.
9. **Vérification par l'Admin** : `GET /admin/tenants/:id/payout-account` (permission `tenants.read`) et `POST .../verify` (**nouvelle permission `payout-accounts.verify`**, donnée au Super Administrateur). Vérifier sans compte renseigné est refusé.
10. **Reversement refusé tant que le compte n'est pas vérifié** (`COMPTE_REVERSEMENT_NON_VERIFIE`, HTTP 400), via `TenantsFacade.getVerifiedPayoutDestination`. **Décision plus large : la destination du reversement est désormais TOUJOURS le compte enregistré et vérifié**, et non la saisie du corps de requête (sinon la vérification serait contournable en saisissant un autre numéro). Le DTO `RequestPayoutDto` garde ses trois champs mais **optionnels et ignorés** (compatibilité des anciens clients). Le contrôle est dans `RequestPayoutUseCase`, donc il vaut aussi pour la tâche de reversement automatique.
11. **Journal d'audit** : événement `tenant.settings-changed` (`tenantId`, `actorId`, `changedFields`) qui ne contient **que des noms de champs** (`displayName`, `logoUrl`, `payoutAccount`, `payoutAccountVerified`…), jamais une valeur. Rien n'est écrit ni émis si rien n'a changé. Le journal d'audit de l'entreprise le voit (action `tenant.settings-changed`).
12. **Learning** : `/public/tenant` expose en plus `offlinePaymentEnabled` et `offlinePaymentInstructions` (liste blanche stricte : `name`, `slug`, `branding`, ces deux champs ; les instructions valent `null` si le mode est désactivé ou vide).

## Backend

| Fichier | Rôle |
| --- | --- |
| `tenants/domain/tenant-settings.ts` | Règles pures : normalisation et validation (https, `#RRGGBB`, e-mail, téléphone, assainissement du texte, IBAN, RIB, Mobile Money), masque, noms des champs modifiés, erreurs typées `PARAMETRES_INVALIDES` et `COMPTE_REVERSEMENT_NON_VERIFIE`. |
| `tenants/application/tenant-settings.use-cases.ts` | Lecture (compte masqué), mise à jour identité / contacts / hors plateforme, mise à jour du compte de reversement (mot de passe, chiffrement, remise à « non vérifié », événement). |
| `tenants/application/payout-account-admin.use-cases.ts` | Consultation masquée et vérification côté Admin. |
| `tenants/presentation/business-settings.controller.ts`, `admin-tenant-payout-account.controller.ts`, `dto/tenant-settings.dto.ts` | Routes `business/settings` (GET, PUT `branding`, `contacts`, `offline-payment`, `payout-account`) et `admin/tenants/:id/payout-account` (GET, POST `verify`). |
| `tenants/tenants.facade.ts`, `tenants.events.ts`, entité, port et dépôt Prisma | `getVerifiedPayoutDestination` (déchiffre, jamais exposé hors de wallets), profil public élargi, `TenantSettingsChangedEvent`, `findSettings` / `updateSettings`. |
| `users/application/verify-user-password.use-case.ts`, `domain/password-hash-reader.port.ts`, `infrastructure/password-hash.prisma-reader.ts`, `UsersFacade.verifyPassword` | Ré-authentification. Port **séparé** de `UserRepositoryPort` pour ne pas casser les fausses implémentations des tests existants. |
| `audit/application/audit-sensitive-events.listener.ts` | Écoute `tenant.settings-changed`. |
| `wallets/application/request-payout.use-case.ts`, `presentation/business-wallet.controller.ts`, `dto/request-payout.dto.ts` | Refus si compte non vérifié, destination = compte enregistré. |
| `users/domain/default-tenant-roles.ts`, `default-platform-roles.ts` | Permissions `settings.manage` et `payout-accounts.verify`. |

## Interfaces

- **Entreprise** (`business/src/features/settings/`) : page Paramètres à onglets : *Identité visuelle* (nom, URL du logo avec aperçu, deux couleurs avec aperçu), *Contacts et légal*, *Paiement hors plateforme* (interrupteur, compteur de caractères), *Reversement* (état « vérifié / non vérifié », compte masqué, formulaire avec mot de passe vidé après chaque tentative), *Général* (abonnement et apparence, repris de l'ancienne page). Un utilisateur sans `settings.manage` voit un message d'accès refusé. La fenêtre « Demander un reversement » du portefeuille n'a plus de champs : elle renvoie vers Paramètres et explique l'erreur `COMPTE_REVERSEMENT_NON_VERIFIE`.
- **Admin** (`admin/src/features/tenants/`) : carte « Compte de reversement » dans la fiche entreprise (numéro masqué, état, bouton « Marquer comme vérifié » avec confirmation, visible avec `payout-accounts.verify`).
- **Learning** : encadré « Instructions de paiement de l'organisme » affiché quand l'apprenant choisit « Payer hors plateforme » (page de formation), lorsque seul le hors plateforme est possible, et pour une inscription en attente de validation. Texte brut affiché en nœud texte (jamais du HTML). Nouvelle clé `enroll.offlineInstructionsTitle` ajoutée dans les huit dictionnaires.

## Actions à mener

- **Aucune migration** (colonnes existantes) ; pas de `db push` nécessaire pour cette étape.
- **`pnpm db:backfill-roles`** pour donner `settings.manage` aux rôles Propriétaire / Gestionnaire des entreprises existantes, et `payout-accounts.verify` au Super Administrateur (voir la commande existante ; à confirmer si elle couvre les rôles plateforme).
- **`SECRETS_ENCRYPTION_KEY`** doit être défini (déjà requis pour les intégrations) : sans elle, enregistrer ou lire un compte échoue.
- Les comptes de reversement saisis avant cette étape n'existent pas (aucune route ne pouvait les écrire) : chaque entreprise doit en saisir un puis le faire vérifier avant son prochain reversement.

## Limites connues

- **Pas de limitation de débit propre** sur `PUT payout-account` : un jeton volé pourrait tenter des mots de passe. À couvrir par un limiteur global ou dédié si nécessaire.
- Le logo est une **URL saisie** (pas de téléversement, traité ailleurs) ; l'URL n'est pas vérifiée (accessibilité, type d'image), et l'aperçu charge l'image depuis le navigateur du gestionnaire.
- La vérification Admin est un **simple basculement** : pas de pièce justificative, pas de motif de refus, pas d'historique de vérification (seul le journal d'audit en garde la trace par nom de champ).
- Les champs `legalInfo` (raison sociale, immatriculation, identifiant fiscal, adresse) sont libres : pas de format imposé par pays.
- Le téléphone Mobile Money n'est pas contrôlé par préfixe d'opérateur ; le RIB n'est contrôlé que sur 23 caractères (format français/UEMOA courant).
- `RequestPayoutDto` garde des champs obsolètes ignorés ; l'ancien type front `RequestPayoutValues` / `requestPayoutSchema` reste défini dans `business/.../wallet.schema.ts` sans usage.
- Les couleurs secondaire et nom d'affichage ne sont pas encore utilisés par le front learning (seuls le logo et la couleur principale le sont) ; `contactEmail` / `contactPhone` / `legalInfo` ne sont pas encore affichés côté apprenant.

## Vérification

- **Backend** : `tsc` sans erreur dans ma zone, ESLint sans nouvel avertissement, `pnpm arch:check` OK, tests tenants / users / wallets / audit OK (209). Nouveaux tests : règles pures (couleur, https dont `http:` / `javascript:` / `data:` / identifiants, HTML, téléphone, IBAN et RIB valides ou à clé fausse, Mobile Money, masque) ; cas d'usage avec dépôt en mémoire (mot de passe faux ou vide sans écriture, IBAN invalide, numéro chiffré et jamais renvoyé, remise à non vérifié, événement sans valeur, isolation entre tenants, tenant inconnu en 404, vérification Admin, destination déchiffrée seulement après vérification, modification qui annule la vérification) ; `RequestPayoutUseCase` refuse sans compte vérifié sans rien créer ni émettre ; profil public en liste blanche.
- **Admin** : `tsc`, ESLint, 3 tests de schéma OK. **Business** : `tsc`, ESLint, 63 tests OK (18 nouveaux sur les schémas, dont `javascript:`, `http:`, couleur invalide, IBAN invalide, mot de passe vide). **Learning** : `tsc`, ESLint, 89 tests OK (dont la parité des huit dictionnaires).
- Le test de couverture des permissions (`default-roles-coverage.spec.ts`) a échoué une fois sur `finance-settings.manage`, permission d'une autre étape en cours (hors de ma zone) ; `settings.manage` et `payout-accounts.verify` y sont bien couvertes.
- **Non testé** : aucune requête HTTP réelle ni base de données (les routes, la validation `class-validator` et le filtre d'erreurs ne sont couverts que par typage et par les cas d'usage) ; chiffrement avec la vraie clé de production ; écrans (Paramètres, carte Admin, encadré learning) jamais ouverts dans un navigateur ; rendu RTL de l'encadré en arabe ; permissions réellement présentes dans les jetons des comptes existants (dépend du backfill).
