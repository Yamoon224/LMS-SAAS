import { z } from "zod";

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
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  PENDING_PAYMENT: "Paiement en attente",
  TRIALING: "Période d’essai",
  ACTIVE: "Active",
  GRACE_PERIOD: "Période de grâce",
  EXPIRED: "Expirée",
  CANCELED: "Résiliée",
  SUSPENDED: "Suspendue",
};

/** GET /business/subscription (BusinessSubscriptionsController.getCurrent). */
export const currentSubscriptionSchema = z.object({
  id: z.string(),
  status: subscriptionStatusSchema,
  planPriceId: z.string(),
  autoRenew: z.boolean(),
  startedAt: z.coerce.date().nullish(),
  currentPeriodEnd: z.coerce.date().nullish(),
  graceEndsAt: z.coerce.date().nullish(),
  /** Descente de gamme planifiée à l'échéance (étape 31) ; annulable tant qu'elle n'est pas appliquée. */
  pendingPlanPriceId: z.string().nullish(),
  pendingChangeAt: z.coerce.date().nullish(),
  lastRenewal: z
    .object({
      status: z.enum(["PENDING", "SUCCEEDED", "FAILED"]),
      at: z.coerce.date().nullish(),
      amount: z.number().nullish(),
      paymentUrl: z.string().nullish(),
    })
    .nullish(),
});
export type CurrentSubscription = z.infer<typeof currentSubscriptionSchema>;

export const RENEWAL_STATUS_LABELS = {
  PENDING: "En attente de paiement",
  SUCCEEDED: "Renouvelé",
  FAILED: "Échec — paiement non reçu",
} as const;

/** GET /business/subscription/change-plan/preview (domain/billing-math.ts : ProrationResult). */
export const planChangePreviewSchema = z.object({
  direction: z.enum(["UPGRADE", "DOWNGRADE", "SAME", "INCOMPARABLE"]),
  timing: z.enum(["IMMEDIATE", "AT_PERIOD_END"]),
  currency: z.string(),
  totalDays: z.number(),
  remainingDays: z.number(),
  creditAmount: z.number(),
  chargeAmount: z.number(),
  amountDue: z.number(),
  newPlanPriceId: z.string(),
  effectiveAt: z.coerce.date().nullish(),
});
export type PlanChangePreview = z.infer<typeof planChangePreviewSchema>;

/** Doit rester cohérent avec BillingPeriod (backend/.../plans/domain/billing-period.ts). */
export const billingPeriodSchema = z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]);
export type BillingPeriod = z.infer<typeof billingPeriodSchema>;

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  YEARLY: "Annuel",
};

export const MONTHS_PER_PERIOD: Record<BillingPeriod, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

const planPriceSchema = z.object({
  id: z.string(),
  period: billingPeriodSchema,
  currency: z.string(),
  amount: z.number(),
  trialDays: z.number(),
});
export type PlanPrice = z.infer<typeof planPriceSchema>;

/** Quotas d'un plan (backend/.../plans/domain/plan-quotas.ts) — absent ou null = illimité. */
const planQuotasSchema = z.object({
  maxCourses: z.number().nullish(),
  maxActiveLearners: z.number().nullish(),
  maxManagers: z.number().nullish(),
  storageGb: z.number().nullish(),
  liveSessionsPerMonth: z.number().nullish(),
});
export type PlanQuotas = z.infer<typeof planQuotasSchema>;

const planFeaturesSchema = z.object({
  aiTranslation: z.boolean().nullish(),
  aiTranslationCreditsIncluded: z.number().nullish(),
  customCertificates: z.boolean().nullish(),
  customDomain: z.boolean().nullish(),
});

/** GET /business/plans — comparatif des plans publics (ENT-01). */
export const publicPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  quotas: planQuotasSchema,
  features: planFeaturesSchema,
  prices: planPriceSchema.array(),
});
export type PublicPlan = z.infer<typeof publicPlanSchema>;

export const QUOTA_LABELS: Record<keyof PlanQuotas, string> = {
  maxCourses: "Formations",
  maxActiveLearners: "Apprenants actifs",
  maxManagers: "Gestionnaires",
  storageGb: "Stockage (Go)",
  liveSessionsPerMonth: "Sessions live / mois",
};

/** GET /business/plans/usage — jauges d'usage du plan courant (ENT-07). */
export const quotaUsageSchema = z.object({
  name: z.enum(["maxCourses", "maxActiveLearners", "maxManagers", "storageGb", "liveSessionsPerMonth"]),
  current: z.number(),
  limit: z.number().nullable(),
});
export type QuotaUsage = z.infer<typeof quotaUsageSchema>;

/** Corps de POST /business/subscription et /business/subscription/change-plan. */
export interface SubscribeValues {
  planPriceId: string;
  startWithTrial: boolean;
}
export interface ChangePlanValues {
  newPlanPriceId: string;
  isUpgrade: boolean;
}

/** Statuts d'un paiement facturable (backend/.../payments/domain/invoice.ts : INVOICEABLE_STATUSES). */
export const invoiceStatusSchema = z.enum(["SUCCEEDED", "REFUNDED", "PARTIALLY_REFUNDED"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  SUCCEEDED: "Payée",
  REFUNDED: "Remboursée",
  PARTIALLY_REFUNDED: "Partiellement remboursée",
};

/** GET /business/billing/invoices — historique des paiements et factures (ENT-05). */
export const invoiceSchema = z.object({
  paymentId: z.string(),
  number: z.string(),
  type: z.enum(["SUBSCRIPTION", "CREDIT_PURCHASE"]),
  method: z.string(),
  status: invoiceStatusSchema,
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  issuedAt: z.coerce.date(),
});
export type Invoice = z.infer<typeof invoiceSchema>;
