import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";
import { SubscriptionActivatedEvent } from "../subscriptions.events";

/**
 * ENT-02 / RG-06: active l'abonnement après confirmation du paiement par le
 * fournisseur (appelé en réaction à l'événement PaymentSucceeded du module
 * payments, jamais directement depuis une route HTTP).
 */
@Injectable()
export class ActivateSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(subscriptionId: string, periodEnd: Date): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundDomainError(`Abonnement introuvable: ${subscriptionId}`);
    }

    subscription.activate(periodEnd);
    await this.subscriptionRepository.save(subscription);

    this.eventEmitter.emit(
      "subscription.activated",
      new SubscriptionActivatedEvent(subscription.id, subscription.tenantId),
    );
  }
}
