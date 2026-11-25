import { useQuery } from "@tanstack/react-query";

import { fetchPlatformDashboard } from "../api/analytics.api";
import type { DateRangeFiltersValues } from "../schemas/analytics.schema";

export const platformDashboardQueryKey = (filters: DateRangeFiltersValues) =>
  ["analytics", "dashboard", filters] as const;

/** Tableau de bord plateforme (KPIs tous tenants) sur une période donnée. */
export function usePlatformDashboard(filters: DateRangeFiltersValues, enabled = true) {
  return useQuery({
    queryKey: platformDashboardQueryKey(filters),
    queryFn: () => fetchPlatformDashboard(filters),
    enabled,
    retry: (failureCount, error) => (error as { status?: number }).status === 403 ? false : failureCount < 2,
  });
}
