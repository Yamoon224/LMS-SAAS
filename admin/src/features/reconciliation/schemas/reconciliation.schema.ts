import { z } from "zod";

export const WEBHOOK_OUTCOME_LABELS: Record<string, string> = {
  ERROR: "Erreur de traitement",
  UNKNOWN_REFERENCE: "Paiement inconnu",
};

/** GET /admin/reconciliation (backend/.../payments/application/reconciliation.use-cases.ts). */
export const reconciliationOverviewSchema = z.object({
  stalePendingPayments: z.array(
    z.object({
      id: z.string(),
      tenantId: z.string(),
      providerCode: z.string(),
      providerReference: z.string(),
      method: z.string(),
      amount: z.number(),
      currency: z.string(),
      createdAt: z.coerce.date(),
    }),
  ),
  webhookFailures: z.array(
    z.object({
      id: z.string(),
      providerCode: z.string(),
      outcome: z.string(),
      receivedAt: z.coerce.date(),
      providerReference: z.string().nullable(),
      resolvedAt: z.coerce.date().nullable(),
      replayable: z.boolean(),
    }),
  ),
  suspectedDuplicates: z.array(
    z.object({
      paymentId: z.string(),
      originalPaymentId: z.string(),
      tenantId: z.string(),
      amount: z.number(),
      currency: z.string(),
      createdAt: z.coerce.date(),
      originalCreatedAt: z.coerce.date(),
    }),
  ),
});
export type ReconciliationOverview = z.infer<typeof reconciliationOverviewSchema>;
export type PendingPayment = ReconciliationOverview["stalePendingPayments"][number];
export type WebhookFailure = ReconciliationOverview["webhookFailures"][number];
export type SuspectedDuplicate = ReconciliationOverview["suspectedDuplicates"][number];

/** POST /admin/reconciliation/webhooks/:id/replay */
export const replayResultSchema = z.object({ outcome: z.string() });

const OUTCOME_MESSAGES: Record<string, string> = {
  PROCESSED: "Webhook rejoué : le paiement a été traité.",
  DUPLICATE: "Paiement déjà traité : aucun effet (rejeu idempotent).",
  UNKNOWN_REFERENCE: "Paiement toujours introuvable chez la plateforme : le webhook reste à traiter.",
};

export function describeReplayOutcome(outcome: string): string {
  return OUTCOME_MESSAGES[outcome] ?? "Rejeu terminé.";
}

/** Âge lisible d'un paiement en attente (minutes, puis heures), pour repérer les plus anciens. */
export function formatAge(from: Date, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours} h` : `${Math.floor(hours / 24)} j`;
}
