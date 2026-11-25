import { Inject, Injectable } from "@nestjs/common";

import {
  ANALYTICS_REPOSITORY,
  type AnalyticsRepositoryPort,
  type DateRange,
} from "../domain/analytics.repository.port";
import { computeChurnRate, normalizeToMonthlyAmount } from "../domain/metrics";
import type { PlatformDashboard } from "../domain/platform-dashboard";

/** ADM: tableau de bord plateforme (tenants, MRR, churn, apprenants, formations, commission). */
@Injectable()
export class GetPlatformDashboardUseCase {
  constructor(
    @Inject(ANALYTICS_REPOSITORY) private readonly analyticsRepository: AnalyticsRepositoryPort,
  ) {}

  async execute(range: DateRange): Promise<PlatformDashboard> {
    const raw = await this.analyticsRepository.getPlatformRawMetrics(range);

    const monthlyRecurringRevenue = raw.activeSubscriptionAmounts.reduce(
      (sum, subscription) => sum + normalizeToMonthlyAmount(subscription.amount, subscription.period),
      0,
    );

    return {
      periodStart: range.from,
      periodEnd: range.to,
      activeTenantsCount: raw.activeTenantsCount,
      newTenantsCount: raw.newTenantsCount,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue),
      churnRatePercent: computeChurnRate(
        raw.canceledSubscriptionsCount,
        raw.activeSubscriptionsAtPeriodStartCount,
      ),
      totalLearnersCount: raw.totalLearnersCount,
      totalCoursesCount: raw.totalCoursesCount,
      platformCommissionRevenue: raw.platformCommissionRevenue,
      trialingTenantsCount: raw.trialingTenantsCount,
      suspendedTenantsCount: raw.suspendedTenantsCount,
      annualRecurringRevenue: Math.round(monthlyRecurringRevenue) * 12,
      creditRevenue: raw.creditRevenue,
      certificatesIssuedCount: raw.certificatesIssuedCount,
      currency: "XOF",
    };
  }
}
