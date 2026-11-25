/** ENT-44: une attestation de suivi est VALIDE puis éventuellement RÉVOQUÉE (état final). */
export enum AttestationStatus {
  VALID = "VALID",
  REVOKED = "REVOKED",
}

const ALLOWED_TRANSITIONS: Record<AttestationStatus, AttestationStatus[]> = {
  [AttestationStatus.VALID]: [AttestationStatus.REVOKED],
  [AttestationStatus.REVOKED]: [],
};

export function canTransitionAttestationStatus(from: AttestationStatus, to: AttestationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
