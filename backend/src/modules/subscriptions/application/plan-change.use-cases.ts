import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { ProrationResult } from "../domain/billing-math";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";
import { PlanChangeCanceledEvent } from "../subscriptions.events";

import { resolvePlanChange } from "./resolve-plan-change";

export interface PlanChangePreview extends ProrationResult {
  newPlanPriceId: string;
  /** Immédiat : maintenant ; sinon l'échéance courante. */
  effectiveAt: Date | null;
}

/** ENT-04 : aperçu du prorata avant confirmation (lecture seule, mêmes règles que le changement réel). */
@Injectable()
export class PreviewPlanChangeUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
  ) {}

  async execute(tenantId: string, newPlanPriceId: string, now: Date = new Date()): Promise<PlanChangePreview> {
    const { subscription, proration } = await resolvePlanChange(
      this.subscriptionRepository,
      tenantId,
      newPlanPriceId,
      true,
      now,
    );
    return {
      ...proration,
      newPlanPriceId,
      effectiveAt: proration.timing === "IMMEDIATE" ? now : subscription.currentPeriodEnd,
    };
  }
}

/** ENT-04 : annulation d'une descente de gamme planifiée, possible tant qu'elle n'est pas appliquée. */
@Injectable()
export class CancelPendingPlanChangeUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(tenantId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findActiveForTenant(tenantId);
    if (!subscription) {
      throw new NotFoundDomainError(`Aucun abonnement actif pour l'entreprise: ${tenantId}`);
    }
    if (!subscription.cancelPendingPlanChange()) {
      throw new NotFoundDomainError("Aucun changement de plan planifié.");
    }
    await this.subscriptionRepository.save(subscription);
    this.eventEmitter.emit("subscription.plan-change-canceled", new PlanChangeCanceledEvent(subscription.id, tenantId));
  }
}

/** ENT-03 : interrupteur du renouvellement automatique (sans effet rétroactif sur un renouvellement déjà demandé). */
@Injectable()
export class SetAutoRenewUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
  ) {}

  async execute(tenantId: string, autoRenew: boolean): Promise<void> {
    const subscription = await this.subscriptionRepository.findActiveForTenant(tenantId);
    if (!subscription) {
      throw new NotFoundDomainError(`Aucun abonnement actif pour l'entreprise: ${tenantId}`);
    }
    subscription.setAutoRenew(autoRenew);
    await this.subscriptionRepository.save(subscription);
  }
}
