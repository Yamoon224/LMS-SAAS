import { adminAlertsSchema } from "../schemas/alerts.schema";
import type { AdminAlertsReport } from "../schemas/alerts.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchAdminAlerts(): Promise<AdminAlertsReport> {
  return adminAlertsSchema.parse(await apiClient.get<unknown>("/admin/alerts"));
}
