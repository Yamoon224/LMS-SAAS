import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reactivateAdminUser } from "../api/admin-users.api";

import { adminUsersQueryKey } from "./useAdminUsers";

/** Réactivation d'un compte admin plateforme suspendu (ADM-06). */
export function useReactivateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Compte réactivé." },
    mutationFn: reactivateAdminUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
    },
  });
}
