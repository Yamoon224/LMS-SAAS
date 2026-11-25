export type TrendGranularity = "day" | "month";

/** Un point de la série temporelle (un jour ou un mois, `bucket` = YYYY-MM-DD du début de l'intervalle, UTC). */
export interface PlatformTrendPoint {
  bucket: string;
  newTenants: number;
  enrollments: number;
  certificates: number;
  /** Commissions plateforme encaissées (plus petite unité de la devise). */
  commissionRevenue: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

/** ADM : évolution dans le temps (courbes/barres) et répartitions actuelles (anneaux) de la plateforme. */
export interface PlatformTrends {
  periodStart: Date;
  periodEnd: Date;
  granularity: TrendGranularity;
  points: PlatformTrendPoint[];
  tenantsByStatus: StatusCount[];
  subscriptionsByStatus: StatusCount[];
  currency: string;
}

/** Lignes brutes agrégées par intervalle, sans les intervalles vides (complétés par le cas d'usage). */
export interface PlatformTrendsRaw {
  tenants: { bucket: string; count: number }[];
  enrollments: { bucket: string; count: number }[];
  certificates: { bucket: string; count: number }[];
  commissions: { bucket: string; amount: number }[];
  tenantsByStatus: StatusCount[];
  subscriptionsByStatus: StatusCount[];
}
