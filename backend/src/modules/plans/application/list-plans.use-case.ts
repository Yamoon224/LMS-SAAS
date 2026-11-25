import { Inject, Injectable } from "@nestjs/common";

import type { Plan } from "../domain/plan.entity";
import { PLAN_REPOSITORY } from "../domain/plan.repository.port";
import type { PlanRepositoryPort } from "../domain/plan.repository.port";

/** ENT-01: affichage des plans publics avec comparatif des quotas. */
@Injectable()
export class ListPlansUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly planRepository: PlanRepositoryPort) {}

  async listPublic(): Promise<Plan[]> {
    return this.planRepository.listPublic();
  }

  /** ADM-13: vue Admin incluant les plans privés (sur mesure) et archivés. */
  async listAll(): Promise<Plan[]> {
    return this.planRepository.listAll();
  }
}
