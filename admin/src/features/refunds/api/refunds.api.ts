import { refundRequestSchema } from "../schemas/refund.schema";
import type { RefundRequest, RefundStatus } from "../schemas/refund.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchRefundsByStatus(status: RefundStatus): Promise<RefundRequest[]> {
  const data = await apiClient.get<unknown[]>(`/admin/refunds?status=${status}`);
  return refundRequestSchema.array().parse(data);
}

/** POST /admin/refunds/:id/execute — rembourse via le fournisseur de paiement d'origine. */
export async function executeRefund(id: string): Promise<{ id: string; status: string }> {
  return apiClient.post<{ id: string; status: string }>(`/admin/refunds/${id}/execute`);
}
