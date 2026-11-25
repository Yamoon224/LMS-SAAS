import { dashboardSchema } from "../schemas/dashboard.schema";
import type { Dashboard } from "../schemas/dashboard.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchDashboard(): Promise<Dashboard> {
  return dashboardSchema.parse(await apiClient.get<unknown>("/public/enrollments/dashboard"));
}
