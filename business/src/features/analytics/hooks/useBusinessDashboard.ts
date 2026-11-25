import { useQuery } from "@tanstack/react-query";

import { fetchBusinessDashboard } from "../api/analytics.api";
import type { PeriodRange } from "../schemas/analytics.schema";

/** KPI de l'entreprise sur une période (clé : bornes calendaires, stable entre rendus). */
export function useBusinessDashboard(range: PeriodRange, enabled = true) {
  return useQuery({
    queryKey: ["business-analytics", range.from, range.to] as const,
    queryFn: () => fetchBusinessDashboard(range),
    enabled,
  });
}
