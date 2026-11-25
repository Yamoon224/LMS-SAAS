import { DomainError, InvalidStateTransitionError } from "@shared/errors";

import type { RefundEligibility } from "./refund-eligibility";

/** Doit rester cohérent avec l'enum Prisma RefundStatus. */
export type RefundRequestStatus = "REQUESTED" | "ACCEPTED" | "REFUNDED" | "REJECTED";

export type RefundDecision = "ACCEPT" | "REJECT" | "EXECUTE";

export class RefundNotEligibleError extends DomainError {
  readonly code = "REMBOURSEMENT_NON_ELIGIBLE";
}

export class RefundAlreadyRequestedError extends DomainError {
  readonly code = "REMBOURSEMENT_DEJA_DEMANDE";
}

export class RefundAmountInvalidError extends DomainError {
  readonly code = "MONTANT_REMBOURSEMENT_INVALIDE";
}

export class RefundDecisionNoteRequiredError extends DomainError {
  readonly code = "MOTIF_REFUS_REQUIS";
}

/** Fenêtre de remboursement intégral automatique proposée en section 9.5 (7 jours). */
export const AUTOMATIC_REFUND_WINDOW_DAYS = 7;

const NEXT_STATUS: Record<RefundRequestStatus, Partial<Record<RefundDecision, RefundRequestStatus>>> = {
  REQUESTED: { ACCEPT: "ACCEPTED", REJECT: "REJECTED" },
  ACCEPTED: { EXECUTE: "REFUNDED" },
  REFUNDED: {},
  REJECTED: {},
};

/**
 * ENT-70 : cycle de vie d'une demande. L'entreprise accepte ou refuse (refus motivé obligatoire),
 * puis l'Admin exécute le remboursement d'une demande acceptée.
 */
export function applyRefundDecision(
  current: RefundRequestStatus,
  decision: RefundDecision,
  note?: string,
): RefundRequestStatus {
  const next = NEXT_STATUS[current][decision];
  if (!next) {
    throw new InvalidStateTransitionError(`Décision ${decision} impossible pour une demande au statut ${current}.`);
  }
  if (decision === "REJECT" && !note?.trim()) {
    throw new RefundDecisionNoteRequiredError("Un refus de remboursement doit être motivé.");
  }
  return next;
}

/**
 * Montant accordé par l'entreprise : le montant demandé (paiement intégral) par défaut, ou une somme entière
 * inférieure pour un remboursement partiel. Jamais nul, jamais supérieur au montant payé.
 */
export function resolveApprovedAmount(requestedAmount: number, approved?: number): number {
  if (approved === undefined) return requestedAmount;
  if (!Number.isInteger(approved) || approved <= 0) {
    throw new RefundAmountInvalidError("Le montant remboursé doit être un entier strictement positif.");
  }
  if (approved > requestedAmount) {
    throw new RefundAmountInvalidError(`Le montant remboursé ne peut pas dépasser le montant payé (${requestedAmount}).`);
  }
  return approved;
}

/** Indicatif pour l'entreprise : la demande tombe-t-elle dans la fenêtre de remboursement intégral (section 9.5) ? */
export function isWithinAutomaticWindow(paidAt: Date, now: Date = new Date()): boolean {
  const elapsedMs = now.getTime() - paidAt.getTime();
  return elapsedMs <= AUTOMATIC_REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** Vue d'une demande de remboursement, enrichie pour les écrans (entreprise, Admin). */
export interface RefundRequest {
  id: string;
  paymentId: string;
  tenantId: string;
  amount: number;
  currency: string;
  /** Motif saisi par l'apprenant. */
  reason: string | null;
  /** Motif de refus ou commentaire de l'entreprise. */
  decisionNote: string | null;
  status: RefundRequestStatus;
  requestedAt: Date;
  resolvedAt: Date | null;
  /** Inscription concernée et son titulaire (pour le suivi côté apprenant et les notifications). */
  enrollmentId: string | null;
  learnerUserId: string | null;
  courseTitle: string;
  learnerName: string;
  learnerEmail: string;
  paidAt: Date;
  /** Étape 30 : critères de la politique évalués à la demande (section 9.5) ; absents des demandes antérieures. */
  eligibility?: RefundEligibility | null;
  /** Étape 30 : vrai si la demande a été acceptée automatiquement. */
  autoAccepted?: boolean;
}
