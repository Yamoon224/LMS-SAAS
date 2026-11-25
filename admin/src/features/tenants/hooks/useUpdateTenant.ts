import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTenant } from "../api/tenants.api";
import type { UpdateTenantValues } from "../schemas/tenant.schema";

import { tenantsQueryKey } from "./useTenants";

/** Modification des informations d'une entreprise (ADM-10) : rafraîchit la liste, la fiche et l'aperçu. */
export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, values }: { tenantId: string; values: UpdateTenantValues }) => updateTenant(tenantId, values),
    meta: { successMessage: "Informations de l’entreprise enregistrées." },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: tenantsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
    },
  });
}
