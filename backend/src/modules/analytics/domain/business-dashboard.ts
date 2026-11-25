/** ENT: tableau de bord de l'entreprise sur une période donnée. */
export interface BusinessDashboard {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  activeLearnersCount: number;
  newEnrollmentsCount: number;
  completedEnrollmentsCount: number;
  completionRatePercent: number;
  grossRevenue: number;
  netRevenue: number;
  currency: string;
  certificatesIssuedCount: number;
  topCourses: { courseId: string; title: string; enrollmentsCount: number }[];
}
