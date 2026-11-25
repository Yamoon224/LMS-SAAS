import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";
import { SubscriptionExpiredEvent } from "../subscriptions.events";

/**
 * RG-02: fait passer au statut Expiré les abonnements dont la période de
 * grâce est dépassée. Déclenché par une tâche planifiée (BE-12).
 * L'événement émis bloque l'accès côté TenantsModule (RG-18 side effect)
 * et déclenche la notification à l'entreprise.
 */
@Injectable()
export class ProcessGracePeriodExpiryUseCase {
  private readonly logger = new Logger(ProcessGracePeriodExpiryUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const elapsed = await this.subscriptionRepository.listGraceElapsed(now);

    for (const subscription of elapsed) {
      subscription.expire();
      await this.subscriptionRepository.save(subscription);

      this.eventEmitter.emit(
        "subscription.expired",
        new SubscriptionExpiredEvent(subscription.id, subscription.tenantId),
      );
    }

    if (elapsed.length > 0) {
      this.logger.log(`${elapsed.length} abonnement(s) passé(s) au statut Expiré.`);
    }

    return elapsed.length;
  }
}
