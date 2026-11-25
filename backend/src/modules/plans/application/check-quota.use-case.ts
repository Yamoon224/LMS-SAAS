import { Inject, Injectable } from "@nestjs/common";

import { PLAN_QUOTA_REPOSITORY } from "../domain/plan-quota.repository.port";
import type { PlanQuotaRepositoryPort } from "../domain/plan-quota.repository.port";
import type { QuotaCheckResult } from "../domain/quota-check-result";

/** BE-03: vérifie qu'un quota n'est pas dépassé avant une création. */
@Injectable()
export class CheckQuotaUseCase {
  constructor(
    @Inject(PLAN_QUOTA_REPOSITORY) private readonly quotaRepository: PlanQuotaRepositoryPort,
  ) {}

  async execute(tenantId: string, quotaName: string): Promise<QuotaCheckResult> {
    const [limit, current] = await Promise.all([
      this.quotaRepository.getQuotaLimit(tenantId, quotaName),
      this.quotaRepository.getCurrentUsage(tenantId, quotaName),
    ]);

    return {
      withinLimit: limit === null || current < limit,
      current,
      limit,
    };
  }
}
