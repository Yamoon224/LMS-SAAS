import { InvalidStateTransitionError } from "@shared/errors";

import type { PaymentMethod, PaymentStatus, PaymentType } from "./payment-method";

export interface PaymentProps {
  id: string;
  tenantId: string;
  providerId: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  currency: string;
  providerFee: number;
  commissionAmount: number;
  providerReference: string;
  status: PaymentStatus;
  subscriptionId: string | null;
  enrollmentId: string | null;
  creditPackId: string | null;
  /** Motif d'un échec décidé par la plateforme (ex. « expiré »), absent pour un échec signalé par le fournisseur. */
  failureReason?: string | null;
}

const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  FAILED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED"],
};

/**
 * Entité pure du domaine Payment : aucune dépendance à NestJS, à l'ORM ou à
 * un SDK de fournisseur (section 13.2). Porte RG-06 (activation seulement
 * après confirmation ET re-vérification) au niveau des transitions d'état.
 */
export class Payment {
  private constructor(private props: PaymentProps) {}

  static fromPersistence(props: PaymentProps): Payment {
    return new Payment(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get providerId(): string {
    return this.props.providerId;
  }

  get providerReference(): string {
    return this.props.providerReference;
  }

  get status(): PaymentStatus {
    return this.props.status;
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get commissionAmount(): number {
    return this.props.commissionAmount;
  }

  get providerFee(): number {
    return this.props.providerFee;
  }

  get type(): PaymentType {
    return this.props.type;
  }

  get subscriptionId(): string | null {
    return this.props.subscriptionId;
  }

  get enrollmentId(): string | null {
    return this.props.enrollmentId;
  }

  get creditPackId(): string | null {
    return this.props.creditPackId;
  }

  private transitionTo(status: PaymentStatus): void {
    if (!ALLOWED_TRANSITIONS[this.props.status].includes(status)) {
      throw new InvalidStateTransitionError(
        `Transition de paiement invalide: ${this.props.status} → ${status}.`,
      );
    }
    this.props.status = status;
  }

  /**
   * La commission n'est pas calculée ici : BE-06/le futur module ledger
   * applique la règle de commission (PlansFacade.resolveCommission) en
   * réaction à l'événement PaymentSucceeded et l'enregistre au grand livre.
   * Ce module se limite à encaisser et à exposer le frais fournisseur connu
   * du webhook/de la vérification serveur.
   */
  markSucceeded(providerFee: number): void {
    this.transitionTo("SUCCEEDED");
    this.props.providerFee = providerFee;
  }

  get failureReason(): string | null {
    return this.props.failureReason ?? null;
  }

  markFailed(reason?: string): void {
    this.transitionTo("FAILED");
    if (reason) this.props.failureReason = reason;
  }

  markRefunded(): void {
    this.transitionTo("REFUNDED");
  }

  markPartiallyRefunded(): void {
    this.transitionTo("PARTIALLY_REFUNDED");
  }

  isPending(): boolean {
    return this.props.status === "PENDING";
  }
}
