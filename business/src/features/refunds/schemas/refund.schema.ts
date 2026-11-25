import { z } from "zod";

/** Doit rester cohérent avec RefundRequestStatus (backend/.../payments/domain/refund-request.ts). */
export const refundStatusSchema = z.enum(["REQUESTED", "ACCEPTED", "REFUNDED", "REJECTED"]);
export type RefundStatus = z.infer<typeof refundStatusSchema>;

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  REQUESTED: "À examiner",
  ACCEPTED: "Acceptée — en attente du remboursement",
  REFUNDED: "Remboursée",
  REJECTED: "Refusée",
};

/** Critères de la politique de remboursement (section 9.5), évalués à la demande et figés avec elle. */
export const refundEligibilitySchema = z.object({
  eligible: z.boolean(),
  withinWindow: z.boolean(),
  progressBelowLimit: z.boolean(),
  noAssessmentSubmitted: z.boolean(),
  noCertificate: z.boolean(),
  progressPercent: z.number(),
});
export type RefundEligibility = z.infer<typeof refundEligibilitySchema>;

export interface EligibilityCriterion {
  label: string;
  met: boolean;
}

/** Les quatre critères dans l'ordre de la politique, prêts à afficher (remplis / non remplis). */
export function eligibilityCriteria(eligibility: RefundEligibility): EligibilityCriterion[] {
  return [
    { label: "Achat de 7 jours au plus", met: eligibility.withinWindow },
    { label: `Progression inférieure à 20 % (actuelle : ${eligibility.progressPercent} %)`, met: eligibility.progressBelowLimit },
    { label: "Aucun quiz ni examen soumis", met: eligibility.noAssessmentSubmitted },
    { label: "Aucun certificat délivré", met: eligibility.noCertificate },
  ];
}

/** GET /business/refunds — demandes de remboursement des apprenants (ENT-70). */
export const refundRequestSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  reason: z.string().nullable(),
  decisionNote: z.string().nullable(),
  status: refundStatusSchema,
  requestedAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable(),
  courseTitle: z.string(),
  learnerName: z.string(),
  learnerEmail: z.string(),
  /** Indicatif : demande faite dans les 7 jours suivant l'achat (section 9.5). */
  withinAutomaticWindow: z.boolean(),
  /** Absent pour une demande antérieure à l'évaluation automatique. */
  eligibility: refundEligibilitySchema.nullish(),
  /** Acceptée automatiquement (conditions remplies) : il ne reste que l'exécution par l'administrateur. */
  autoAccepted: z.boolean().default(false),
});
export type RefundRequest = z.infer<typeof refundRequestSchema>;

/** Refus : motif obligatoire (ENT-70). */
export const rejectRefundSchema = z.object({
  note: z.string().trim().min(1, "Le motif du refus est obligatoire.").max(1000, "1000 caractères maximum."),
});
export type RejectRefundValues = z.infer<typeof rejectRefundSchema>;

/**
 * Acceptation : montant accordé saisi en texte. Vide ou égal au maximum = remboursement intégral (aucun montant
 * n'est alors envoyé) ; sinon un entier strictement positif inférieur au montant payé = remboursement partiel.
 */
export function parseAcceptedAmount(
  text: string,
  max: number,
): { ok: true; amount: number | undefined } | { ok: false; error: string } {
  // \s couvre déjà l'espace insécable et l'espace fine insécable.
  const trimmed = text.replace(/\s/g, "");
  if (trimmed === "") return { ok: true, amount: undefined };
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: "Saisissez un montant entier, sans décimale." };
  const amount = Number(trimmed);
  if (amount <= 0) return { ok: false, error: "Le montant doit être supérieur à zéro." };
  if (amount > max) return { ok: false, error: "Le montant ne peut pas dépasser le montant payé." };
  return { ok: true, amount: amount === max ? undefined : amount };
}
