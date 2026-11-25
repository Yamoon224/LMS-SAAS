import { aiConsumptionSchema } from "../schemas/ai-consumption.schema";
import type { AiConsumption } from "../schemas/ai-consumption.schema";

import { apiClient } from "@/lib/api-client";

/** Début de journée locale → ISO UTC. */
function startOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

/** Fin de journée locale → ISO UTC : la journée choisie en « Au » est incluse en entier. */
function endOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

/** GET /admin/analytics/ai-consumption — consommation IA par entreprise sur une période (ADM-34). */
export async function fetchAiConsumption(filters: { from: string; to: string }): Promise<AiConsumption> {
  const search = new URLSearchParams();
  if (filters.from) search.set("from", startOfDayIso(filters.from));
  if (filters.to) search.set("to", endOfDayIso(filters.to));
  const query = search.toString();
  return aiConsumptionSchema.parse(await apiClient.get<unknown>(`/admin/analytics/ai-consumption${query ? `?${query}` : ""}`));
}
