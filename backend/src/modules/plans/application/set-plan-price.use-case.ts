import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { BillingPeriod } from "../domain/billing-period";
import { PLAN_REPOSITORY } from "../domain/plan.repository.port";
import type { PlanRepositoryPort } from "../domain/plan.repository.port";

export interface SetPlanPriceInput {
  planId: string;
  period: BillingPeriod;
  currency: string;
  amount: number;
  trialDays: number;
}

/**
 * ADM-17: "une modification de prix crée une nouvelle version sans impacter
 * les abonnés existants". Le repository désactive l'ancien prix actif de la
 * période (isActive=false) et crée une nouvelle PlanPrice ; les abonnements
 * déjà liés à l'ancienne version conservent leur planPriceId inchangé.
 */
@Injectable()
export class SetPlanPriceUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly planRepository: PlanRepositoryPort) {}

  async execute(input: SetPlanPriceInput): Promise<void> {
    const plan = await this.planRepository.findById(input.planId);
    if (!plan) {
      throw new NotFoundDomainError(`Plan introuvable: ${input.planId}`);
    }

    await this.planRepository.addPriceVersion({
      planId: input.planId,
      period: input.period,
      currency: input.currency,
      amount: input.amount,
      trialDays: input.trialDays,
    });
  }
}
