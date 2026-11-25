/** Section 8.1: Demandé → Validé (opérateur) → Approuvé (finance) → Exécuté (preuve jointe) ; Rejeté à tout moment avant exécution. */
export enum PayoutStatus {
  REQUESTED = "REQUESTED",
  VALIDATED = "VALIDATED",
  APPROVED = "APPROVED",
  EXECUTED = "EXECUTED",
  REJECTED = "REJECTED",
}

const ALLOWED_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  [PayoutStatus.REQUESTED]: [PayoutStatus.VALIDATED, PayoutStatus.REJECTED],
  [PayoutStatus.VALIDATED]: [PayoutStatus.APPROVED, PayoutStatus.REJECTED],
  [PayoutStatus.APPROVED]: [PayoutStatus.EXECUTED, PayoutStatus.REJECTED],
  [PayoutStatus.EXECUTED]: [],
  [PayoutStatus.REJECTED]: [],
};

export function canTransitionPayoutStatus(from: PayoutStatus, to: PayoutStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
