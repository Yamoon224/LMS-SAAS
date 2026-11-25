import { useQuery } from "@tanstack/react-query";

import { fetchTenantById } from "../api/tenants.api";

/** Expose la fiche 360° (ADM-10) d'une entreprise via TanStack Query. */
export function useTenant(id: string) {
  return useQuery({
    queryKey: ["tenants", id],
    queryFn: () => fetchTenantById(id),
    enabled: Boolean(id),
  });
}
