import { useQuery } from "@tanstack/react-query";

import { fetchTenantBalance } from "../api/wallets.api";

export const tenantBalanceQueryKey = (tenantId: string) => ["wallets", "balance", tenantId] as const;

/** Solde d'une entreprise (ADM-22), calculé à partir du grand livre. */
export function useTenantBalance(tenantId: string, enabled: boolean) {
  return useQuery({
    queryKey: tenantBalanceQueryKey(tenantId),
    queryFn: () => fetchTenantBalance(tenantId),
    enabled,
  });
}
