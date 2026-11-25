import { businessDashboardSchema } from "../schemas/analytics.schema";
import type { BusinessDashboard, PeriodRange } from "../schemas/analytics.schema";

import { apiClient } from "@/lib/api-client";

/** Début de journée locale → ISO UTC. */
function startOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

/** Fin de journée locale → ISO UTC (inclut la journée entière choisie). */
function endOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

/** GET /business/analytics/dashboard?from&to (DateRangeDto : IsDateString). */
export async function fetchBusinessDashboard(range: PeriodRange): Promise<BusinessDashboard> {
  const params = new URLSearchParams();
  if (range.from) params.set("from", startOfDayIso(range.from));
  if (range.to) params.set("to", endOfDayIso(range.to));
  const query = params.toString();
  const data = await apiClient.get<unknown>(`/business/analytics/dashboard${query ? `?${query}` : ""}`);
  return businessDashboardSchema.parse(data);
}
