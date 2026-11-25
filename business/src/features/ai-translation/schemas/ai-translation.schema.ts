import { z } from "zod";

/** GET /business/ai-translation/wallet. */
export const creditBalanceSchema = z.object({ balance: z.number() });

/** Doit rester cohérent avec CreditLedgerType (backend/.../ai-translation/domain/credit-ledger-type.ts). */
export const creditLedgerTypeSchema = z.enum(["PURCHASE", "DEBIT", "REFUND", "EXPIRATION", "PLAN_GRANT"]);
export type CreditLedgerType = z.infer<typeof creditLedgerTypeSchema>;

export const CREDIT_LEDGER_LABELS: Record<CreditLedgerType, string> = {
  PURCHASE: "Achat de pack",
  DEBIT: "Traduction",
  REFUND: "Remboursement",
  EXPIRATION: "Expiration",
  PLAN_GRANT: "Crédits du plan",
};

/** GET /business/ai-translation/wallet/ledger (CreditLedgerEntryRecord). */
export const ledgerEntrySchema = z.object({
  id: z.string(),
  type: creditLedgerTypeSchema,
  amount: z.number(),
  note: z.string().nullish(),
  createdAt: z.coerce.date(),
});
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

/** GET /business/plans/credit-packs (CreditPackRecord). */
export const creditPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  creditsAmount: z.number(),
  price: z.number(),
  currency: z.string(),
});
export type CreditPack = z.infer<typeof creditPackSchema>;

/** Doit rester cohérent avec TranslationJobStatus (backend/.../translation-job-status.ts). */
export const translationJobStatusSchema = z.enum(["ESTIMATED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "FAILED"]);
export type TranslationJobStatus = z.infer<typeof translationJobStatusSchema>;

export const TRANSLATION_JOB_STATUS_LABELS: Record<TranslationJobStatus, string> = {
  ESTIMATED: "Estimée",
  CONFIRMED: "Confirmée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  FAILED: "Échouée",
};

/** POST .../courses/:courseId/estimate. */
export const translationEstimateSchema = z.object({
  id: z.string(),
  status: translationJobStatusSchema,
  estimatedCredits: z.number().nullish(),
  wordCount: z.number().nullish(),
  targetLocale: z.string(),
});
export type TranslationEstimate = z.infer<typeof translationEstimateSchema>;

/** GET .../courses/:courseId/jobs. */
export const translationJobSchema = z.object({
  id: z.string(),
  targetLocale: z.string(),
  status: translationJobStatusSchema,
  estimatedCredits: z.number().nullish(),
});
export type TranslationJob = z.infer<typeof translationJobSchema>;

/**
 * La langue cible est choisie dans la liste des langues activées par la plateforme (ADM-40) ; le backend refuse
 * toute autre valeur (EstimateTranslationUseCase).
 */
export const estimateTranslationSchema = z.object({
  targetLocale: z.string().trim().min(2, "Choisissez une langue cible."),
});
export type EstimateTranslationValues = z.infer<typeof estimateTranslationSchema>;

/** Doit rester cohérent avec PurchaseCreditPackDto. */
export const PAYMENT_METHODS = ["CARD", "ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: "Carte bancaire",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  WAVE: "Wave",
  OTHER: "Autre",
};

export const purchaseCreditPackSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  customerEmail: z.string().trim().email("E-mail invalide.").or(z.literal("")),
});
export type PurchaseCreditPackValues = z.infer<typeof purchaseCreditPackSchema>;

/** Réponse de l'achat (InitiatePaymentResult). */
export const purchaseResultSchema = z.object({
  paymentId: z.string(),
  checkout: z.object({
    checkoutUrl: z.string().nullish(),
    providerReference: z.string(),
    isAsync: z.boolean(),
  }),
});
export type PurchaseResult = z.infer<typeof purchaseResultSchema>;

/** GET /business/languages — langues activées sur la plateforme (ADM-40). */
export const enabledLanguageSchema = z.object({
  code: z.string(),
  nativeName: z.string(),
  rtl: z.boolean(),
});
export type EnabledLanguage = z.infer<typeof enabledLanguageSchema>;

/** GET /business/ai-translation/courses/:courseId/translations — langues traduites d'une formation (PUB-17). */
export const courseTranslationSchema = z.object({
  locale: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  origin: z.enum(["SOURCE", "AI", "MANUAL"]),
  lessonsTranslated: z.number(),
  lessonsTotal: z.number(),
  coveragePercent: z.number(),
});
export type CourseTranslation = z.infer<typeof courseTranslationSchema>;

