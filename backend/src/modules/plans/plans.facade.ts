import { Injectable } from "@nestjs/common";

import { CheckQuotaUseCase } from "./application/check-quota.use-case";
import { GetPlanFeaturesUseCase } from "./application/get-plan-features.use-case";
import { ManageCreditPacksUseCase } from "./application/manage-credit-packs.use-case";
import { ResolveCommissionUseCase } from "./application/resolve-commission.use-case";
import type { ResolvedCommission } from "./application/resolve-commission.use-case";
import type { CommissionType } from "./domain/commission-rule.repository.port";
import type { CreditPackRecord } from "./domain/credit-pack.repository.port";
import type { PlanFeatures } from "./domain/plan-quotas";
import type { QuotaCheckResult } from "./domain/quota-check-result";

/**
 * Seule API publique du module plans. Utilisée par les guards (quotas), par
 * le module payments (résolution de la commission applicable à une vente,
 * BE-06) et par le module ai-translation (feature flag aiTranslation et
 * crédits inclus au plan, ADM-14).
 */
@Injectable()
export class PlansFacade {
  constructor(
    private readonly checkQuotaUseCase: CheckQuotaUseCase,
    private readonly resolveCommissionUseCase: ResolveCommissionUseCase,
    private readonly manageCreditPacksUseCase: ManageCreditPacksUseCase,
    private readonly getPlanFeaturesUseCase: GetPlanFeaturesUseCase,
  ) {}

  async checkQuota(tenantId: string, quotaName: string): Promise<QuotaCheckResult> {
    return this.checkQuotaUseCase.execute(tenantId, quotaName);
  }

  async resolveCommission(
    type: CommissionType,
    tenantId: string,
    courseId?: string,
  ): Promise<ResolvedCommission> {
    return this.resolveCommissionUseCase.execute(type, tenantId, courseId);
  }

  async findCreditPack(id: string): Promise<CreditPackRecord | null> {
    const packs = await this.manageCreditPacksUseCase.listActive();
    return packs.find((pack) => pack.id === id) ?? null;
  }

  /** ADM-14: feature flags du plan actif du tenant (ex. aiTranslation, aiTranslationCreditsIncluded). */
  async getFeatures(tenantId: string): Promise<PlanFeatures> {
    return this.getPlanFeaturesUseCase.execute(tenantId);
  }
}
