import { useMutation, useQueryClient } from "@tanstack/react-query";

import { suspendAdminUser } from "../api/admin-users.api";

import { adminUsersQueryKey } from "./useAdminUsers";

/** Révocation de l'accès d'un compte admin plateforme (ADM-06). */
export function useSuspendAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Compte suspendu." },
    mutationFn: suspendAdminUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
    },
  });
}
