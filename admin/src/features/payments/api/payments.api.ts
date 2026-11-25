import type {
  PaymentProviderConfig,
  RefundPaymentValues,
  SetProviderConfigValues,
} from "../schemas/payment-provider.schema";
import { paymentProviderConfigSchema } from "../schemas/payment-provider.schema";

import { apiClient } from "@/lib/api-client";

/** ADM-20: liste des fournisseurs de paiement configurés (actifs ou non). */
export async function fetchPaymentProviders(): Promise<PaymentProviderConfig[]> {
  const data = await apiClient.get<unknown[]>("/admin/payments/providers");
  return paymentProviderConfigSchema.array().parse(data);
}

export interface SetProviderConfigResponse {
  id: string;
  code: string;
  isActive: boolean;
}

/** ADM-20: crée ou met à jour la configuration d'un fournisseur (clés chiffrées côté serveur). */
export async function setProviderConfig(
  values: SetProviderConfigValues,
): Promise<SetProviderConfigResponse> {
  return apiClient.post<SetProviderConfigResponse, SetProviderConfigValues>(
    "/admin/payments/providers",
    values,
  );
}

/** DELETE /admin/payments/providers/:code : refusé (409) si le fournisseur a déjà traité des paiements. */
export async function deleteProvider(code: string): Promise<{ code: string; deleted: boolean }> {
  return apiClient.delete<{ code: string; deleted: boolean }>(`/admin/payments/providers/${code}`);
}

export interface ToggleProviderResponse {
  code: string;
  isActive: boolean;
}

/** ADM-20: active/désactive un fournisseur sans toucher à ses identifiants. */
export async function toggleProvider(code: string, isActive: boolean): Promise<ToggleProviderResponse> {
  return apiClient.post<ToggleProviderResponse, { isActive: boolean }>(
    `/admin/payments/providers/${code}/toggle`,
    { isActive },
  );
}

export interface RefundPaymentResponse {
  paymentId: string;
  refunded: boolean;
}

/** ADM-26: traite une demande de remboursement pour un paiement existant. */
export async function refundPayment(
  paymentId: string,
  values: RefundPaymentValues,
): Promise<RefundPaymentResponse> {
  const payload = { amount: values.amount, reason: values.reason || undefined };
  return apiClient.post<RefundPaymentResponse, typeof payload>(
    `/admin/payments/${paymentId}/refund`,
    payload,
  );
}
