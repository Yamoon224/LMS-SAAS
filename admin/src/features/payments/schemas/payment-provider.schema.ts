import { z } from "zod";

/** Doit rester cohérent avec PaymentProviderCodeDto (SetProviderConfigDto). */
export const paymentProviderCodeSchema = z.enum(["PAYSTACK", "PIXEL_INNOV", "OTHER"]);
export type PaymentProviderCode = z.infer<typeof paymentProviderCodeSchema>;

export const PAYMENT_PROVIDER_CODE_LABELS: Record<PaymentProviderCode, string> = {
  PAYSTACK: "Paystack",
  PIXEL_INNOV: "Pixel Innov",
  OTHER: "Autre",
};

/** Doit rester cohérent avec PaymentMethodDto. */
export const paymentMethodSchema = z.enum([
  "CARD",
  "ORANGE_MONEY",
  "MTN_MOMO",
  "MOOV_MONEY",
  "WAVE",
  "OTHER",
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: "Carte bancaire",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  WAVE: "Wave",
  OTHER: "Autre",
};

/**
 * Représentation d'un fournisseur configuré (GET /admin/payments/providers).
 * Les identifiants/clés chiffrés ne sont jamais renvoyés par le backend
 * (section 11, "secrets chiffrés") — ce schéma ne les attend donc pas.
 */
export const paymentProviderConfigSchema = z
  .object({
    id: z.string(),
    code: paymentProviderCodeSchema,
    label: z.string(),
    isActive: z.boolean(),
    isTestMode: z.boolean(),
    priority: z.number(),
    supportedMethods: z.array(paymentMethodSchema),
  })
  .passthrough();
export type PaymentProviderConfig = z.infer<typeof paymentProviderConfigSchema>;

/**
 * Doit rester cohérent avec SetProviderConfigDto. Les identifiants sont
 * saisis à chaque modification (jamais pré-remplis : le backend ne les
 * renvoie jamais en clair) et chiffrés côté serveur avant stockage.
 */
export const setProviderConfigSchema = z.object({
  code: paymentProviderCodeSchema,
  label: z.string().min(2, "2 caractères minimum.").max(100),
  isActive: z.boolean().default(false),
  isTestMode: z.boolean().default(true),
  priority: z.coerce.number().int().min(0),
  supportedMethods: z.array(paymentMethodSchema).min(1, "Sélectionnez au moins un moyen de paiement."),
  credentials: z.record(z.string(), z.string()),
});
export type SetProviderConfigValues = z.infer<typeof setProviderConfigSchema>;

/** Doit rester cohérent avec RefundPaymentDto. */
export const refundPaymentSchema = z.object({
  amount: z.coerce.number().int().min(1, "Montant positif requis."),
  reason: z.string().max(500).optional().or(z.literal("")),
});
export type RefundPaymentValues = z.infer<typeof refundPaymentSchema>;
