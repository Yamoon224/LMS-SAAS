import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchTenantBranding, updateTenantBranding } from "../api/tenants.api";
import type { BrandingFormValues } from "../schemas/tenant.schema";

import { tenantsQueryKey } from "./useTenants";

/** Identité visuelle courante (avec la couleur secondaire que l'aperçu de la fiche n'expose pas). */
export function useTenantBranding(id: string, enabled: boolean) {
  return useQuery({ queryKey: ["tenants", id, "branding"], queryFn: () => fetchTenantBranding(id), enabled });
}

/** Modification du logo et des couleurs (ADM-10) : rafraîchit la fiche, l'aperçu et la liste (logos). */
export function useUpdateTenantBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, values }: { tenantId: string; values: BrandingFormValues }) => updateTenantBranding(tenantId, values),
    meta: { successMessage: "Identité visuelle enregistrée." },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: tenantsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
    },
  });
}
