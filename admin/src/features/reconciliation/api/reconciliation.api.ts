import { reconciliationOverviewSchema, replayResultSchema } from "../schemas/reconciliation.schema";
import type { ReconciliationOverview } from "../schemas/reconciliation.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchReconciliationOverview(): Promise<ReconciliationOverview> {
  return reconciliationOverviewSchema.parse(await apiClient.get<unknown>("/admin/reconciliation"));
}

/** POST /admin/reconciliation/webhooks/:id/replay — idempotent, audité. */
export async function replayWebhook(webhookEventId: string): Promise<{ outcome: string }> {
  return replayResultSchema.parse(
    await apiClient.post<unknown>(`/admin/reconciliation/webhooks/${encodeURIComponent(webhookEventId)}/replay`),
  );
}

/** POST /admin/reconciliation/duplicates/:paymentId/refund — remboursement intégral du doublon. */
export async function refundDuplicate(paymentId: string): Promise<unknown> {
  return apiClient.post<unknown>(`/admin/reconciliation/duplicates/${encodeURIComponent(paymentId)}/refund`);
}
