/**
 * Étape 31 : calculs purs de facturation (prorata, échéances). Aucune dépendance à NestJS ni à Prisma.
 *
 * RÈGLES DE GESTION (documentées dans docs/etapes/31-renouvellement-et-prorata.md) :
 * - Les montants sont des entiers en plus petite unité de la devise (XOF : 1 = 1 F CFA, aucune décimale).
 * - Une montée en gamme est immédiate et conserve l'échéance courante ; seule la différence au prorata des jours
 *   restants est due. Toute autre variation (descente, même prix, devise différente) est planifiée à l'échéance,
 *   sans crédit ni débit.
 * - Arrondis : crédit de l'ancien plan arrondi À L'INFÉRIEUR, coût du nouveau plan arrondi AU SUPÉRIEUR
 *   (jamais en défaveur de la plateforme sur un cumul d'arrondis) ; le montant dû n'est jamais négatif.
 * - Jours restants : arrondis au jour supérieur (un jour entamé est un jour dû), bornés à [0, durée de la période].
 * - Périodicités différentes : le prix du nouveau plan est ramené à la durée de la période courante
 *   (ex. passage mensuel → annuel : 1/12 du prix annuel par mois restant de la période mensuelle).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS_PER_PERIOD: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

export function periodMonths(period: string): number {
  return MONTHS_PER_PERIOD[period] ?? 1;
}

/** Ajoute des mois en UTC en conservant le jour, borné au dernier jour du mois (31 janv. + 1 mois = 28/29 févr.). */
export function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export interface PriceLike {
  amount: number;
  period: string;
}

export type PlanChangeDirection = "UPGRADE" | "DOWNGRADE" | "SAME" | "INCOMPARABLE";
export type PlanChangeTiming = "IMMEDIATE" | "AT_PERIOD_END";

/** Compare deux prix ramenés au mois, par produit en croix (pas de division flottante). */
export function comparePlanPrices(
  current: PriceLike & { currency: string },
  next: PriceLike & { currency: string },
): PlanChangeDirection {
  if (current.currency !== next.currency) return "INCOMPARABLE";
  const left = next.amount * periodMonths(current.period);
  const right = current.amount * periodMonths(next.period);
  if (left > right) return "UPGRADE";
  if (left < right) return "DOWNGRADE";
  return "SAME";
}

/** ADM-09 : remise Admin sur les prochaines facturations (pourcentage OU montant fixe par période). */
export interface BillingDiscount {
  percent?: number | null;
  amount?: number | null;
}

/**
 * Montant après remise, entier, jamais négatif. Pourcentage : remise arrondie à l'inférieur (le montant facturé est
 * arrondi au supérieur, jamais en défaveur de la plateforme). Montant fixe : retranché du montant de la période.
 */
export function applyDiscount(amount: number, discount?: BillingDiscount | null): number {
  if (!discount || amount <= 0) return Math.max(0, amount);
  if (discount.percent != null && discount.percent > 0) {
    const percent = Math.min(100, discount.percent);
    return Math.max(0, amount - Math.floor((amount * percent) / 100));
  }
  if (discount.amount != null && discount.amount > 0) {
    return Math.max(0, amount - discount.amount);
  }
  return amount;
}

export interface ProrationInput {
  current: PriceLike & { currency: string };
  next: PriceLike & { currency: string };
  /** Échéance de la période courante. */
  periodEnd: Date;
  now: Date;
  /** Essai gratuit en cours : rien n'a été payé, donc aucun prorata n'est dû. */
  isTrialing?: boolean;
  /** Remise en cours : le crédit de l'ancien plan et le coût du nouveau sont calculés sur les montants remisés. */
  discount?: BillingDiscount | null;
}

export interface ProrationResult {
  direction: PlanChangeDirection;
  timing: PlanChangeTiming;
  currency: string;
  totalDays: number;
  remainingDays: number;
  /** Crédit de l'ancien plan pour les jours restants (0 hors montée en gamme). */
  creditAmount: number;
  /** Coût du nouveau plan pour les mêmes jours (0 hors montée en gamme). */
  chargeAmount: number;
  /** Montant à payer maintenant (0 hors montée en gamme). */
  amountDue: number;
}

export function computeProration(input: ProrationInput): ProrationResult {
  const direction = comparePlanPrices(input.current, input.next);
  const base = { direction, currency: input.next.currency, totalDays: 0, remainingDays: 0 };

  if (direction !== "UPGRADE") {
    return { ...base, timing: "AT_PERIOD_END", creditAmount: 0, chargeAmount: 0, amountDue: 0 };
  }

  const currentMonths = periodMonths(input.current.period);
  const nextMonths = periodMonths(input.next.period);
  const periodStart = addMonthsClamped(input.periodEnd, -currentMonths);
  const totalDays = Math.max(1, Math.round((input.periodEnd.getTime() - periodStart.getTime()) / DAY_MS));
  const remainingDays = Math.min(
    totalDays,
    Math.max(0, Math.ceil((input.periodEnd.getTime() - input.now.getTime()) / DAY_MS)),
  );

  if (input.isTrialing) {
    return { ...base, totalDays, remainingDays, timing: "IMMEDIATE", creditAmount: 0, chargeAmount: 0, amountDue: 0 };
  }

  const currentAmount = applyDiscount(input.current.amount, input.discount);
  const nextAmount = applyDiscount(input.next.amount, input.discount);
  const creditAmount = Math.floor((currentAmount * remainingDays) / totalDays);
  const chargeAmount = Math.ceil((nextAmount * currentMonths * remainingDays) / (nextMonths * totalDays));
  return {
    ...base,
    totalDays,
    remainingDays,
    timing: "IMMEDIATE",
    creditAmount,
    chargeAmount,
    amountDue: Math.max(0, chargeAmount - creditAmount),
  };
}

/**
 * Fin de la période renouvelée. Continuité : la nouvelle période démarre à l'échéance précédente (aucun jour perdu
 * ni gagné, même si le paiement arrive en période de grâce) ; si l'abonnement a expiré (`lapsed`), elle redémarre
 * à `now`.
 */
export function nextPeriodEnd(currentPeriodEnd: Date | null, months: number, now: Date, lapsed: boolean): Date {
  const base = !lapsed && currentPeriodEnd ? currentPeriodEnd : now;
  return addMonthsClamped(base, months);
}
