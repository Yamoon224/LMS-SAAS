import { z } from "zod";

export const PAYMENT_METHODS = ["CARD", "ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** GET /public/payments/methods : moyens inconnus ignorés (le backend peut en ajouter). */
export const methodsResponseSchema = z.object({ methods: z.array(z.string()) });

export function knownMethods(methods: string[]): PaymentMethod[] {
  return methods.filter((m): m is PaymentMethod => (PAYMENT_METHODS as readonly string[]).includes(m));
}

/** POST /public/enrollments/:id/pay */
export const payResultSchema = z.object({
  paymentId: z.string(),
  checkoutUrl: z.string().nullable().optional(),
  providerReference: z.string().optional(),
  isAsync: z.boolean().optional(),
});
export type PayResult = z.infer<typeof payResultSchema>;
