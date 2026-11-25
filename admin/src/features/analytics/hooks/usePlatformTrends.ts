import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchPlatformTrends } from "../api/analytics.api";
import type { DateRangeFiltersValues } from "../schemas/analytics.schema";

/** Évolution dans le temps et répartitions par statut (graphiques du tableau de bord). */
export function usePlatformTrends(filters: DateRangeFiltersValues, enabled = true) {
  return useQuery({
    queryKey: ["analytics", "trends", filters] as const,
    queryFn: () => fetchPlatformTrends(filters),
    enabled,
    // Garde les graphiques affichés pendant le rechargement d'une autre période (pas de clignotement).
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => ((error as { status?: number }).status === 403 ? false : failureCount < 2),
  });
}
