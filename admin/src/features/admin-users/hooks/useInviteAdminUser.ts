import { useMutation, useQueryClient } from "@tanstack/react-query";

import { inviteAdminUser } from "../api/admin-users.api";

import { adminUsersQueryKey } from "./useAdminUsers";

/** Invitation d'un compte admin plateforme (ADM-36) + invalidation de la liste. */
export function useInviteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Invitation envoyée." },
    mutationFn: inviteAdminUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
    },
  });
}
