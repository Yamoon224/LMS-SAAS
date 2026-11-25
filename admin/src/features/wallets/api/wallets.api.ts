import type {
  ExecutePayoutValues,
  Payout,
  PayoutStatus,
  RejectPayoutValues,
  TenantBalance,
} from "../schemas/wallet.schema";
import { payoutSchema, tenantBalanceSchema } from "../schemas/wallet.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchTenantBalance(tenantId: string): Promise<TenantBalance> {
  const data = await apiClient.get<unknown>(`/admin/wallets/tenants/${tenantId}/balance`);
  return tenantBalanceSchema.parse(data);
}

export async function fetchPayoutsByStatus(status: PayoutStatus): Promise<Payout[]> {
  const data = await apiClient.get<unknown[]>(`/admin/wallets/payouts?status=${status}`);
  return payoutSchema.array().parse(data);
}

export interface PayoutActionResponse {
  id: string;
  status: string;
}

/** ADM-24: première validation, par un opérateur. */
export async function validatePayout(id: string): Promise<PayoutActionResponse> {
  return apiClient.post<PayoutActionResponse>(`/admin/wallets/payouts/${id}/validate`);
}

/**
 * ADM-24: seconde validation, par la finance — doit être une personne
 * distincte de l'opérateur qui a validé (règle des quatre yeux, imposée côté
 * backend par l'entité Payout : l'API renvoie une erreur si c'est le même
 * utilisateur).
 */
export async function approvePayout(id: string): Promise<PayoutActionResponse> {
  return apiClient.post<PayoutActionResponse>(`/admin/wallets/payouts/${id}/approve`);
}

export async function executePayout(
  id: string,
  values: ExecutePayoutValues,
): Promise<PayoutActionResponse> {
  return apiClient.post<PayoutActionResponse, ExecutePayoutValues>(
    `/admin/wallets/payouts/${id}/execute`,
    values,
  );
}

export async function rejectPayout(
  id: string,
  values: RejectPayoutValues,
): Promise<PayoutActionResponse> {
  return apiClient.post<PayoutActionResponse, RejectPayoutValues>(
    `/admin/wallets/payouts/${id}/reject`,
    values,
  );
}
