/**
 * RG-13: "chaque certificat porte un numéro unique, jamais réutilisé."
 * Fonction pure (section 13.1) : construit un numéro lisible et traçable à
 * partir d'un horodatage et d'un suffixe aléatoire fourni par l'appelant
 * (nanoid, infrastructure) — ne gère aucune vérification d'unicité en base,
 * qui reste la responsabilité du repository (contrainte @unique + retry).
 */
export function buildCertificateNumber(issuedAt: Date, randomSuffix: string): string {
  const year = issuedAt.getUTCFullYear();
  const month = String(issuedAt.getUTCMonth() + 1).padStart(2, "0");
  return `CERT-${year}${month}-${randomSuffix.toUpperCase()}`;
}
