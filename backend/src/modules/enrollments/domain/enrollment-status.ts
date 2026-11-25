/**
 * Section 8.1: En attente de paiement / En attente de validation → Active →
 * Terminée (certifié) ; Active → Expirée ; Active ↔ Suspendue ; En attente → Refusée.
 */
export enum EnrollmentStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PENDING_VALIDATION = "PENDING_VALIDATION",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  EXPIRED = "EXPIRED",
  SUSPENDED = "SUSPENDED",
  REFUSED = "REFUSED",
}

const ALLOWED_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  [EnrollmentStatus.PENDING_PAYMENT]: [EnrollmentStatus.ACTIVE, EnrollmentStatus.REFUSED],
  [EnrollmentStatus.PENDING_VALIDATION]: [EnrollmentStatus.ACTIVE, EnrollmentStatus.REFUSED],
  [EnrollmentStatus.ACTIVE]: [
    EnrollmentStatus.COMPLETED,
    EnrollmentStatus.EXPIRED,
    EnrollmentStatus.SUSPENDED,
  ],
  [EnrollmentStatus.SUSPENDED]: [EnrollmentStatus.ACTIVE],
  [EnrollmentStatus.COMPLETED]: [],
  [EnrollmentStatus.EXPIRED]: [],
  [EnrollmentStatus.REFUSED]: [],
};

export function canTransitionEnrollmentStatus(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** RG-01 (par analogie): une inscription "active" est le seul statut donnant accès au contenu. */
export function isAccessGranting(status: EnrollmentStatus): boolean {
  return status === EnrollmentStatus.ACTIVE || status === EnrollmentStatus.COMPLETED;
}
