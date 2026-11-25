/**
 * Section 8.1: Valide → Révoqué ; Valide → Réémis (une réémission produit un
 * nouveau certificat REISSUED tout en conservant l'original, voir RG-14).
 */
export enum CertificateStatus {
  VALID = "VALID",
  REVOKED = "REVOKED",
  REISSUED = "REISSUED",
}

const ALLOWED_TRANSITIONS: Record<CertificateStatus, CertificateStatus[]> = {
  [CertificateStatus.VALID]: [CertificateStatus.REVOKED, CertificateStatus.REISSUED],
  [CertificateStatus.REVOKED]: [],
  [CertificateStatus.REISSUED]: [],
};

export function canTransitionCertificateStatus(from: CertificateStatus, to: CertificateStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
