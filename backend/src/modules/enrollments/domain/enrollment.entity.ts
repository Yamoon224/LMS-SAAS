import { InvalidStateTransitionError } from "@shared/errors";

import { normalizeEnrollmentReason } from "./enrollment-reason";
import { canTransitionEnrollmentStatus, EnrollmentStatus, isAccessGranting } from "./enrollment-status";

export interface EnrollmentProps {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  /** RG-05: "le prix d'une formation est figé au moment de l'inscription". */
  pricePaid: number;
  currency: string;
  locale: string;
  startedAt: Date | null;
  expiresAt: Date | null;
  completedAt: Date | null;
  /** RG-07: référence et montant reçus, saisis lors de la validation d'un paiement hors plateforme. */
  offlinePaymentReference?: string | null;
  offlinePaymentAmount?: number | null;
  /** ENT-61: motif du refus d'un paiement hors plateforme. */
  refusalReason?: string | null;
  /** ENT-62: motif d'une inscription manuelle sans paiement, et gestionnaire qui l'a créée. */
  manualEnrollmentNote?: string | null;
  enrolledByUserId?: string | null;
}

/**
 * Entité pure du domaine Enrollment : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). Porte RG-05 à RG-09 et RG-17.
 */
export class Enrollment {
  private constructor(private props: EnrollmentProps) {}

  static fromPersistence(props: EnrollmentProps): Enrollment {
    return new Enrollment(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get courseId(): string {
    return this.props.courseId;
  }

  get status(): EnrollmentStatus {
    return this.props.status;
  }

  get pricePaid(): number {
    return this.props.pricePaid;
  }

  get currency(): string {
    return this.props.currency;
  }

  get refusalReason(): string | null {
    return this.props.refusalReason ?? null;
  }

  get manualEnrollmentNote(): string | null {
    return this.props.manualEnrollmentNote ?? null;
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  /**
   * RG-17: "si l'accès à une formation est limité dans le temps, l'apprenant
   * conserve après expiration l'accès à ses certificats mais plus au
   * contenu." Le contenu reste accessible tant que le statut autorise
   * l'accès ET que la date d'expiration (si fixée) n'est pas dépassée.
   */
  hasContentAccess(now: Date = new Date()): boolean {
    if (!isAccessGranting(this.props.status)) return false;
    if (this.props.expiresAt && now > this.props.expiresAt) return false;
    return true;
  }

  /** Les certificats restent accessibles même après expiration du contenu (RG-17), tant que complétée. */
  hasCertificateAccess(): boolean {
    return this.props.status === EnrollmentStatus.COMPLETED;
  }

  private transitionTo(status: EnrollmentStatus): void {
    if (!canTransitionEnrollmentStatus(this.props.status, status)) {
      throw new InvalidStateTransitionError(
        `Transition d'inscription invalide: ${this.props.status} → ${status}.`,
      );
    }
    this.props.status = status;
  }

  /** RG-06: activation seulement après confirmation ET vérification serveur du paiement en ligne. */
  activate(accessDurationDays: number | null): void {
    this.transitionTo(EnrollmentStatus.ACTIVE);
    this.props.startedAt ??= new Date();
    if (accessDurationDays !== null) {
      const expiresAt = new Date(this.props.startedAt);
      expiresAt.setDate(expiresAt.getDate() + accessDurationDays);
      this.props.expiresAt = expiresAt;
    }
  }

  /** RG-07: conserve la preuve du paiement hors plateforme validé (référence + montant déclaré). */
  recordOfflinePayment(reference: string, amount: number): void {
    this.props.offlinePaymentReference = reference;
    this.props.offlinePaymentAmount = amount;
  }

  /** ENT-61: refus d'un paiement hors plateforme, motif obligatoire (vérifié avant la transition). */
  refuse(reason: string): void {
    const normalized = normalizeEnrollmentReason(reason);
    this.transitionTo(EnrollmentStatus.REFUSED);
    this.props.refusalReason = normalized;
  }

  /** ENT-62: trace une inscription manuelle (motif + gestionnaire) ; l'activation reste une transition normale. */
  recordManualEnrollment(reason: string, enrolledByUserId: string): void {
    this.props.manualEnrollmentNote = normalizeEnrollmentReason(reason);
    this.props.enrolledByUserId = enrolledByUserId;
  }

  /** RG-21 (non certifiante) / RG-13 (certifiante): formation terminée. */
  complete(): void {
    this.transitionTo(EnrollmentStatus.COMPLETED);
    this.props.completedAt = new Date();
  }

  expire(): void {
    this.transitionTo(EnrollmentStatus.EXPIRED);
  }

  suspend(): void {
    this.transitionTo(EnrollmentStatus.SUSPENDED);
  }

  reactivate(): void {
    this.transitionTo(EnrollmentStatus.ACTIVE);
  }

  /** ENT-64: prolonger l'accès d'un apprenant. */
  extendAccess(additionalDays: number): void {
    const base = this.props.expiresAt ?? new Date();
    const extended = new Date(base);
    extended.setDate(extended.getDate() + additionalDays);
    this.props.expiresAt = extended;
  }

  /** Réservé à l'infrastructure (repository) pour persister l'état courant après mutation. */
  toSnapshot(): Readonly<EnrollmentProps> {
    return { ...this.props };
  }
}
