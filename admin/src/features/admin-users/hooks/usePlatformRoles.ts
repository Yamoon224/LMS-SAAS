import { useQuery } from "@tanstack/react-query";

import { fetchPlatformRoles } from "../api/admin-users.api";

export const platformRolesQueryKey = ["admin-users", "roles"] as const;

/** Rôles plateforme disponibles, pour l'invitation ou l'affectation de rôles. */
export function usePlatformRoles() {
  return useQuery({
    queryKey: platformRolesQueryKey,
    queryFn: fetchPlatformRoles,
  });
}
