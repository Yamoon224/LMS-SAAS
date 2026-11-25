import type { DiscountPayload, ExtendSubscriptionPayload } from "../schemas/admin-subscription.schema";

import { apiClient } from "@/lib/api-client";

/** ADM-09 : actions Admin sur l'abonnement d'une entreprise (permission `subscriptions.assign`). */
const base = (tenantId: string) => `/admin/tenants/${tenantId}/subscription`;

export const extendSubscription = (tenantId: string, payload: ExtendSubscriptionPayload) =>
  apiClient.post<unknown, ExtendSubscriptionPayload>(`${base(tenantId)}/extend`, payload);

export const applySubscriptionDiscount = (tenantId: string, payload: DiscountPayload) =>
  apiClient.post<unknown, DiscountPayload>(`${base(tenantId)}/discount`, payload);

export const removeSubscriptionDiscount = (tenantId: string) => apiClient.delete<unknown>(`${base(tenantId)}/discount`);

export interface OfferPlanPayload {
  planPriceId: string;
  days: number;
  reason: string;
}

export const offerPlan = (tenantId: string, payload: OfferPlanPayload) =>
  apiClient.post<unknown, OfferPlanPayload>(`${base(tenantId)}/offer`, payload);
