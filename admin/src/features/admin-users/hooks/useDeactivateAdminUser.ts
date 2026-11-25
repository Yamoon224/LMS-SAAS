import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deactivateAdminUser } from "../api/admin-users.api";

import { adminUsersQueryKey } from "./useAdminUsers";

/** Désactivation définitive d'un compte admin plateforme (ADM-06). */
export function useDeactivateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Compte désactivé définitivement." },
    mutationFn: deactivateAdminUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
    },
  });
}
