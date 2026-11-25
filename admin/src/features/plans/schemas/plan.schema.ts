import { z } from "zod";

/** Doit rester cohérent avec backend/.../plans/domain/billing-period.ts (BillingPeriod enum). */
export const billingPeriodSchema = z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]);
export type BillingPeriod = z.infer<typeof billingPeriodSchema>;

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  YEARLY: "Annuel",
};

/** Doit rester cohérent avec plan-quotas.ts (PlanQuotas). `undefined` = illimité. */
export const planQuotasSchema = z.object({
  maxCourses: z.coerce.number().int().min(0).optional(),
  maxActiveLearners: z.coerce.number().int().min(0).optional(),
  maxManagers: z.coerce.number().int().min(0).optional(),
  storageGb: z.coerce.number().int().min(0).optional(),
  liveSessionsPerMonth: z.coerce.number().int().min(0).optional(),
});
export type PlanQuotas = z.infer<typeof planQuotasSchema>;

/** Doit rester cohérent avec plan-quotas.ts (PlanFeatures). */
export const planFeaturesSchema = z.object({
  aiTranslation: z.boolean().optional(),
  aiTranslationCreditsIncluded: z.coerce.number().int().min(0).optional(),
  customCertificates: z.boolean().optional(),
  customDomain: z.boolean().optional(),
});
export type PlanFeatures = z.infer<typeof planFeaturesSchema>;

export const planPriceSchema = z.object({
  id: z.string(),
  period: billingPeriodSchema,
  currency: z.string(),
  amount: z.number(),
  trialDays: z.number(),
  version: z.number(),
  isActive: z.boolean(),
});
export type PlanPrice = z.infer<typeof planPriceSchema>;

/** Représentation d'un plan côté admin (GET /admin/plans). */
export const planSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    isPublic: z.boolean(),
    isArchived: z.boolean(),
    quotas: planQuotasSchema,
    features: planFeaturesSchema,
    commissionRatePercent: z.number().nullish(),
    prices: z.array(planPriceSchema).default([]),
  })
  .passthrough();
export type Plan = z.infer<typeof planSchema>;

/** Doit rester cohérent avec CreatePlanDto. */
export const createPlanSchema = z.object({
  name: z.string().min(2, "2 caractères minimum.").max(100),
  description: z.string().max(2000).optional().or(z.literal("")),
  isPublic: z.boolean(),
  quotas: planQuotasSchema,
  features: planFeaturesSchema,
  commissionRatePercent: z.coerce.number().min(0).max(100).optional(),
});
export type CreatePlanValues = z.infer<typeof createPlanSchema>;

/** Doit rester cohérent avec SetPlanPriceDto. */
export const setPlanPriceSchema = z.object({
  period: billingPeriodSchema,
  currency: z.string().length(3, "Code devise ISO sur 3 lettres (ex. XOF)."),
  amount: z.coerce.number().int().min(0, "Montant positif requis."),
  trialDays: z.coerce.number().int().min(0).default(0),
});
export type SetPlanPriceValues = z.infer<typeof setPlanPriceSchema>;
