import type { PlatformTrendsRaw, TrendGranularity } from "./platform-trends";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface BusinessRawMetrics {
  activeLearnersCount: number;
  newEnrollmentsCount: number;
  completedEnrollmentsCount: number;
  totalRelevantEnrollmentsCount: number;
  grossRevenue: number;
  netRevenue: number;
  certificatesIssuedCount: number;
  topCourses: { courseId: string; title: string; enrollmentsCount: number }[];
}

export interface PlatformRawMetrics {
  activeTenantsCount: number;
  newTenantsCount: number;
  canceledSubscriptionsCount: number;
  activeSubscriptionsAtPeriodStartCount: number;
  activeSubscriptionAmounts: { amount: number; period: "MONTHLY" | "QUARTERLY" | "YEARLY" }[];
  totalLearnersCount: number;
  totalCoursesCount: number;
  platformCommissionRevenue: number;
  trialingTenantsCount: number;
  suspendedTenantsCount: number;
  creditRevenue: number;
  certificatesIssuedCount: number;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface AnalyticsRepositoryPort {
  getBusinessRawMetrics(tenantId: string, range: DateRange): Promise<BusinessRawMetrics>;
  getPlatformRawMetrics(range: DateRange): Promise<PlatformRawMetrics>;
  getPlatformTrendsRaw(range: DateRange, granularity: TrendGranularity): Promise<PlatformTrendsRaw>;
}

export const ANALYTICS_REPOSITORY = Symbol("ANALYTICS_REPOSITORY");
