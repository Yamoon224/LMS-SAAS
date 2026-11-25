import type { DateRangeFiltersValues, PlatformDashboard, PlatformTrends } from "../schemas/analytics.schema";
import { platformDashboardSchema, platformTrendsSchema } from "../schemas/analytics.schema";

import { apiClient } from "@/lib/api-client";

/** Début de journée locale → ISO UTC. */
function startOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

/** Fin de journée locale → ISO UTC : la journée choisie en « Au » est incluse en entier. */
function endOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

export async function fetchPlatformDashboard(
  filters: DateRangeFiltersValues,
): Promise<PlatformDashboard> {
  const search = new URLSearchParams();
  if (filters.from) search.set("from", startOfDayIso(filters.from));
  if (filters.to) search.set("to", endOfDayIso(filters.to));

  const query = search.toString();
  const data = await apiClient.get<unknown>(`/admin/analytics/dashboard${query ? `?${query}` : ""}`);
  return platformDashboardSchema.parse(data);
}

export async function fetchPlatformTrends(filters: DateRangeFiltersValues): Promise<PlatformTrends> {
  const search = new URLSearchParams();
  if (filters.from) search.set("from", startOfDayIso(filters.from));
  if (filters.to) search.set("to", endOfDayIso(filters.to));

  const query = search.toString();
  const data = await apiClient.get<unknown>(`/admin/analytics/trends${query ? `?${query}` : ""}`);
  return platformTrendsSchema.parse(data);
}
