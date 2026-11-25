import type { RefundEligibility } from "./refund-eligibility";
import type { RefundRequest, RefundRequestStatus } from "./refund-request";

/** Paiement de formation sur lequel un apprenant peut demander un remboursement. */
export interface RefundablePayment {
  paymentId: string;
  tenantId: string;
  amount: number;
  currency: string;
}

export interface RefundRequestRepositoryPort {
  /** Paiement de formation encaissé (SUCCEEDED) de l'apprenant pour cette inscription, sinon null. */
  findRefundablePayment(userId: string, enrollmentId: string): Promise<RefundablePayment | null>;
  /** Vrai s'il existe déjà une demande non refusée pour ce paiement. */
  hasActiveRequest(paymentId: string): Promise<boolean>;
  create(data: { payment: RefundablePayment; reason: string | null }): Promise<RefundRequest>;
  findById(id: string): Promise<RefundRequest | null>;
  /** `amount` est renseigné seulement quand l'entreprise accorde un montant (remboursement partiel). */
  save(request: {
    id: string;
    status: RefundRequestStatus;
    decisionNote: string | null;
    resolvedAt: Date | null;
    amount?: number;
    /** Étape 30 : critères figés à la demande et acceptation automatique. */
    eligibility?: RefundEligibility;
    autoAccepted?: boolean;
  }): Promise<void>;
  listForTenant(tenantId: string): Promise<RefundRequest[]>;
  /** Demandes déposées par cet apprenant (suivi côté apprenant). */
  listForLearner(userId: string): Promise<RefundRequest[]>;
  listByStatus(status: RefundRequestStatus): Promise<RefundRequest[]>;
}

export const REFUND_REQUEST_REPOSITORY = Symbol("REFUND_REQUEST_REPOSITORY");
