import { InvalidStateTransitionError } from "@shared/errors";

import { canTransitionPayoutStatus, PayoutStatus } from "./payout-status";

export interface PayoutDestination {
  type: "BANK" | "MOBILE_MONEY";
  accountNumber: string;
  accountName: string;
}

export interface PayoutProps {
  id: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  destination: PayoutDestination;
  validatedByUserId: string | null;
  approvedByUserId: string | null;
  proofUrl: string | null;
  rejectionReason: string | null;
  /** Date de la demande (historique ENT-69); optionnelle pour les entités reconstruites sans cette donnée. */
  requestedAt?: Date;
  /** Date d'exécution (relevé PDF, ENT-69) ; renseignée à l'exécution. */
  executedAt?: Date | null;
}

/**
 * Entité pure du domaine Payout (ADM-24: "double validation, opérateur puis
 * finance"). Porte les règles de transition — l'identité de l'opérateur et
 * du valideur finance doivent être deux utilisateurs distincts, vérifié ici
 * plutôt que dans l'infrastructure pour que la règle soit testable sans base.
 */
export class Payout {
  private constructor(private props: PayoutProps) {}

  static fromPersistence(props: PayoutProps): Payout {
    return new Payout(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get status(): PayoutStatus {
    return this.props.status;
  }

  get requestedAt(): Date | null {
    return this.props.requestedAt ?? null;
  }

  get executedAt(): Date | null {
    return this.props.executedAt ?? null;
  }

  get destination(): PayoutDestination {
    return this.props.destination;
  }

  private transitionTo(status: PayoutStatus): void {
    if (!canTransitionPayoutStatus(this.props.status, status)) {
      throw new InvalidStateTransitionError(`Transition de reversement invalide: ${this.props.status} → ${status}.`);
    }
    this.props.status = status;
  }

  /** ADM-24: première validation, par un opérateur. */
  validate(userId: string): void {
    this.transitionTo(PayoutStatus.VALIDATED);
    this.props.validatedByUserId = userId;
  }

  /**
   * ADM-24: seconde validation, par la finance. Doit être une personne
   * distincte de celle qui a validé (principe des quatre yeux).
   */
  approve(userId: string): void {
    if (this.props.validatedByUserId === userId) {
      throw new InvalidStateTransitionError(
        "L'approbation finance doit être faite par une personne différente de celle qui a validé.",
      );
    }
    this.transitionTo(PayoutStatus.APPROVED);
    this.props.approvedByUserId = userId;
  }

  /** ADM-24: exécution avec preuve jointe (virement/mobile money manuel, ou API de transfert). */
  execute(proofUrl: string): void {
    this.transitionTo(PayoutStatus.EXECUTED);
    this.props.proofUrl = proofUrl;
    this.props.executedAt = new Date();
  }

  reject(reason: string): void {
    this.transitionTo(PayoutStatus.REJECTED);
    this.props.rejectionReason = reason;
  }

  /** Réservé à l'infrastructure (repository) pour persister l'état courant après mutation. */
  toSnapshot(): Readonly<PayoutProps> {
    return { ...this.props };
  }
}
