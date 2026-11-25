import type { AssignSubscriptionValues, Subscription, TenantSubscription } from "../schemas/subscription.schema";
import { subscriptionSchema, tenantSubscriptionSchema } from "../schemas/subscription.schema";

import { apiClient } from "@/lib/api-client";

/** ADM-09: attribue un plan (offert ou personnalisé) à une entreprise, avec essai optionnel. */
export async function assignSubscription(
  tenantId: string,
  values: AssignSubscriptionValues,
): Promise<Subscription> {
  const data = await apiClient.post<unknown, AssignSubscriptionValues>(
    `/admin/tenants/${tenantId}/subscription`,
    values,
  );
  return subscriptionSchema.parse(data);
}

/** ADM-09: consulte l'abonnement courant (le plus récent) d'une entreprise, avec plan/prix associés. */
export async function fetchTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
  const data = await apiClient.get<unknown>(`/admin/tenants/${tenantId}/subscription`);
  if (!data) return null;
  return tenantSubscriptionSchema.parse(data);
}
