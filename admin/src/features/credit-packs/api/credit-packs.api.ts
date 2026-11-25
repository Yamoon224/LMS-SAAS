import type { CreateCreditPackValues, CreditPack } from "../schemas/credit-pack.schema";
import { creditPackSchema } from "../schemas/credit-pack.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchCreditPacks(): Promise<CreditPack[]> {
  const data = await apiClient.get<unknown[]>("/admin/plans/credit-packs");
  return creditPackSchema.array().parse(data);
}

export interface CreateCreditPackResponse {
  id: string;
  name: string;
}

export async function createCreditPack(
  values: CreateCreditPackValues,
): Promise<CreateCreditPackResponse> {
  return apiClient.post<CreateCreditPackResponse, CreateCreditPackValues>(
    "/admin/plans/credit-packs",
    values,
  );
}

export interface ArchiveCreditPackResponse {
  id: string;
  archived: boolean;
}

export async function archiveCreditPack(id: string): Promise<ArchiveCreditPackResponse> {
  return apiClient.post<ArchiveCreditPackResponse>(`/admin/plans/credit-packs/${id}/archive`);
}
