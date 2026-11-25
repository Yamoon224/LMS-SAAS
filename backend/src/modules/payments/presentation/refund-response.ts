import { isWithinAutomaticWindow } from "../domain/refund-request";
import type { RefundRequest } from "../domain/refund-request";

/** Représentation commune d'une demande (jamais d'identifiant de fournisseur ni de données de paiement brutes). */
export function toRefundResponse(request: RefundRequest) {
  return {
    id: request.id,
    amount: request.amount,
    currency: request.currency,
    reason: request.reason,
    decisionNote: request.decisionNote,
    status: request.status,
    requestedAt: request.requestedAt,
    resolvedAt: request.resolvedAt,
    enrollmentId: request.enrollmentId,
    courseTitle: request.courseTitle,
    learnerName: request.learnerName,
    learnerEmail: request.learnerEmail,
    withinAutomaticWindow: isWithinAutomaticWindow(request.paidAt, request.requestedAt),
    /** Étape 30 : critères de la politique (section 9.5) évalués à la demande ; null pour une demande antérieure. */
    eligibility: request.eligibility ?? null,
    autoAccepted: request.autoAccepted ?? false,
  };
}
