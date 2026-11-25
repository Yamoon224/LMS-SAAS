import { useQuery } from "@tanstack/react-query";

import { fetchAdminUsers } from "../api/admin-users.api";

export const adminUsersQueryKey = ["admin-users"] as const;

/** Liste des comptes admin plateforme (ADM-36). */
export function useAdminUsers() {
  return useQuery({
    queryKey: adminUsersQueryKey,
    queryFn: fetchAdminUsers,
  });
}
