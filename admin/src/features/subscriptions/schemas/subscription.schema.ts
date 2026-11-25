import { z } from "zod";

import { billingPeriodSchema } from "@/features/plans/schemas/plan.schema";

/** Doit rester cohérent avec SubscribeToPlanDto. */
export const assignSubscriptionSchema = z.object({
  planPriceId: z.string().min(1, "Sélectionnez un prix de plan."),
  startWithTrial: z.boolean().default(false),
});
export type AssignSubscriptionValues = z.infer<typeof assignSubscriptionSchema>;

export const subscriptionSchema = z
  .object({
    id: z.string(),
    status: z.string(),
  })
  .passthrough();
export type Subscription = z.infer<typeof subscriptionSchema>;

/** Doit rester cohérent avec SubscriptionStatus (backend/.../subscriptions/domain/subscription-status.ts). */
export const subscriptionStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "TRIALING",
  "ACTIVE",
  "GRACE_PERIOD",
  "EXPIRED",
  "CANCELED",
  "SUSPENDED",
]);
export type SubscriptionStatusValue = z.infer<typeof subscriptionStatusSchema>;

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatusValue, string> = {
  PENDING_PAYMENT: "En attente de paiement",
  TRIALING: "Période d'essai",
  ACTIVE: "Actif",
  GRACE_PERIOD: "Période de grâce",
  EXPIRED: "Expiré",
  CANCELED: "Résilié",
  SUSPENDED: "Suspendu",
};

/** Doit rester cohérent avec SubscriptionWithPlanDetails (GET /admin/tenants/:tenantId/subscription). */
export const tenantSubscriptionSchema = z.object({
  id: z.string(),
  status: subscriptionStatusSchema,
  autoRenew: z.boolean(),
  startedAt: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  graceEndsAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  planPriceId: z.string(),
  planName: z.string(),
  period: billingPeriodSchema,
  currency: z.string(),
  amount: z.number(),
});
export type TenantSubscription = z.infer<typeof tenantSubscriptionSchema>;
