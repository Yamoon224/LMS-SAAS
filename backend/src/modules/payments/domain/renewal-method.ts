import type { PaymentMethod } from "./payment-method";

/**
 * Moyen utilisé pour le lien de paiement d'un renouvellement automatique. Aucun moyen de paiement n'est mémorisé
 * (les passerelles n'exposent pas de prélèvement récurrent) : on génère donc un lien. Préférence au mobile money
 * (moyen dominant, section 9.2), puis à la carte, puis à tout autre moyen disponible.
 */
const PREFERENCE: readonly PaymentMethod[] = ["ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE", "CARD"];

export function pickRenewalMethod(available: readonly PaymentMethod[]): PaymentMethod | null {
  for (const method of PREFERENCE) {
    if (available.includes(method)) return method;
  }
  return available[0] ?? null;
}
