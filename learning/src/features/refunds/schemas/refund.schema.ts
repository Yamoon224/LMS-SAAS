import { z } from "zod";

/** Doit rester cohérent avec RefundRequestStatus (backend/.../payments/domain/refund-request.ts). */
export const refundStatusSchema = z.enum(["REQUESTED", "ACCEPTED", "REFUNDED", "REJECTED"]);
export type RefundStatus = z.infer<typeof refundStatusSchema>;

/** GET /public/refunds/my */
export const myRefundSchema = z.object({
  id: z.string(),
  enrollmentId: z.string().nullable(),
  courseTitle: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: refundStatusSchema,
  reason: z.string().nullable(),
  decisionNote: z.string().nullable(),
  requestedAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type MyRefund = z.infer<typeof myRefundSchema>;
