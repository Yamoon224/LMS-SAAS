# Étape 31 — Renouvellement automatique, prorata et changement de plan

**Date** : 2026-11-19
**Référence cahier des charges** : section 6.1 — ENT-03 (renouvellement), ENT-04 (changement de plan) ; RG-02 (période de grâce)

## Objectif

Lever le point 7 du rapport de conformité : montée en gamme avec prorata, descente de gamme **persistée** et annulable, renouvellement automatique à l'échéance (lien de paiement + notification), échec → grâce → expiration, idempotence.

## Règles de gestion

**Prorata** (fonctions pures : `subscriptions/domain/billing-math.ts`, testées)
- Montants entiers en plus petite unité de la devise (XOF : 1 = 1 F CFA).
- Seule une montée en gamme (prix ramené au mois strictement supérieur, même devise) est **immédiate** ; l'échéance courante est conservée.
- Montant dû = coût du nouveau plan pour les jours restants − crédit de l'ancien plan pour ces jours, jamais négatif.
- Jours restants arrondis au jour supérieur (jour entamé = dû), bornés à la durée de la période (début = échéance − durée de la périodicité, jour borné en fin de mois).
- Arrondis : crédit **à l'inférieur**, coût **au supérieur**.
- Périodicités différentes : le prix du nouveau plan est ramené à la durée de la période courante (ex. mensuel → annuel : 1/12 du prix annuel par mois).
- Essai gratuit en cours : montée immédiate, aucun prorata. Descente, même prix, devises différentes : planifié à l'échéance, sans crédit ni remboursement.

**Descente de gamme** : champs `pendingPlanPriceId` / `pendingChangeAt` (= échéance courante). Appliquée automatiquement au renouvellement suivant (le renouvellement est facturé au **nouveau** prix). Annulable tant qu'elle n'est pas appliquée (`DELETE /business/subscription/change-plan/pending`) ; re-choisir le plan courant l'annule aussi ; une montée en gamme immédiate l'écrase ; elle tombe si l'abonnement prend fin.

**Renouvellement** (job horaire dans `PaymentsScheduler`, convention `@nestjs/schedule` du projet)
1. Candidats : ACTIVE échus avec `autoRenew`, ou en GRACE_PERIOD dont la dernière tentative a échoué.
2. Réservation **atomique** de l'échéance (`renewalForPeriodEnd`, mise à jour conditionnelle) : un second passage ou un passage concurrent ne crée rien. Prix nul : renouvelé sans paiement.
3. Création du paiement via `InitiatePaymentUseCase` (lien de paiement, mobile money en priorité puis carte) ; l'abonnement mémorise paiement, lien et montant, et notifie le Propriétaire (`subscription.renewal-payment-link`).
4. `payment.succeeded` du paiement attendu : période prolongée **depuis l'échéance précédente** (sans perte de jour, même payé en grâce ; depuis maintenant si EXPIRED), statut ACTIVE, descente appliquée, notification « renouvelé ». Un autre paiement d'abonnement (prorata) ne prolonge rien.
5. `payment.failed` (ou paiement expiré après 30 min, ou création impossible) : GRACE_PERIOD 3 jours (RG-02), puis EXPIRED par la tâche existante. Pendant la grâce, nouveau lien automatiquement généré au plus une fois par 24 h (le paiement échoué ne peut plus aboutir, donc pas de double prolongation).
6. `autoRenew=false` : à l'échéance, ACTIVE → CANCELED (fin à l'échéance) ; événement `subscription.expired`.
- Rappels J-7/J-3/J-1 inchangés.

## Backend

| Fichier | Changement |
| --- | --- |
| `prisma/schema.prisma` (Subscription) | 8 champs optionnels additifs (ci-dessous) |
| `subscriptions/domain/billing-math.ts` (+ spec) | prorata, comparaison de prix, fin de période |
| `subscriptions/domain/subscription.entity.ts` | planification/annulation, `canStartRenewal`, `markRenewalRequested`, `completeRenewal`, `failRenewal` |
| `subscriptions/application/change-plan.use-case.ts` | persiste la descente ; renvoie `proration`/`scheduledFor` ; l'événement porte le prorata |
| `subscriptions/application/plan-change.use-cases.ts` | aperçu, annulation, interrupteur `autoRenew` |
| `subscriptions/application/renewal.use-cases.ts` (+ spec) | liste, réservation, rattachement, confirmation, échec, fin sans renouvellement |
| `subscriptions/presentation/business-subscriptions.controller.ts` | `GET change-plan/preview`, `DELETE change-plan/pending`, `PATCH auto-renew` ; `GET /business/subscription` expose `pendingPlanPriceId`, `pendingChangeAt`, `lastRenewal` |
| `subscriptions/subscriptions.facade.ts`, `.events.ts`, `.scheduler.ts` | façade enrichie, 4 événements, fin des abonnements sans renouvellement |
| `payments/application/renew-subscriptions.use-case.ts`, `request-prorata-payment.listener.ts`, `domain/renewal-method.ts` | orchestration côté payments (dépendance payments → subscriptions conservée) |
| `payments/application/handle-payment-*-for-subscription.listener.ts` | passent par `confirmSubscriptionPayment` / `handleRenewalFailure(id, paymentId)` ; plus de période fixée à 1 mois : elle suit la périodicité du prix |
| `notifications` | 3 gabarits fr/en (lien de renouvellement, renouvelé, lien du prorata) |

Correctif : l'événement de grâce n'était écouté ni par les notifications (`entered-grace-period`) ni émis sous ce nom ; il est désormais émis sous les deux noms.

### Champs de schéma ajoutés (`Subscription`, tous optionnels)

`pendingPlanPriceId`, `pendingChangeAt`, `renewalForPeriodEnd`, `lastRenewalStatus` (PENDING | SUCCEEDED | FAILED), `lastRenewalAt`, `lastRenewalPaymentId`, `lastRenewalCheckoutUrl`, `lastRenewalAmount`. Appliquer avec `prisma db push` / migration (non lancé ici).

## Front Entreprise (`business/src/features/subscription`)

- `PlanCard` : la confirmation d'un changement affiche l'aperçu du prorata (jours, coût, crédit, montant dû) ou la date d'application d'une descente.
- `RenewalCard` (nouveau) : interrupteur de renouvellement automatique, état du dernier renouvellement (avec bouton « Payer maintenant » si en attente), changement planifié avec bouton « Annuler ».

## Limites connues

- **Aucun moyen de paiement mémorisé** : les passerelles n'exposent pas de prélèvement récurrent par carte ; le renouvellement passe toujours par un lien de paiement. À brancher (capacité optionnelle de passerelle) quand le stockage d'autorisations existera.
- Le prorata d'une montée en gamme est facturé par lien de paiement mais **le plan est déjà changé** : un prorata non payé n'est pas bloquant (à durcir : relance, ou changement conditionné au paiement).
- Pas de conversion automatique à la fin d'un essai (TRIALING) ni de crédit/remboursement en cas de descente.
- Une condition de course résiduelle existe si le webhook de paiement arrive avant le rattachement du paiement à l'abonnement (quelques ms) ; le paiement resterait alors sans effet sur la période.
- Les paiements d'abonnement n'ont pas de champ « objet » : la distinction renouvellement / prorata repose sur `lastRenewalPaymentId`.

## Vérification

- Backend : `tsc` sans erreur sur ces fichiers ; jest subscriptions (prorata, planification, idempotence, transitions) et `renewal-method` OK.
- Business : `tsc` sans erreur sur la feature, ESLint propre.
