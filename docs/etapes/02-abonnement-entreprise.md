# Étape 02 — Abonnement et facturation (back-office Entreprise)

**Date** : 2026-11-17
**Référence cahier des charges** : section 6.1 — ENT-01 (choix d'un plan), ENT-04 (changement de plan), ENT-07 (usage du plan)

## Objectif

Donner à l'entreprise une page « Abonnement » : plan courant, jauges d'usage des quotas, comparatif des plans publics avec souscription / changement de plan.

## Backend (`backend/`)

| Fichier | Changement |
| --- | --- |
| `modules/plans/presentation/business-plans.controller.ts` | `GET /business/plans` renvoie désormais les **prix actifs** de chaque plan (id, périodicité, devise, montant, jours d'essai) — sans eux, impossible de souscrire (le POST attend un `planPriceId`). Nouvel endpoint `GET /business/plans/usage` : usage courant et limite de chaque quota (`maxCourses`, `maxActiveLearners`, `maxManagers`, `storageGb`, `liveSessionsPerMonth`), permission `subscriptions.manage`. |
| `modules/subscriptions/presentation/business-subscriptions.controller.ts` | `GET /business/subscription` expose aussi `planPriceId`, `startedAt`, `graceEndsAt`. |
| `modules/subscriptions/domain/subscription.entity.ts` | Getters `startedAt` et `graceEndsAt`. |

Aucune dépendance inter-modules ajoutée : l'usage passe par `CheckQuotaUseCase`, interne au module `plans`.

## Front Entreprise (`business/`)

Tout vit dans `src/features/subscription/` (aucune ressource partagée avec un autre composant) :

```
features/subscription/
  api/subscription.api.ts
  hooks/useSubscription.ts
  schemas/subscription.schema.ts       # schémas Zod, libellés, statuts
  components/
    SubscriptionPage.tsx               # assemblage
    CurrentSubscriptionCard.tsx        # plan, statut, échéance, période de grâce
    UsageGauges.tsx                    # jauges (ENT-07), alerte orange ≥ 80 %, rouge à 100 %
    PlanComparison.tsx                 # choix de la périodicité
    PlanCard.tsx                       # quotas + action Souscrire / Changer
    SubscriptionStatusBadge.tsx
app/(dashboard)/subscription/page.tsx  # page mince
```

- Entrée « Abonnement » ajoutée à la navigation (permission `subscriptions.manage`).
- Le comparatif ne suppose rien sur l'immédiateté : l'UI propose, le backend tranche (`selfService` recalcule la montée/descente en gamme).
- Le badge de statut est **dupliqué** depuis `admin` plutôt qu'importé (règle de l'étape 01).

## Limites connues

- Le paiement en ligne de l'abonnement (ENT-02) dépend de l'événement émis par le backend ; aucune redirection vers le fournisseur n'est encore gérée par cette page.
- Descente de gamme : le backend n'a pas encore de persistance du changement différé (noté dans `change-plan.use-case.ts`).
- Factures PDF (ENT-05) et achat de packs de crédits IA (ENT-06) : étapes suivantes.

## Vérification

- Backend : `tsc` OK, 65 suites / 425 tests OK.
- Business : `tsc` OK, ESLint 0 erreur 0 avertissement sur la feature, 27 tests OK.
