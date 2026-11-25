import { useMutation, useQueryClient } from "@tanstack/react-query";

import { assignRoles } from "../api/admin-users.api";
import type { AssignRolesValues } from "../schemas/admin-user.schema";

import { adminUsersQueryKey } from "./useAdminUsers";

/** Modification des rôles d'un compte admin plateforme. */
export function useAssignRoles(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Rôles mis à jour." },
    mutationFn: (values: AssignRolesValues) => assignRoles(userId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
    },
  });
}
