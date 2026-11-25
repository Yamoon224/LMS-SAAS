import { PayoutStatus } from "./payout-status";
import type { Payout } from "./payout.entity";
import type { SalesBreakdown } from "./sales-breakdown";

/** Données imprimées sur le relevé PDF d'un reversement exécuté (ENT-69). */
export interface PayoutStatementData {
  /** Numéro lisible, dérivé de l'identifiant du reversement (stable, sans compteur). */
  number: string;
  tenantName: string;
  amount: number;
  currency: string;
  destinationType: "BANK" | "MOBILE_MONEY";
  accountName: string;
  /** Numéro de compte masqué : seuls les 4 derniers caractères sont imprimés. */
  accountNumberMasked: string;
  requestedAt: Date | null;
  executedAt: Date | null;
  /**
   * Étape 30 : ventilation brut/commission/frais/net des ventes dont la rétention s'est terminée depuis le reversement
   * précédent ; absente (null) quand elle ne peut pas être établie (date de demande inconnue).
   */
  breakdown?: SalesBreakdown | null;
}

export function buildPayoutStatementNumber(payoutId: string): string {
  return `REL-${payoutId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** Un relevé n'existe que pour un reversement effectivement exécuté. */
export function isStatementAvailable(payout: Payout): boolean {
  return payout.status === PayoutStatus.EXECUTED;
}

export function toPayoutStatementData(
  payout: Payout,
  tenantName: string,
  breakdown: SalesBreakdown | null = null,
): PayoutStatementData {
  return {
    number: buildPayoutStatementNumber(payout.id),
    tenantName,
    amount: payout.amount,
    currency: payout.currency,
    destinationType: payout.destination.type,
    accountName: payout.destination.accountName,
    accountNumberMasked: `••••${payout.destination.accountNumber.slice(-4)}`,
    requestedAt: payout.requestedAt,
    executedAt: payout.executedAt,
    breakdown,
  };
}

/**
 * Fenêtre des ventes couvertes par un reversement : du dernier reversement exécuté avant celui-ci (exclu) jusqu'à la
 * date de sa demande (incluse). Le reversement porte sur tout le disponible à la date de la demande, donc sur les ventes
 * dont la rétention s'est terminée dans cette fenêtre. Renvoie null si la date de demande est inconnue.
 */
export function resolveStatementWindow(
  payout: Payout,
  tenantPayouts: readonly Payout[],
): { from: Date | null; to: Date } | null {
  const to = payout.requestedAt;
  if (!to) return null;
  const previous = tenantPayouts
    .filter((other) => other.id !== payout.id && other.status === PayoutStatus.EXECUTED && other.requestedAt && other.requestedAt < to)
    .map((other) => other.requestedAt as Date)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return { from: previous ?? null, to };
}
