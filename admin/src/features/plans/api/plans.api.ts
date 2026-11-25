import type { CreatePlanValues, Plan, SetPlanPriceValues } from "../schemas/plan.schema";
import { planSchema } from "../schemas/plan.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchPlans(): Promise<Plan[]> {
  const data = await apiClient.get<unknown[]>("/admin/plans");
  return planSchema.array().parse(data);
}

export interface CreatePlanResponse {
  id: string;
  name: string;
}

export async function createPlan(values: CreatePlanValues): Promise<CreatePlanResponse> {
  const payload = {
    ...values,
    description: values.description || undefined,
  };
  return apiClient.post<CreatePlanResponse, typeof payload>("/admin/plans", payload);
}

export interface ArchivePlanResponse {
  id: string;
  archived: boolean;
}

export async function archivePlan(id: string): Promise<ArchivePlanResponse> {
  return apiClient.post<ArchivePlanResponse>(`/admin/plans/${id}/archive`);
}

export async function unarchivePlan(id: string): Promise<ArchivePlanResponse> {
  return apiClient.post<ArchivePlanResponse>(`/admin/plans/${id}/unarchive`);
}

/** Doit rester cohérent avec UpdatePlanDto : mise à jour partielle, quotas/fonctionnalités remplacés en bloc. */
export interface UpdatePlanPayload {
  name?: string;
  description?: string;
  quotas?: Plan["quotas"];
  features?: Plan["features"];
}

export async function updatePlan(id: string, payload: UpdatePlanPayload): Promise<{ id: string; updated: boolean }> {
  return apiClient.patch<{ id: string; updated: boolean }, UpdatePlanPayload>(`/admin/plans/${id}`, payload);
}

export interface SetPlanPriceResponse {
  planId: string;
  period: string;
  amount: number;
}

export async function setPlanPrice(
  planId: string,
  values: SetPlanPriceValues,
): Promise<SetPlanPriceResponse> {
  return apiClient.post<SetPlanPriceResponse, SetPlanPriceValues>(
    `/admin/plans/${planId}/prices`,
    values,
  );
}
