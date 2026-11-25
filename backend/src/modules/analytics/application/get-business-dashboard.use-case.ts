import { Inject, Injectable } from "@nestjs/common";

import {
  ANALYTICS_REPOSITORY,
  type AnalyticsRepositoryPort,
  type DateRange,
} from "../domain/analytics.repository.port";
import type { BusinessDashboard } from "../domain/business-dashboard";
import { computeCompletionRate } from "../domain/metrics";

/** ENT: tableau de bord entreprise (apprenants actifs, revenu, taux de complétion, certificats, formations phares). */
@Injectable()
export class GetBusinessDashboardUseCase {
  constructor(
    @Inject(ANALYTICS_REPOSITORY) private readonly analyticsRepository: AnalyticsRepositoryPort,
  ) {}

  async execute(tenantId: string, range: DateRange): Promise<BusinessDashboard> {
    const raw = await this.analyticsRepository.getBusinessRawMetrics(tenantId, range);

    return {
      tenantId,
      periodStart: range.from,
      periodEnd: range.to,
      activeLearnersCount: raw.activeLearnersCount,
      newEnrollmentsCount: raw.newEnrollmentsCount,
      completedEnrollmentsCount: raw.completedEnrollmentsCount,
      completionRatePercent: computeCompletionRate(
        raw.completedEnrollmentsCount,
        raw.totalRelevantEnrollmentsCount,
      ),
      grossRevenue: raw.grossRevenue,
      netRevenue: raw.netRevenue,
      currency: "XOF",
      certificatesIssuedCount: raw.certificatesIssuedCount,
      topCourses: raw.topCourses,
    };
  }
}
