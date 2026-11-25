import { z } from "zod";

/**
 * Seuil minimum de reversement par défaut (MINIMUM_PAYOUT_THRESHOLD, backend/.../wallets/application/retention-period.ts).
 * Affiché à titre indicatif uniquement: le backend reste l'arbitre et rejette une demande sous le seuil.
 */
export const DEFAULT_MINIMUM_PAYOUT_THRESHOLD = 10000;

/** GET /business/wallet/balance — TenantBalance (grand livre, BE-06). */
export const tenantBalanceSchema = z.object({
  currency: z.string(),
  pendingAmount: z.number(),
  availableAmount: z.number(),
  payoutsExecutedAmount: z.number(),
});
export type TenantBalance = z.infer<typeof tenantBalanceSchema>;

/** Doit rester cohérent avec PayoutStatus (backend/.../wallets/domain/payout-status.ts). */
export const payoutStatusSchema = z.enum(["REQUESTED", "VALIDATED", "APPROVED", "EXECUTED", "REJECTED"]);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  REQUESTED: "Demandé",
  VALIDATED: "Validé (opérateur)",
  APPROVED: "Approuvé (finance)",
  EXECUTED: "Exécuté",
  REJECTED: "Rejeté",
};

export const payoutDestinationTypeSchema = z.enum(["BANK", "MOBILE_MONEY"]);
export const PAYOUT_DESTINATION_LABELS: Record<z.infer<typeof payoutDestinationTypeSchema>, string> = {
  BANK: "Compte bancaire",
  MOBILE_MONEY: "Mobile Money",
};

/** GET /business/wallet/payouts (ENT-69) — numéro de compte masqué côté serveur. */
export const payoutItemSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: payoutStatusSchema,
  destinationType: payoutDestinationTypeSchema,
  accountName: z.string(),
  accountNumberMasked: z.string(),
  rejectionReason: z.string().nullish(),
  requestedAt: z.coerce.date().nullish(),
});
export type PayoutItem = z.infer<typeof payoutItemSchema>;

/** Doit rester cohérent avec RequestPayoutDto (ENT-69/ENT-11). */
export const requestPayoutSchema = z.object({
  type: payoutDestinationTypeSchema,
  accountNumber: z.string().trim().min(4, "Au moins 4 caractères.").max(40, "40 caractères maximum."),
  accountName: z.string().trim().min(2, "Au moins 2 caractères.").max(200, "200 caractères maximum."),
});
export type RequestPayoutValues = z.infer<typeof requestPayoutSchema>;

/** GET /business/wallet/transactions — historique des ventes (ENT-68). */
export const transactionSchema = z.object({
  id: z.string(),
  channel: z.enum(["ONLINE", "OFFLINE"]),
  status: z.string().nullable(),
  courseTitle: z.string(),
  reference: z.string(),
  currency: z.string(),
  gross: z.number(),
  commission: z.number().nullable(),
  fee: z.number(),
  net: z.number().nullable(),
  occurredAt: z.coerce.date(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const TRANSACTION_CHANNEL_LABELS: Record<Transaction["channel"], string> = {
  ONLINE: "En ligne",
  OFFLINE: "Hors plateforme",
};
