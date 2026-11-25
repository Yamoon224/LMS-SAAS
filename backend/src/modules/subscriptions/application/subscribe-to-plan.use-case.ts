import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ForbiddenActionError } from "@shared/errors";
import { DomainError } from "@shared/errors/domain-error";

import { SubscriptionStatus } from "../domain/subscription-status";
import type { Subscription } from "../domain/subscription.entity";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";
import { SubscriptionCreatedEvent } from "../subscriptions.events";

import { assertSelectablePlanPrice } from "./assert-selectable-plan-price";

export class SubscriptionAlreadyExistsError extends DomainError {
  readonly code = "ABONNEMENT_DEJA_EXISTANT";
}

export interface SubscribeToPlanInput {
  tenantId: string;
  planPriceId: string;
  /** PROP-26: true si l'entreprise est éligible à une période d'essai sans carte. */
  startWithTrial: boolean;
  trialDays?: number;
  /**
   * true sur les routes entreprise (libre-service): plan public uniquement, et l'essai
   * n'est accordé que si le prix en prévoit un ET que l'entreprise n'a jamais eu
   * d'abonnement (le drapeau `startWithTrial` du client n'est qu'une demande).
   * false/omis: attribution par un administrateur (ADM-09).
   */
  selfService?: boolean;
}

/**
 * ENT-01: choix d'un plan par l'entreprise. Crée l'abonnement en attente de
 * paiement (activé ensuite par le module payments via PaymentSucceeded) ou,
 * si éligible, démarre directement une période d'essai (PROP-26).
 */
@Injectable()
export class SubscribeToPlanUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: SubscribeToPlanInput): Promise<Subscription> {
    const price = await assertSelectablePlanPrice(
      this.subscriptionRepository,
      input.planPriceId,
      input.selfService === true,
    );

    let trialDays = input.trialDays;
    if (input.selfService && input.startWithTrial) {
      const previous = await this.subscriptionRepository.findLatestForTenant(input.tenantId);
      if (price.trialDays <= 0 || previous) {
        throw new ForbiddenActionError("La période d'essai n'est pas disponible pour ce plan ou cette entreprise.");
      }
      trialDays = price.trialDays;
    }

    const existing = await this.subscriptionRepository.findActiveForTenant(input.tenantId);
    if (existing) {
      throw new SubscriptionAlreadyExistsError(
        "Cette entreprise dispose déjà d'un abonnement actif ; utilisez le changement de plan.",
      );
    }

    const subscription = await this.subscriptionRepository.create({
      tenantId: input.tenantId,
      planPriceId: input.planPriceId,
      status: SubscriptionStatus.PENDING_PAYMENT,
    });

    if (input.startWithTrial) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + (trialDays ?? 14));
      subscription.startTrial(trialEnd);
      await this.subscriptionRepository.save(subscription);
    }

    this.eventEmitter.emit(
      "subscription.created",
      new SubscriptionCreatedEvent(
        subscription.id,
        input.tenantId,
        input.planPriceId,
        subscription.status,
      ),
    );

    return subscription;
  }
}
