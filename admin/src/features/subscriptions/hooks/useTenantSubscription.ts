import { useQuery } from "@tanstack/react-query";

import { fetchTenantSubscription } from "../api/subscriptions.api";

/** ADM-09: abonnement courant (le plus récent) d'une entreprise. */
export function useTenantSubscription(tenantId: string) {
  return useQuery({
    queryKey: ["tenants", tenantId, "subscription"],
    queryFn: () => fetchTenantSubscription(tenantId),
    enabled: Boolean(tenantId),
  });
}
