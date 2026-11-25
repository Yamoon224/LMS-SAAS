import { financeSettingsResponseSchema } from "../schemas/finance-settings.schema";
import type { FinanceSettings, FinanceSettingsResponse } from "../schemas/finance-settings.schema";

import { apiClient } from "@/lib/api-client";

/** GET /admin/finance-settings — valeurs en vigueur, valeurs par défaut et bornes. */
export async function fetchFinanceSettings(): Promise<FinanceSettingsResponse> {
  return financeSettingsResponseSchema.parse(await apiClient.get<unknown>("/admin/finance-settings"));
}

/** PUT /admin/finance-settings — seuls les champs fournis sont modifiés ; ne s'applique qu'aux ventes futures. */
export async function updateFinanceSettings(patch: Partial<FinanceSettings>): Promise<unknown> {
  return apiClient.put<unknown, Partial<FinanceSettings>>("/admin/finance-settings", patch);
}
