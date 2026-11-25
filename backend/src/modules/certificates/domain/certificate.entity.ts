import { InvalidStateTransitionError } from "@shared/errors";

import { canTransitionCertificateStatus, CertificateStatus } from "./certificate-status";

export interface CertificateProps {
  id: string;
  enrollmentId: string;
  templateId: string;
  /** RG-13: numéro unique, jamais réutilisé même après révocation. */
  number: string;
  status: CertificateStatus;
  /** RG-14: nom figé au moment de la délivrance — un renommage ultérieur de l'apprenant ne le modifie pas. */
  learnerNameSnapshot: string;
  courseTitleSnapshot: string;
  scorePercent: number | null;
  pdfUrl: string;
  qrVerificationUrl: string;
  revocationReason: string | null;
  issuedAt: Date;
  revokedAt: Date | null;
}

/**
 * Entité pure du domaine Certificate : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). Porte RG-13 (délivrance automatique, numéro unique) et
 * RG-14 (gel des informations à la délivrance).
 */
export class Certificate {
  private constructor(private props: CertificateProps) {}

  static fromPersistence(props: CertificateProps): Certificate {
    return new Certificate(props);
  }

  get id(): string {
    return this.props.id;
  }

  get enrollmentId(): string {
    return this.props.enrollmentId;
  }

  get templateId(): string {
    return this.props.templateId;
  }

  get number(): string {
    return this.props.number;
  }

  get status(): CertificateStatus {
    return this.props.status;
  }

  get pdfUrl(): string {
    return this.props.pdfUrl;
  }

  get qrVerificationUrl(): string {
    return this.props.qrVerificationUrl;
  }

  get learnerNameSnapshot(): string {
    return this.props.learnerNameSnapshot;
  }

  get courseTitleSnapshot(): string {
    return this.props.courseTitleSnapshot;
  }

  get scorePercent(): number | null {
    return this.props.scorePercent;
  }

  get issuedAt(): Date {
    return this.props.issuedAt;
  }

  get revocationReason(): string | null {
    return this.props.revocationReason;
  }

  /** ENT-45: un certificat révoqué échoue la vérification publique. */
  isVerifiable(): boolean {
    return this.props.status === CertificateStatus.VALID;
  }

  private transitionTo(status: CertificateStatus): void {
    if (!canTransitionCertificateStatus(this.props.status, status)) {
      throw new InvalidStateTransitionError(
        `Transition de certificat invalide: ${this.props.status} → ${status}.`,
      );
    }
    this.props.status = status;
  }

  /** ENT-44: révocation par un gestionnaire, avec motif obligatoire. */
  revoke(reason: string): void {
    this.transitionTo(CertificateStatus.REVOKED);
    this.props.revocationReason = reason;
    this.props.revokedAt = new Date();
  }

  /** ENT-44: marque ce certificat comme remplacé par une réémission (un nouveau Certificate est créé ailleurs). */
  markReissued(): void {
    this.transitionTo(CertificateStatus.REISSUED);
  }

  toSnapshot(): Readonly<CertificateProps> {
    return { ...this.props };
  }
}
