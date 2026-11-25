import { z } from "zod";

/** Bornes alignées sur backend/.../platform-settings/domain/finance-settings.ts (le serveur reste l'arbitre). */
export const MAX_RETENTION_DAYS = 90;
export const MAX_PAYOUT_THRESHOLD = 1_000_000_000;

export const payoutFrequencySchema = z.enum(["MANUAL", "WEEKLY", "MONTHLY"]);
export const feeBearerSchema = z.enum(["TENANT", "PLATFORM"]);

export const PAYOUT_FREQUENCY_LABELS: Record<z.infer<typeof payoutFrequencySchema>, string> = {
  MANUAL: "Manuel (aucune demande automatique)",
  WEEKLY: "Hebdomadaire (le lundi)",
  MONTHLY: "Mensuel (le 1er du mois)",
};

export const FEE_BEARER_LABELS: Record<z.infer<typeof feeBearerSchema>, string> = {
  TENANT: "L'entreprise (déduits de son net)",
  PLATFORM: "La plateforme (net de l'entreprise inchangé)",
};

export const financeSettingsSchema = z.object({
  retentionDays: z.number().int().min(0).max(MAX_RETENTION_DAYS),
  minimumPayoutThreshold: z.number().int().min(0).max(MAX_PAYOUT_THRESHOLD),
  payoutFrequency: payoutFrequencySchema,
  transactionFeeBearer: feeBearerSchema,
});
export type FinanceSettings = z.infer<typeof financeSettingsSchema>;

/** GET /admin/finance-settings */
export const financeSettingsResponseSchema = z.object({
  settings: financeSettingsSchema,
  defaults: financeSettingsSchema,
  limits: z.object({ maxRetentionDays: z.number(), maxPayoutThreshold: z.number() }),
});
export type FinanceSettingsResponse = z.infer<typeof financeSettingsResponseSchema>;

/** Valeurs du formulaire : les nombres sont saisis en texte puis validés (messages d'erreur en français). */
export const financeSettingsFormSchema = z.object({
  retentionDays: z
    .string()
    .trim()
    .regex(/^\d+$/, "Saisissez un nombre entier de jours.")
    .refine((value) => Number(value) <= MAX_RETENTION_DAYS, `Le délai ne peut pas dépasser ${MAX_RETENTION_DAYS} jours.`),
  minimumPayoutThreshold: z
    .string()
    .trim()
    .regex(/^\d+$/, "Saisissez un montant entier positif ou nul.")
    .refine((value) => Number(value) <= MAX_PAYOUT_THRESHOLD, "Ce seuil est trop élevé."),
  payoutFrequency: payoutFrequencySchema,
  transactionFeeBearer: feeBearerSchema,
});
export type FinanceSettingsFormValues = z.infer<typeof financeSettingsFormSchema>;

export function toFormValues(settings: FinanceSettings): FinanceSettingsFormValues {
  return {
    retentionDays: String(settings.retentionDays),
    minimumPayoutThreshold: String(settings.minimumPayoutThreshold),
    payoutFrequency: settings.payoutFrequency,
    transactionFeeBearer: settings.transactionFeeBearer,
  };
}

/** Ne renvoie que les champs réellement modifiés : rien à envoyer si l'Admin n'a rien changé. */
export function buildSettingsPatch(current: FinanceSettings, values: FinanceSettingsFormValues): Partial<FinanceSettings> {
  const patch: Partial<FinanceSettings> = {};
  const retentionDays = Number(values.retentionDays);
  const minimumPayoutThreshold = Number(values.minimumPayoutThreshold);
  if (retentionDays !== current.retentionDays) patch.retentionDays = retentionDays;
  if (minimumPayoutThreshold !== current.minimumPayoutThreshold) patch.minimumPayoutThreshold = minimumPayoutThreshold;
  if (values.payoutFrequency !== current.payoutFrequency) patch.payoutFrequency = values.payoutFrequency;
  if (values.transactionFeeBearer !== current.transactionFeeBearer) patch.transactionFeeBearer = values.transactionFeeBearer;
  return patch;
}
