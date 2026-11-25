import { z } from "zod";

/** Doit rester cohérent avec RefundRequestStatus (backend/.../payments/domain/refund-request.ts). */
export const refundStatusSchema = z.enum(["REQUESTED", "ACCEPTED", "REFUNDED", "REJECTED"]);
export type RefundStatus = z.infer<typeof refundStatusSchema>;

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  REQUESTED: "À examiner (entreprise)",
  ACCEPTED: "À rembourser",
  REFUNDED: "Remboursées",
  REJECTED: "Refusées",
};

export const REFUND_STATUS_ORDER: RefundStatus[] = ["ACCEPTED", "REQUESTED", "REFUNDED", "REJECTED"];

/** GET /admin/refunds?status= — suivi des demandes de remboursement (ADM-26). */
export const refundRequestSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  amount: z.number(),
  currency: z.string(),
  reason: z.string().nullable(),
  decisionNote: z.string().nullable(),
  status: refundStatusSchema,
  requestedAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable(),
  courseTitle: z.string(),
  learnerName: z.string(),
  learnerEmail: z.string(),
});
export type RefundRequest = z.infer<typeof refundRequestSchema>;
