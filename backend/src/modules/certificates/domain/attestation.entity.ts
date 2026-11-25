import { InvalidStateTransitionError } from "@shared/errors";

import { AttestationStatus, canTransitionAttestationStatus } from "./attestation-status";

export interface AttestationProps {
  id: string;
  enrollmentId: string;
  number: string;
  status: AttestationStatus;
  /** Nom et titre figés à la délivrance (comme RG-14) : un renommage ultérieur ne les modifie pas. */
  learnerNameSnapshot: string;
  courseTitleSnapshot: string;
  progressPercent: number;
  durationMinutes: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  pdfUrl: string;
  qrVerificationUrl: string;
  revocationReason: string | null;
  issuedAt: Date;
  revokedAt: Date | null;
}

/**
 * Entité pure : attestation de suivi (ENT-44) d'une formation non certifiante. Ne mentionne ni réussite ni score.
 */
export class Attestation {
  private constructor(private props: AttestationProps) {}

  static fromPersistence(props: AttestationProps): Attestation {
    return new Attestation(props);
  }

  get id(): string {
    return this.props.id;
  }
  get enrollmentId(): string {
    return this.props.enrollmentId;
  }
  get number(): string {
    return this.props.number;
  }
  get status(): AttestationStatus {
    return this.props.status;
  }
  get learnerNameSnapshot(): string {
    return this.props.learnerNameSnapshot;
  }
  get courseTitleSnapshot(): string {
    return this.props.courseTitleSnapshot;
  }
  get progressPercent(): number {
    return this.props.progressPercent;
  }
  get durationMinutes(): number | null {
    return this.props.durationMinutes;
  }
  get startedAt(): Date | null {
    return this.props.startedAt;
  }
  get endedAt(): Date | null {
    return this.props.endedAt;
  }
  get pdfUrl(): string {
    return this.props.pdfUrl;
  }
  get qrVerificationUrl(): string {
    return this.props.qrVerificationUrl;
  }
  get issuedAt(): Date {
    return this.props.issuedAt;
  }
  get revocationReason(): string | null {
    return this.props.revocationReason;
  }

  /** Une attestation révoquée échoue la vérification publique. */
  isVerifiable(): boolean {
    return this.props.status === AttestationStatus.VALID;
  }

  /** Révocation par un gestionnaire, motif obligatoire. */
  revoke(reason: string): void {
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      throw new InvalidStateTransitionError("Le motif de révocation est obligatoire.");
    }
    if (!canTransitionAttestationStatus(this.props.status, AttestationStatus.REVOKED)) {
      throw new InvalidStateTransitionError(
        `Transition d'attestation invalide: ${this.props.status} → ${AttestationStatus.REVOKED}.`,
      );
    }
    this.props.status = AttestationStatus.REVOKED;
    this.props.revocationReason = trimmed;
    this.props.revokedAt = new Date();
  }

  toSnapshot(): Readonly<AttestationProps> {
    return { ...this.props };
  }
}

/**
 * Règle d'éligibilité : l'attestation ne concerne que les formations NON certifiantes (si la formation est
 * certifiante, c'est le certificat qui s'applique).
 */
export function isAttestationEligibleCourseType(courseType: string): boolean {
  return courseType === "NON_CERTIFYING";
}
