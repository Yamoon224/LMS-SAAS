import { DomainError } from "@shared/errors/domain-error";

/** ENT-61 / ENT-62 : longueur maximale d'un motif (refus d'un paiement, inscription manuelle). */
export const ENROLLMENT_REASON_MAX_LENGTH = 500;

export class EnrollmentReasonRequiredError extends DomainError {
  readonly code = "MOTIF_OBLIGATOIRE";
}

/**
 * Motif obligatoire : espaces de tête/queue retirés, caractères de contrôle supprimés, jamais vide ni trop long.
 * Le motif est affiché à l'apprenant (refus) et conservé comme trace (inscription manuelle) : il est stocké en texte brut.
 */
export function normalizeEnrollmentReason(raw: string | null | undefined): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = (raw ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (cleaned.length === 0) {
    throw new EnrollmentReasonRequiredError("Un motif est obligatoire.");
  }
  if (cleaned.length > ENROLLMENT_REASON_MAX_LENGTH) {
    throw new EnrollmentReasonRequiredError(`Le motif ne doit pas dépasser ${ENROLLMENT_REASON_MAX_LENGTH} caractères.`);
  }
  return cleaned;
}
