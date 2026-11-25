import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  applySubscriptionDiscount,
  extendSubscription,
  offerPlan,
  removeSubscriptionDiscount,
} from "../api/admin-subscription.api";
import type { OfferPlanPayload } from "../api/admin-subscription.api";
import type { DiscountPayload, ExtendSubscriptionPayload } from "../schemas/admin-subscription.schema";

/** ADM-09 : chaque action rafraîchit la fiche entreprise (abonnement, aperçu, journal d'audit). */
function useRefreshTenant(tenantId: string) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
}

export function useExtendSubscription(tenantId: string) {
  const refresh = useRefreshTenant(tenantId);
  return useMutation({
    meta: { successMessage: "Période prolongée." },
    mutationFn: (payload: ExtendSubscriptionPayload) => extendSubscription(tenantId, payload),
    onSuccess: refresh,
  });
}

export function useApplyDiscount(tenantId: string) {
  const refresh = useRefreshTenant(tenantId);
  return useMutation({
    meta: { successMessage: "Remise appliquée." },
    mutationFn: (payload: DiscountPayload) => applySubscriptionDiscount(tenantId, payload),
    onSuccess: refresh,
  });
}

export function useRemoveDiscount(tenantId: string) {
  const refresh = useRefreshTenant(tenantId);
  return useMutation({
    meta: { successMessage: "Remise retirée." },
    mutationFn: () => removeSubscriptionDiscount(tenantId),
    onSuccess: refresh,
  });
}

export function useOfferPlan(tenantId: string) {
  const refresh = useRefreshTenant(tenantId);
  return useMutation({
    meta: { successMessage: "Plan offert à l'entreprise." },
    mutationFn: (payload: OfferPlanPayload) => offerPlan(tenantId, payload),
    onSuccess: refresh,
  });
}
