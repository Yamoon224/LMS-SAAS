import { Inject, Injectable } from "@nestjs/common";

import type { PlanFeatures, PlanQuotas } from "../domain/plan-quotas";
import type { Plan } from "../domain/plan.entity";
import { PLAN_REPOSITORY } from "../domain/plan.repository.port";
import type { PlanRepositoryPort } from "../domain/plan.repository.port";

export interface CreatePlanInput {
  name: string;
  description?: string;
  isPublic: boolean;
  quotas: PlanQuotas;
  features: PlanFeatures;
  commissionRatePercent?: number;
}

/** ADM-13/ADM-14: créer un plan tarifaire (quotas, fonctionnalités, visibilité). */
@Injectable()
export class CreatePlanUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly planRepository: PlanRepositoryPort) {}

  async execute(input: CreatePlanInput): Promise<Plan> {
    return this.planRepository.create(input);
  }
}
