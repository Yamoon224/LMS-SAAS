import { NotFoundDomainError } from "@shared/errors";

import type { PlanPriceSelection, SubscriptionRepositoryPort } from "../domain/subscription.repository.port";

/**
 * Le prix doit exister et être actif. En libre-service (`selfService`, routes
 * entreprise) le plan doit en plus être public et non archivé: un plan privé
 * ("offert" / sur mesure, ADM-09) ne peut être attribué que par un
 * administrateur. Cas non éligible: même 404 qu'un prix inconnu.
 */
export async function assertSelectablePlanPrice(
  repository: SubscriptionRepositoryPort,
  planPriceId: string,
  selfService: boolean,
): Promise<PlanPriceSelection> {
  const price = await repository.findPlanPriceSelection(planPriceId);
  const selectable = price !== null && price.isActive && !(selfService && (!price.planIsPublic || price.planIsArchived));
  if (!price || !selectable) {
    throw new NotFoundDomainError(`Plan introuvable: ${planPriceId}`);
  }
  return price;
}
