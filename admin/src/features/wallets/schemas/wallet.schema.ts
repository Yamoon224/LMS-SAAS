import { z } from "zod";

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

export const tenantBalanceSchema = z
  .object({
    tenantId: z.string(),
    currency: z.string(),
    pendingAmount: z.number(),
    availableAmount: z.number(),
    payoutsExecutedAmount: z.number(),
  })
  .passthrough();
export type TenantBalance = z.infer<typeof tenantBalanceSchema>;

/** Représentation d'un reversement côté admin (GET /admin/wallets/payouts). */
export const payoutSchema = z
  .object({
    id: z.string(),
    tenantId: z.string(),
    amount: z.number(),
    status: payoutStatusSchema,
  })
  .passthrough();
export type Payout = z.infer<typeof payoutSchema>;

export const rejectPayoutSchema = z.object({
  reason: z.string().min(3, "3 caractères minimum.").max(500),
});
export type RejectPayoutValues = z.infer<typeof rejectPayoutSchema>;

export const executePayoutSchema = z.object({
  proofUrl: z.string().min(3, "3 caractères minimum.").max(2000),
});
export type ExecutePayoutValues = z.infer<typeof executePayoutSchema>;

export const tenantBalanceLookupSchema = z.object({
  tenantId: z.string().min(1, "Identifiant d'entreprise requis."),
});
export type TenantBalanceLookupValues = z.infer<typeof tenantBalanceLookupSchema>;
