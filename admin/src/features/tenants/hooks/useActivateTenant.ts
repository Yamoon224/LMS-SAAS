import { useMutation, useQueryClient } from "@tanstack/react-query";

import { activateTenant } from "../api/tenants.api";

import { tenantsQueryKey } from "./useTenants";

/** Activation d'une entreprise brouillon ou levée de suspension. */
export function useActivateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => activateTenant(tenantId),
    meta: { successMessage: "Entreprise activée : ses accès sont ouverts." },
    onSuccess: (_data, tenantId) => {
      void queryClient.invalidateQueries({ queryKey: tenantsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
    },
  });
}
