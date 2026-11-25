import { useMutation, useQueryClient } from "@tanstack/react-query";

import { suspendTenant } from "../api/tenants.api";
import type { SuspendTenantValues } from "../schemas/tenant.schema";

import { tenantsQueryKey } from "./useTenants";

/** Suspension d'une entreprise (ADM-08), motif obligatoire. */
export function useSuspendTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, values }: { tenantId: string; values: SuspendTenantValues }) =>
      suspendTenant(tenantId, values),
    meta: { successMessage: "Entreprise suspendue." },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: tenantsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
    },
  });
}
