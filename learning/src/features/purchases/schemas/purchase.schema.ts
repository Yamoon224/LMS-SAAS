import { z } from "zod";

/** GET /public/payments/history (backend/.../payments/domain/purchase-history.ts). */
export const purchaseSchema = z.object({
  id: z.string(),
  kind: z.enum(["ONLINE", "OFFLINE"]),
  enrollmentId: z.string(),
  courseTitle: z.string(),
  amount: z.number(),
  currency: z.string(),
  method: z.string().nullable(),
  status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]).nullable(),
  refundStatus: z.enum(["REQUESTED", "ACCEPTED", "REFUNDED", "REJECTED"]).nullable(),
  purchasedAt: z.string(),
});
export type Purchase = z.infer<typeof purchaseSchema>;
