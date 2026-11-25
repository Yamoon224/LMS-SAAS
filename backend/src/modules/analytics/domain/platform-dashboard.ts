/** ADM: tableau de bord plateforme (tous tenants) sur une période donnée. */
export interface PlatformDashboard {
  periodStart: Date;
  periodEnd: Date;
  activeTenantsCount: number;
  newTenantsCount: number;
  monthlyRecurringRevenue: number;
  churnRatePercent: number;
  totalLearnersCount: number;
  totalCoursesCount: number;
  platformCommissionRevenue: number;
  /** ADM-01 : entreprises dont l'abonnement est en essai, entreprises suspendues. */
  trialingTenantsCount: number;
  suspendedTenantsCount: number;
  /** ADM-01 : MRR x 12 (approximation : tient pour acquis les abonnements actifs actuels). */
  annualRecurringRevenue: number;
  /** ADM-01 : ventes de packs de crédits IA encaissées sur la période. */
  creditRevenue: number;
  /** ADM-01 : certificats délivrés sur la période (toutes entreprises). */
  certificatesIssuedCount: number;
  currency: string;
}
