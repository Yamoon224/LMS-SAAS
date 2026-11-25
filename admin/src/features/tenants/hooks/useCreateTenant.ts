import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTenant } from "../api/tenants.api";

import { tenantsQueryKey } from "./useTenants";

/** Création d'une entreprise (ADM-04/ADM-05) + invalidation de la liste. */
export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Entreprise créée en brouillon." },
    mutationFn: createTenant,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tenantsQueryKey });
    },
  });
}
