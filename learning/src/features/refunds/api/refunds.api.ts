import { myRefundSchema } from "../schemas/refund.schema";
import type { MyRefund } from "../schemas/refund.schema";

import { apiClient } from "@/lib/api-client";


export interface RequestRefundInput {
  enrollmentId: string;
  reason?: string;
}

/** POST /public/refunds — demande de remboursement d'une formation achetée en ligne (section 9.5). */
export async function requestRefund(input: RequestRefundInput): Promise<{ id: string; status: string }> {
  return apiClient.post<{ id: string; status: string }, RequestRefundInput>("/public/refunds", input);
}

/** GET /public/refunds/my — suivi de mes demandes (statut, motif de refus). */
export async function fetchMyRefunds(): Promise<MyRefund[]> {
  return myRefundSchema.array().parse(await apiClient.get<unknown[]>("/public/refunds/my"));
}
