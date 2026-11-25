import { useQuery } from "@tanstack/react-query";

import { fetchPlans } from "../api/plans.api";

export const plansQueryKey = ["plans"] as const;

/** Liste des plans tarifaires (ADM-13), publics et privés, archivés inclus. */
export function usePlans() {
  return useQuery({
    queryKey: plansQueryKey,
    queryFn: fetchPlans,
  });
}
