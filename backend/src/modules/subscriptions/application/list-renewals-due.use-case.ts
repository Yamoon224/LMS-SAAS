import { Inject, Injectable } from "@nestjs/common";

import type { Subscription } from "../domain/subscription.entity";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";

/** ENT-03: fournit les abonnements dont l'échéance tombe dans les N jours (rappels J-7/J-3/J-1). */
@Injectable()
export class ListRenewalsDueUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
  ) {}

  async execute(withinDays: number, now: Date = new Date()): Promise<Subscription[]> {
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + withinDays);
    return this.subscriptionRepository.listDueForRenewal(deadline);
  }
}
