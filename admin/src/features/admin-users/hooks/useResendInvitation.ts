import { useMutation, useQueryClient } from "@tanstack/react-query";

import { resendInvitation } from "../api/admin-users.api";

import { adminUsersQueryKey } from "./useAdminUsers";

/** Renvoi du lien d'activation (ADM-06). */
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Invitation renvoyée." },
    mutationFn: resendInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
    },
  });
}
