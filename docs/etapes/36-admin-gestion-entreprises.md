# Étape 36 — Admin : utilisateurs d'une entreprise, abonnement, plans, pastille d'alertes

**Date** : 2026-11-19
**Référence cahier des charges** : ADM-06 (utilisateurs d'une entreprise), ADM-09 (abonnement), ADM-13 (plans), ADM-03 (pastille d'alertes).
**Rapport d'écarts** : `docs/RAPPORT-CONFORMITE-CDC.md` section 2 « Admin », point 4.

Schéma Prisma : quatre colonnes **additives** sur `Subscription` (voir ci-dessous). Aucune nouvelle permission.

## Exigences traitées

1. **ADM-06** : onglet « Utilisateurs » de la fiche entreprise devenu actif : suspendre / réactiver, renvoyer l'invitation, envoyer un lien de réinitialisation du mot de passe, réinitialiser la 2FA, transférer la propriété.
2. **ADM-09** : prolonger la période, appliquer une remise, offrir un plan, retirer une remise.
3. **ADM-13** : édition d'un plan (nom, description, quotas, fonctionnalités), archivage et désarchivage.
4. **ADM-03** : pastille d'alertes critiques dans la barre supérieure.

## Schéma (additif)

`Subscription` :

| Champ | Type | Rôle |
| --- | --- | --- |
| `discountPercent` | `Int?` | remise en pourcentage (1 à 100) |
| `discountAmount` | `Int?` | remise en montant fixe par période (plus petite unité) |
| `discountPeriodsRemaining` | `Int?` | périodes facturées restant à remiser ; décrémenté à chaque renouvellement réussi, remise effacée à zéro |
| `isComplimentary` | `Boolean @default(false)` | plan offert par l'Admin (le motif est dans le journal d'audit) |

Exactement un de `discountPercent` / `discountAmount` est renseigné. Nécessite `prisma db push` puis `prisma generate`.

## Backend

### ADM-06 (module users, un point d'entrée dans auth)

