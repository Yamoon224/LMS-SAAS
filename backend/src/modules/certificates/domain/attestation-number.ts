/** Préfixe distinct des certificats (`CERT-`) : permet à la vérification publique de reconnaître le type. */
export const ATTESTATION_NUMBER_PREFIX = "ATT-";

/**
 * Numéro unique et jamais réutilisé d'une attestation de suivi : `ATT-AAAAMM-XXXXXXXX`. Fonction pure ; l'unicité en
 * base est garantie par la contrainte @unique.
 */
export function buildAttestationNumber(issuedAt: Date, randomSuffix: string): string {
  const year = issuedAt.getUTCFullYear();
  const month = String(issuedAt.getUTCMonth() + 1).padStart(2, "0");
  return `${ATTESTATION_NUMBER_PREFIX}${year}${month}-${randomSuffix.toUpperCase()}`;
}

export function isAttestationNumber(number: string): boolean {
  return number.trim().toUpperCase().startsWith(ATTESTATION_NUMBER_PREFIX);
}
