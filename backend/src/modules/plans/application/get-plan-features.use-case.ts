import { Inject, Injectable } from "@nestjs/common";

import { PLAN_FEATURE_REPOSITORY } from "../domain/plan-feature.repository.port";
import type { PlanFeatureRepositoryPort } from "../domain/plan-feature.repository.port";
import type { PlanFeatures } from "../domain/plan-quotas";

/** ADM-14: feature flags du plan actif d'un tenant (ex. aiTranslation, customCertificates). */
@Injectable()
export class GetPlanFeaturesUseCase {
  constructor(
    @Inject(PLAN_FEATURE_REPOSITORY) private readonly featureRepository: PlanFeatureRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<PlanFeatures> {
    const features = await this.featureRepository.getFeaturesForTenant(tenantId);
    return features ?? {};
  }
}