Permission : **`tenants.suspend`** (déjà attribuée au Super Administrateur, comme l'archivage) : aucun rattrapage de rôle.

| Route | Effet |
| --- | --- |
| `POST /admin/tenants/:tenantId/users/:userId/suspend` | suspend (réutilise `ManageUserStatusUseCase`) |
| `POST .../reactivate` | réactive |
| `POST .../resend-invitation` | nouveau lien d'activation, ancien révoqué (réutilise `ResendInvitationUseCase`) ; compte `INVITED` uniquement |
| `POST .../password-reset` | envoie le lien par e-mail via `RequestPasswordResetUseCase` (valable 1 h) ; compte `ACTIVE` uniquement ; **rien n'est retourné** |
| `POST .../2fa/reset` | `ResetTwoFactorUseCase` étendu par un périmètre (`scopeTenantId`) : la cible doit être un compte interne de ce tenant ; sessions révoquées |
| `POST /admin/tenants/:tenantId/ownership-transfer` | corps `{ newOwnerUserId, confirm: true }` |

Garde-fous (`AdminTenantUsersUseCase`) :

- **Périmètre** : le compte visé doit appartenir au tenant de l'URL et être un `COMPANY_USER` (jamais un compte plateforme ni un apprenant) ; sinon 404.
- **Dernier propriétaire actif** : sa suspension est refusée (`DERNIER_PROPRIETAIRE_ACTIF`, 409). Un second propriétaire suspendu ne compte pas.
- **Transfert de propriété** : la cible doit être active ; elle reçoit le rôle Propriétaire (ses autres rôles sont conservés), les autres propriétaires le perdent (rôle Gestionnaire si aucun autre rôle). Refusé si la cible est déjà l'unique propriétaire. Confirmation explicite exigée (`confirm: true`) en plus de la confirmation de l'interface.

Audit : `UserSuspendedEvent` porte désormais `actorId` (optionnel) ; nouveaux événements `user.reactivated`, `user.admin-action` (`invitation-resent`, `password-reset-sent`), `tenant.ownership-transferred` (identifiants des comptes uniquement), inscrits par `AuditSensitiveEventsListener` ; la 2FA réutilise `auth.two-factor-reset` (acteur inclus). Aucun lien ni jeton n'est journalisé.

### ADM-09 (module subscriptions)

Permission : `subscriptions.assign` (existante). Routes sous `admin/tenants/:tenantId/subscription` :

- `POST extend` : `{ days }` (1 à 366) **ou** `{ until }` (au plus 366 jours après l'échéance), motif facultatif. Prolonge `currentPeriodEnd`, sans toucher à `autoRenew` ; depuis la période de grâce l'abonnement redevient `ACTIVE`. Refusé hors `ACTIVE` / `TRIALING` / `GRACE_PERIOD` ou pour une date non postérieure.
- `POST discount` : `{ percent | amount, periods (1 à 36), reason? }`, remplace la remise précédente ; `DELETE discount` la retire. Refusé sur un plan offert.
- `POST offer` : `{ planPriceId, days (1 à 3650), reason (5 caractères minimum, obligatoire) }`. Passe l'abonnement `ACTIVE` sur ce prix (en crée un si besoin), `autoRenew = false`, `isComplimentary = true`, échéance = max(échéance déjà payée, maintenant + durée), remise et descente planifiée effacées. Aucun paiement : à l'échéance, la tâche existante `EndNonRenewingSubscriptionsUseCase` clôt l'abonnement (CANCELED) et l'entreprise doit choisir un plan.

**Prise en compte de la remise** (`billing-math.ts`, fonction pure testée) :

- `applyDiscount(amount, discount)` : pourcentage (remise arrondie à l'inférieur, donc facturé arrondi au supérieur) ou montant fixe retranché ; plancher à 0.
- **Renouvellement** (`BeginRenewalUseCase`) : le montant demandé, `lastRenewalAmount` et le paiement créé sont ceux du prix **remisé** ; remise à 100 % (ou montant ≥ prix) : renouvellement immédiat sans paiement, comme un prix à 0. La remise se décrémente à `completeRenewal` (renouvellement abouti, jamais sur un échec ni sur une relance), et disparaît à la dernière période.
- **Prorata d'un changement de plan** (`computeProration`, option `discount`) : crédit de l'ancien plan et coût du nouveau sont calculés sur les montants remisés ; la direction (montée/descente) reste comparée sur les prix catalogue.
- Le renouvellement automatique (étape 31) est inchangé : mêmes réservations atomiques, mêmes statuts, mêmes événements.

Événements : `subscription.period-extended`, `subscription.discount-changed`, `subscription.plan-offered` ; audit (avec avant/après d'échéance, remise, motif) et notifications au Propriétaire (`subscription.period-extended`, `subscription.discount-applied`, `subscription.plan-offered`, modèles fr/en surchargeables via ADM-38 ; rien n'est envoyé au retrait d'une remise).

La fiche 360° (`overview`) expose `discountPercent`, `discountAmount`, `discountPeriodsRemaining`, `isComplimentary` pour chaque abonnement.

### ADM-13 (module plans)

Permission `plans.manage` (existante).

- `PATCH /admin/plans/:id` : nom (2 à 100), description (vide = effacée), `quotas`, `features`, tous facultatifs ; quotas et fonctionnalités **remplacent** l'ensemble précédent (clé absente ou `null` = illimité pour un quota). Clés inconnues, valeurs négatives ou non entières refusées (`MODIFICATION_PLAN_INVALIDE`). Aucune écriture ni événement si rien ne change. Le prix reste versionné (`POST /admin/plans/:id/prices`) : les abonnements existants ne sont jamais modifiés ; les nouveaux quotas s'appliquent à la demande.
- `POST /admin/plans/:id/archive` (idempotent) et nouveau `POST /admin/plans/:id/unarchive`.
- Audit : `plan.updated` (noms de champs seulement), `plan.archived`, `plan.unarchived`, avec l'administrateur acteur.

## Front Admin

- **Onglet Utilisateurs** : menu « ⋯ » par ligne, actions filtrées selon l'état du compte (reflète les gardes serveur), `ConfirmDialog` pour chacune (le transfert exige en plus une case à cocher), message préventif pour le dernier propriétaire actif. Visible avec `tenants.suspend`. Le composant `ConfirmDialog` gagne `children` et `confirmDisabled`.
- **Onglet Abonnement** : boutons « Prolonger », « Appliquer / Modifier la remise », « Retirer la remise », « Offrir un plan » (permission `subscriptions.assign`) ; remise en cours et plan offert affichés dans la grille.
- **Plans** : « Modifier » (dialogue réutilisant `PlanQuotasFields` / `PlanFeaturesFields`), « Désarchiver » pour un plan archivé.
- **Barre supérieure** : cloche reliée à `GET /admin/alerts` (`criticalCount`), lien vers le tableau de bord, rafraîchie chaque minute (même clé de requête que le widget), `aria-label` explicite, cloche grise sans pastille à 0, masquée sans `analytics.view`.

## Limites connues

- Le transfert de propriété ne ferme pas les sessions de l'ancien propriétaire : ses droits changent à la prochaine lecture des permissions du jeton (à valider).
- Une suspension de compte ne révoque pas explicitement les jetons de rafraîchissement (comportement existant de `ManageUserStatusUseCase`).
- Le nouveau propriétaire doit enrôler sa 2FA (obligatoire pour ce rôle) à sa prochaine connexion.
- La remise s'applique à tout paiement d'abonnement déclenché par le renouvellement et au prorata ; elle n'agit pas sur les achats de crédits IA ni sur le paiement initial d'un abonnement.
- Un plan offert qui prend fin n'envoie pas de notification dédiée (le message d'expiration existant s'applique).
- La prolongation d'une période ne modifie pas une demande de paiement de renouvellement déjà créée pour l'ancienne échéance.
- Les actions de la fiche utilisent `tenants.suspend` (pas de permission dédiée `tenant-users.manage`).

## Vérification

- Backend : Jest ciblé : `billing-math` (remise, prorata remisé), renouvellement avec remise (montant, décompte, 100 %, périodes épuisées), cas d'usage admin d'abonnement (prolongation, remise, plan offert puis fin à l'échéance), actions sur les comptes (périmètre, dernier propriétaire, transfert, invitation, réinitialisation), 2FA avec périmètre entreprise, plans (mise à jour, archivage). `tsc` : seules les erreurs attendues tant que `prisma generate` n'est pas relancé (champs `discountPercent`, `discountAmount`, `discountPeriodsRemaining`, `isComplimentary`) plus des erreurs préexistantes d'autres lots (examens, sessions live).
- Admin : Vitest ciblé (actions de comptes, schémas de prolongation / remise / offre), `tsc`, ESLint.
- **Non testé** : exécution contre une vraie base, affichage navigateur, envoi réel des e-mails, composants React (infrastructure Vitest en environnement `node`).
