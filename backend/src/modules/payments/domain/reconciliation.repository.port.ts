import type { DuplicateCandidate } from "./payment-reconciliation";

/** Paiement en attente de confirmation, avec le code de son fournisseur (le webhook ne connaît que ce code). */
export interface PendingPaymentRow {
  id: string;
  tenantId: string;
  providerCode: string;
  providerReference: string;
  method: string;
  amount: number;
  currency: string;
  createdAt: Date;
}

/** Lectures du rapprochement (ADM-27). Aucune écriture : les transitions passent par les cas d'usage existants. */
export interface ReconciliationRepositoryPort {
  /** Paiements PENDING créés avant `cutoff`, du plus ancien au plus récent. */
  listPendingCreatedBefore(cutoff: Date, limit: number): Promise<PendingPaymentRow[]>;
  /** Paiements de formation encaissés (SUCCEEDED) depuis `since`, avec apprenant et formation de l'inscription. */
  listCollectedEnrollmentPaymentsSince(since: Date): Promise<DuplicateCandidate[]>;
}

export const RECONCILIATION_REPOSITORY = Symbol("RECONCILIATION_REPOSITORY");
