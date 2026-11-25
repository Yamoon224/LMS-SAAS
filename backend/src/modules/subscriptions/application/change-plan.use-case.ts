import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError } from "@shared/errors";

import type { ProrationResult } from "../domain/billing-math";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";
import { PlanChangedEvent } from "../subscriptions.events";

import { resolvePlanChange } from "./resolve-plan-change";

export class DowngradeNotImmediateError extends DomainError {
  readonly code = "DESCENTE_DIFFEREE";
}

export interface ChangePlanInput {
  tenantId: string;
  newPlanPriceId: string;
  /** true si le nouveau plan est plus cher (comparaison faite par l'appelant, côté module plans). */
  isUpgrade: boolean;
  /**
   * true sur les routes entreprise: le plan cible doit être public et `isUpgrade` n'est PAS
   * cru sur parole — la montée en gamme n'est immédiate que si le prix cible (ramené au
   * mois) est réellement supérieur au prix courant, sinon le changement est planifié.
   */
  selfService?: boolean;
  now?: Date;
}

export interface ChangePlanResult {
  /** Vrai si la montée en gamme a été appliquée tout de suite, faux si planifiée à l'échéance. */
  immediate: boolean;
  /** Prorata dû (montée en gamme libre-service uniquement ; null sinon). */
  proration: ProrationResult | null;
  /** Date d'application du changement planifié (échéance courante). */
  scheduledFor: Date | null;
}

/**
 * ENT-04: montée en gamme immédiate (prorata calculé par `computeProration`, lien de paiement créé par le
 * module payments en réaction à l'événement) ; descente de gamme PERSISTÉE comme changement planifié
 * (`pendingPlanPriceId`/`pendingChangeAt`), appliquée au renouvellement et annulable d'ici là. RG-04 (contrôle
 * des quotas avant une descente) est à la charge de l'appelant via PlansFacade.checkQuota.
 */
@Injectable()
export class ChangePlanUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ChangePlanInput): Promise<ChangePlanResult> {
    const now = input.now ?? new Date();
    const selfService = input.selfService === true;
    const { subscription, target, proration } = await resolvePlanChange(
      this.subscriptionRepository,
      input.tenantId,
      input.newPlanPriceId,
      selfService,
      now,
    );

    // Libre-service : le serveur recalcule. Admin (ADM-09) : `isUpgrade` fait foi, sans facturation.
    const isUpgrade = selfService ? input.isUpgrade && proration.timing === "IMMEDIATE" : input.isUpgrade;

    if (isUpgrade) {
      subscription.changePlanPrice(input.newPlanPriceId);
      await this.subscriptionRepository.save(subscription);

      const amountDue = selfService ? proration.amountDue : 0;
      this.eventEmitter.emit(
        "subscription.plan-changed",
        new PlanChangedEvent(subscription.id, input.tenantId, input.newPlanPriceId, true, amountDue, target.currency),
      );
      return { immediate: true, proration: selfService ? proration : null, scheduledFor: null };
    }

    // Revenir au plan courant annule simplement une planification éventuelle.
    if (input.newPlanPriceId === subscription.planPriceId) {
      subscription.cancelPendingPlanChange();
      await this.subscriptionRepository.save(subscription);
      return { immediate: false, proration: null, scheduledFor: null };
    }

    subscription.schedulePlanChange(input.newPlanPriceId);
    await this.subscriptionRepository.save(subscription);
    this.eventEmitter.emit(
      "subscription.plan-change-scheduled",
      new PlanChangedEvent(subscription.id, input.tenantId, input.newPlanPriceId, false),
    );
    return { immediate: false, proration: null, scheduledFor: subscription.pendingChangeAt };
  }
}
