import { refundRequestSchema } from "../schemas/refund.schema";
import type { RefundRequest, RejectRefundValues } from "../schemas/refund.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/refunds — demandes de remboursement (ENT-70). */
export async function fetchRefunds(): Promise<RefundRequest[]> {
  return refundRequestSchema.array().parse(await apiClient.get<unknown[]>("/business/refunds"));
}

/** POST /business/refunds/:id/accept — `amount` omis = intégral ; l'Admin exécute ensuite le remboursement. */
export async function acceptRefund(id: string, amount?: number): Promise<{ id: string; status: string }> {
  return apiClient.post<{ id: string; status: string }, { amount?: number }>(
    `/business/refunds/${id}/accept`,
    amount === undefined ? {} : { amount },
  );
}

/** POST /business/refunds/:id/reject — motif obligatoire. */
export async function rejectRefund(id: string, values: RejectRefundValues): Promise<{ id: string; status: string }> {
  return apiClient.post<{ id: string; status: string }, RejectRefundValues>(`/business/refunds/${id}/reject`, values);
}
