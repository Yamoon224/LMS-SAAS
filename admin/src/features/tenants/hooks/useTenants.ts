import { useQuery } from "@tanstack/react-query";

import { fetchTenants } from "../api/tenants.api";

export const tenantsQueryKey = ["tenants"] as const;

/** Expose la liste des entreprises clientes via TanStack Query. */
export function useTenants() {
  return useQuery({
    queryKey: tenantsQueryKey,
    queryFn: fetchTenants,
  });
}
