import { NotFoundDomainError } from "@shared/errors";

import { computeProration } from "../domain/billing-math";
import type { ProrationResult } from "../domain/billing-math";
import type { Subscription } from "../domain/subscription.entity";
import type { PlanPriceSelection, SubscriptionRepositoryPort } from "../domain/subscription.repository.port";

import { assertSelectablePlanPrice } from "./assert-selectable-plan-price";

export interface ResolvedPlanChange {
  subscription: Subscription;
  current: PlanPriceSelection | null;
  target: PlanPriceSelection;
  /** Prorata calculé comme pour une entreprise (libre-service) ; l'appelant décide de l'appliquer. */
  proration: ProrationResult;
}

/** Charge l'abonnement actif, valide le plan cible et calcule le prorata (partagé par l'aperçu et le changement). */
export async function resolvePlanChange(
  repository: SubscriptionRepositoryPort,
  tenantId: string,
  newPlanPriceId: string,
  selfService: boolean,
  now: Date,
): Promise<ResolvedPlanChange> {
  const subscription = await repository.findActiveForTenant(tenantId);
  if (!subscription) {
    throw new NotFoundDomainError(`Aucun abonnement actif pour l'entreprise: ${tenantId}`);
  }
  const target = await assertSelectablePlanPrice(repository, newPlanPriceId, selfService);
  const current = await repository.findPlanPriceSelection(subscription.planPriceId);
  const proration = computeProration({
    current: current ?? target,
    next: target,
    periodEnd: subscription.currentPeriodEnd ?? now,
    now,
    isTrialing: subscription.status === "TRIALING",
    discount: subscription.activeDiscount(),
  });
  return { subscription, current, target, proration };
}
