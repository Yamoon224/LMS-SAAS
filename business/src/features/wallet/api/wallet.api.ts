import type { PayoutItem, TenantBalance, Transaction } from "../schemas/wallet.schema";
import { payoutItemSchema, tenantBalanceSchema, transactionSchema } from "../schemas/wallet.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/wallet/balance (GetTenantBalanceUseCase) — ENT-69. */
export async function fetchBalance(): Promise<TenantBalance> {
  const data = await apiClient.get<unknown>("/business/wallet/balance");
  return tenantBalanceSchema.parse(data);
}

/** GET /business/wallet/payouts — historique des reversements (ENT-69). */
export async function fetchPayouts(): Promise<PayoutItem[]> {
  const data = await apiClient.get<unknown[]>("/business/wallet/payouts");
  return payoutItemSchema.array().parse(data);
}

export interface RequestPayoutResponse {
  id: string;
  amount: number;
  status: string;
}

/** POST /business/wallet/payouts — le montant est TOUJOURS le solde disponible (décidé par le backend, RG-23). */
/** La destination est le compte vérifié enregistré dans les Paramètres : aucun champ n'est envoyé (ENT-11). */
export async function requestPayout(): Promise<RequestPayoutResponse> {
  return apiClient.post<RequestPayoutResponse, Record<string, never>>("/business/wallet/payouts", {});
}

/** GET /business/wallet/transactions — ventes en ligne et paiements hors plateforme (ENT-68). */
export async function fetchTransactions(): Promise<Transaction[]> {
  const data = await apiClient.get<unknown[]>("/business/wallet/transactions");
  return transactionSchema.array().parse(data);
}

/** URL du relevé PDF d'un reversement exécuté, servie par le proxy (le cookie httpOnly suffit) — ENT-69. */
export function payoutStatementUrl(payoutId: string): string {
  return `/api/backend/business/wallet/payouts/${encodeURIComponent(payoutId)}/statement`;
}
