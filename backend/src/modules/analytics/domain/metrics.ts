/**
 * Fonctions pures de calcul des indicateurs (section 13.1) : ne connaissent
 * aucune table ni aucun ORM, ne font que combiner des nombres déjà agrégés
 * par l'infrastructure. Centraliser ces formules ici les rend testables
 * sans base de données et évite leur duplication entre tableaux de bord
 * Entreprise (ENT) et Admin (ADM).
 */

/** ENT: pourcentage d'inscriptions menées à terme (COMPLETED) parmi les inscriptions actives ou terminées. */
export function computeCompletionRate(completedCount: number, totalRelevantCount: number): number {
  if (totalRelevantCount === 0) return 0;
  return Math.round((completedCount / totalRelevantCount) * 100 * 100) / 100;
}

/** ADM: revenu mensuel récurrent — normalise chaque abonnement actif à son équivalent mensuel. */
export function normalizeToMonthlyAmount(amount: number, period: "MONTHLY" | "QUARTERLY" | "YEARLY"): number {
  switch (period) {
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "YEARLY":
      return amount / 12;
  }
}

/** ADM: taux de résiliation — abonnements résiliés sur la période rapportés à l'effectif de début de période. */
export function computeChurnRate(canceledCount: number, activeAtPeriodStartCount: number): number {
  if (activeAtPeriodStartCount === 0) return 0;
  return Math.round((canceledCount / activeAtPeriodStartCount) * 100 * 100) / 100;
}

/** ADM/ENT: commission plateforme exprimée en pourcentage du chiffre d'affaires brut. */
export function computeCommissionRate(commissionAmount: number, grossRevenue: number): number {
  if (grossRevenue === 0) return 0;
  return Math.round((commissionAmount / grossRevenue) * 100 * 100) / 100;
}
