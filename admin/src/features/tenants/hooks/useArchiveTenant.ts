import { useMutation, useQueryClient } from "@tanstack/react-query";

import { archiveTenant } from "../api/tenants.api";

import { tenantsQueryKey } from "./useTenants";

/** Archivage définitif d'une entreprise (ADM-08). */
export function useArchiveTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => archiveTenant(tenantId),
    meta: { successMessage: "Entreprise archivée." },
    onSuccess: (_data, tenantId) => {
      void queryClient.invalidateQueries({ queryKey: tenantsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
    },
  });
}
