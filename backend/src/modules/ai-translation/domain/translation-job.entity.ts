import { InvalidStateTransitionError } from "@shared/errors";

import { canTransitionTranslationJobStatus, TranslationJobStatus } from "./translation-job-status";

export interface TranslationJobProps {
  id: string;
  tenantId: string;
  courseId: string;
  targetLocale: string;
  wordCount: number | null;
  estimatedCredits: number | null;
  debitedCredits: number | null;
  status: TranslationJobStatus;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Entité pure du domaine TranslationJob : aucune dépendance à NestJS, à
 * l'ORM ou au fournisseur IA (section 13.2). ADM-18: "le gestionnaire
 * confirme le coût estimé avant que le débit n'ait lieu" — le passage de
 * ESTIMATED à CONFIRMED matérialise ce consentement explicite.
 */
export class TranslationJob {
  private constructor(private props: TranslationJobProps) {}

  static fromPersistence(props: TranslationJobProps): TranslationJob {
    return new TranslationJob(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get courseId(): string {
    return this.props.courseId;
  }

  get targetLocale(): string {
    return this.props.targetLocale;
  }

  get status(): TranslationJobStatus {
    return this.props.status;
  }

  get estimatedCredits(): number | null {
    return this.props.estimatedCredits;
  }

  get debitedCredits(): number | null {
    return this.props.debitedCredits;
  }

  private transitionTo(status: TranslationJobStatus): void {
    if (!canTransitionTranslationJobStatus(this.props.status, status)) {
      throw new InvalidStateTransitionError(
        `Transition de traduction invalide: ${this.props.status} → ${status}.`,
      );
    }
    this.props.status = status;
  }

  /** ADM-18: confirmation du coût estimé par le gestionnaire, déclenche le débit. */
  confirm(debitedCredits: number): void {
    this.transitionTo(TranslationJobStatus.CONFIRMED);
    this.props.debitedCredits = debitedCredits;
  }

  start(): void {
    this.transitionTo(TranslationJobStatus.IN_PROGRESS);
  }

  complete(): void {
    this.transitionTo(TranslationJobStatus.COMPLETED);
    this.props.completedAt = new Date();
  }

  /** Le crédit débité est remboursé par l'appelant (CreditWallet.credit()) en réaction à cet échec. */
  fail(errorMessage: string): void {
    this.transitionTo(TranslationJobStatus.FAILED);
    this.props.errorMessage = errorMessage;
  }

  toSnapshot(): Readonly<TranslationJobProps> {
    return { ...this.props };
  }
}
