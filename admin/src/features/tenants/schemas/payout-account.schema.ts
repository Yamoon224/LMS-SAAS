import { z } from "zod";

/** Doit rester cohérent avec AdminPayoutAccountView (backend/.../tenants/application/payout-account-admin.use-cases.ts). */
export const payoutAccountViewSchema = z.object({
  type: z.enum(["MOBILE_MONEY", "BANK"]),
  operator: z.string().nullable(),
  accountName: z.string(),
  /** `***1234` : le numéro en clair n'est jamais renvoyé. */
  maskedNumber: z.string(),
});

export const tenantPayoutAccountSchema = z.object({
  account: payoutAccountViewSchema.nullable(),
  verified: z.boolean(),
});
export type TenantPayoutAccount = z.infer<typeof tenantPayoutAccountSchema>;

export const PAYOUT_TYPE_LABELS: Record<"MOBILE_MONEY" | "BANK", string> = {
  MOBILE_MONEY: "Mobile Money",
  BANK: "Compte bancaire",
};

export const MOBILE_OPERATOR_LABELS: Record<string, string> = {
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  WAVE: "Wave",
};
