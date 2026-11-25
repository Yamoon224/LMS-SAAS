import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { PLAN_REPOSITORY } from "../domain/plan.repository.port";
import type { PlanRepositoryPort } from "../domain/plan.repository.port";
import { PlanArchivedEvent } from "../plans.events";

/** ADM-13: archiver un plan (reste visible pour les abonnés existants, non souscriptible). */
@Injectable()
export class ArchivePlanUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly planRepository: PlanRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(planId: string, actorId: string): Promise<void> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundDomainError(`Plan introuvable: ${planId}`);
    }
    if (plan.isArchived) return;
    await this.planRepository.archive(planId);
    this.eventEmitter.emit("plan.archived", new PlanArchivedEvent(planId, actorId, true));
  }

  /** Désarchivage : le plan redevient souscriptible (les abonnés existants n'ont jamais été touchés). */
  async restore(planId: string, actorId: string): Promise<void> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundDomainError(`Plan introuvable: ${planId}`);
    }
    if (!plan.isArchived) return;
    await this.planRepository.unarchive(planId);
    this.eventEmitter.emit("plan.archived", new PlanArchivedEvent(planId, actorId, false));
  }
}
