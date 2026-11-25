import { platformHealthSchema } from "../schemas/platform-health.schema";
import type { PlatformHealth } from "../schemas/platform-health.schema";

import { apiClient } from "@/lib/api-client";

/** GET /admin/health — files de tâches, webhooks (24 h) et stockage global (ADM-35). */
export async function fetchPlatformHealth(): Promise<PlatformHealth> {
  return platformHealthSchema.parse(await apiClient.get<unknown>("/admin/health"));
}
