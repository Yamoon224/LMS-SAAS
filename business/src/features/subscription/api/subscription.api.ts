import {
  currentSubscriptionSchema,
  invoiceSchema,
  planChangePreviewSchema,
  publicPlanSchema,
  quotaUsageSchema,
} from "../schemas/subscription.schema";
import type {
  ChangePlanValues,
  CurrentSubscription,
  Invoice,
  PlanChangePreview,
  PublicPlan,
  QuotaUsage,
  SubscribeValues,
} from "../schemas/subscription.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/subscription — abonnement courant (ENT-07). 404 si aucun abonnement actif. */
export async function fetchCurrentSubscription(): Promise<CurrentSubscription> {
  return currentSubscriptionSchema.parse(await apiClient.get<unknown>("/business/subscription"));
}

/** GET /business/plans — plans publics avec prix et quotas (ENT-01). */
export async function fetchPublicPlans(): Promise<PublicPlan[]> {
  return publicPlanSchema.array().parse(await apiClient.get<unknown[]>("/business/plans"));
}

/** GET /business/plans/usage — usage courant de chaque quota (ENT-07). */
export async function fetchQuotaUsage(): Promise<QuotaUsage[]> {
  return quotaUsageSchema.array().parse(await apiClient.get<unknown[]>("/business/plans/usage"));
}

/** POST /business/subscription — souscription (ENT-01/ENT-02). */
export async function subscribeToPlan(values: SubscribeValues): Promise<{ id: string; status: string }> {
  return apiClient.post<{ id: string; status: string }, SubscribeValues>("/business/subscription", values);
}

/** POST /business/subscription/change-plan — le backend décide de l'immédiateté (ENT-04). */
export async function changePlan(values: ChangePlanValues): Promise<{ immediate: boolean }> {
  return apiClient.post<{ immediate: boolean }, ChangePlanValues>("/business/subscription/change-plan", values);
}

/** GET /business/subscription/change-plan/preview — prorata avant confirmation (ENT-04). */
export async function previewPlanChange(newPlanPriceId: string): Promise<PlanChangePreview> {
  return planChangePreviewSchema.parse(
    await apiClient.get<unknown>(
      `/business/subscription/change-plan/preview?newPlanPriceId=${encodeURIComponent(newPlanPriceId)}`,
    ),
  );
}

/** DELETE /business/subscription/change-plan/pending — annule la descente de gamme planifiée (ENT-04). */
export async function cancelPendingPlanChange(): Promise<void> {
  await apiClient.delete<void>("/business/subscription/change-plan/pending");
}

/** PATCH /business/subscription/auto-renew — interrupteur du renouvellement automatique (ENT-03). */
export async function setAutoRenew(autoRenew: boolean): Promise<{ autoRenew: boolean }> {
  return apiClient.patch<{ autoRenew: boolean }, { autoRenew: boolean }>("/business/subscription/auto-renew", {
    autoRenew,
  });
}

/** GET /business/billing/invoices — paiements encaissés (abonnements, crédits IA) (ENT-05). */
export async function fetchInvoices(): Promise<Invoice[]> {
  return invoiceSchema.array().parse(await apiClient.get<unknown[]>("/business/billing/invoices"));
}

/** URL de téléchargement de la facture PDF, servie par le proxy (le cookie httpOnly suffit). */
export function invoicePdfUrl(paymentId: string): string {
  return `/api/backend/business/billing/invoices/${encodeURIComponent(paymentId)}/pdf`;
}
