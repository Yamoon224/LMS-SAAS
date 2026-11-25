import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { SubscriptionStatus } from "../domain/subscription-status";
import type { Subscription } from "../domain/subscription.entity";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";
import {
  SubscriptionCreatedEvent,
  SubscriptionDiscountChangedEvent,
  SubscriptionPeriodExtendedEvent,
  SubscriptionPlanOfferedEvent,
} from "../subscriptions.events";

import { assertSelectablePlanPrice } from "./assert-selectable-plan-price";

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_EXTENSION_DAYS = 366;
export const MAX_OFFER_DAYS = 3650;

export class InvalidAdminSubscriptionActionError extends DomainError {
  readonly code = "ACTION_ABONNEMENT_INVALIDE";
}

async function findCurrentOrThrow(repository: SubscriptionRepositoryPort, tenantId: string): Promise<Subscription> {
  const subscription = await repository.findActiveForTenant(tenantId);
  if (!subscription) throw new NotFoundDomainError(`Aucun abonnement actif pour l'entreprise: ${tenantId}`);
  return subscription;
}

function cleanReason(reason: string | undefined | null): string | null {
  const trimmed = reason?.trim();
  return trimmed ? trimmed : null;
}

export interface ExtendPeriodInput {
  tenantId: string;
  actorId: string;
  /** Exactement un des deux : nombre de jours ajoutés à l'échéance courante, ou nouvelle échéance. */
  days?: number;
  until?: Date;
  reason?: string;
  now?: Date;
}

/** ADM-09 : prolonger la période courante (jours ou date). Le renouvellement automatique est préservé. */
@Injectable()
export class ExtendSubscriptionPeriodUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly repository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ExtendPeriodInput): Promise<{ id: string; currentPeriodEnd: Date }> {
    const now = input.now ?? new Date();
    if ((input.days == null) === (input.until == null)) {
      throw new InvalidAdminSubscriptionActionError("Indiquez un nombre de jours ou une date, pas les deux.");
    }
    const subscription = await findCurrentOrThrow(this.repository, input.tenantId);
    const previous = subscription.currentPeriodEnd;
    const base = previous ?? now;

    let newEnd: Date;
    if (input.days != null) {
      if (!Number.isInteger(input.days) || input.days < 1 || input.days > MAX_EXTENSION_DAYS) {
        throw new InvalidAdminSubscriptionActionError(
          `La prolongation doit être comprise entre 1 et ${MAX_EXTENSION_DAYS} jours.`,
        );
      }
      newEnd = new Date(base.getTime() + input.days * DAY_MS);
    } else {
      newEnd = input.until as Date;
      if (Number.isNaN(newEnd.getTime()) || newEnd.getTime() - base.getTime() > MAX_EXTENSION_DAYS * DAY_MS) {
        throw new InvalidAdminSubscriptionActionError(
          `La nouvelle échéance ne peut pas dépasser ${MAX_EXTENSION_DAYS} jours après l'échéance actuelle.`,
        );
      }
    }

    subscription.extendPeriod(newEnd);
    await this.repository.save(subscription);
    this.eventEmitter.emit(
      "subscription.period-extended",
      new SubscriptionPeriodExtendedEvent(
        subscription.id,
        subscription.tenantId,
        input.actorId,
        previous,
        newEnd,
        cleanReason(input.reason),
      ),
    );
    return { id: subscription.id, currentPeriodEnd: newEnd };
  }
}

export interface ApplyDiscountInput {
  tenantId: string;
  actorId: string;
  percent?: number;
  amount?: number;
  /** Durée en périodes facturées (renouvellements). */
  periods: number;
  reason?: string;
}

/** ADM-09 : remise (pourcentage ou montant) sur les N prochaines périodes ; remplace la remise précédente. */
@Injectable()
export class ApplySubscriptionDiscountUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly repository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ApplyDiscountInput): Promise<{ id: string }> {
    const subscription = await findCurrentOrThrow(this.repository, input.tenantId);
    if (subscription.isComplimentary) {
      throw new InvalidAdminSubscriptionActionError("Un plan offert n'est pas facturé : aucune remise à appliquer.");
    }
    subscription.applyDiscount({ percent: input.percent, amount: input.amount }, input.periods);
    await this.repository.save(subscription);
    this.eventEmitter.emit(
      "subscription.discount-changed",
      new SubscriptionDiscountChangedEvent(
        subscription.id,
        subscription.tenantId,
        input.actorId,
        input.percent ?? null,
        input.amount ?? null,
        input.periods,
        cleanReason(input.reason),
      ),
    );
    return { id: subscription.id };
  }

  async remove(tenantId: string, actorId: string): Promise<{ id: string }> {
    const subscription = await findCurrentOrThrow(this.repository, tenantId);
    subscription.clearDiscount();
    await this.repository.save(subscription);
    this.eventEmitter.emit(
      "subscription.discount-changed",
      new SubscriptionDiscountChangedEvent(subscription.id, tenantId, actorId, null, null, 0, null),
    );
    return { id: subscription.id };
  }
}

export interface OfferPlanInput {
  tenantId: string;
  actorId: string;
  planPriceId: string;
  /** Durée du plan offert, en jours. */
  days: number;
  /** Obligatoire : justification journalisée. */
  reason: string;
  now?: Date;
}

/**
 * ADM-09 : plan offert sans paiement. L'abonnement passe ACTIVE jusqu'à la fin de l'offre (jamais avant l'échéance
 * déjà payée), sans renouvellement automatique : à l'échéance il prend fin via la tâche existante
 * (`EndNonRenewingSubscriptionsUseCase`), l'entreprise choisit alors un plan payant.
 */
@Injectable()
export class OfferPlanUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly repository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: OfferPlanInput): Promise<{ id: string; currentPeriodEnd: Date }> {
    const now = input.now ?? new Date();
    const reason = cleanReason(input.reason);
    if (!reason || reason.length < 5) {
      throw new InvalidAdminSubscriptionActionError("Un motif d'au moins 5 caractères est obligatoire pour offrir un plan.");
    }
    if (!Number.isInteger(input.days) || input.days < 1 || input.days > MAX_OFFER_DAYS) {
      throw new InvalidAdminSubscriptionActionError(`La durée offerte doit être comprise entre 1 et ${MAX_OFFER_DAYS} jours.`);
    }
    const price = await assertSelectablePlanPrice(this.repository, input.planPriceId, false);

    let subscription = await this.repository.findActiveForTenant(input.tenantId);
    let created = false;
    if (!subscription) {
      const latest = await this.repository.findLatestForTenant(input.tenantId);
      if (
        latest &&
        (latest.status === SubscriptionStatus.PENDING_PAYMENT || latest.status === SubscriptionStatus.EXPIRED)
      ) {
        subscription = latest;
      } else {
        subscription = await this.repository.create({
          tenantId: input.tenantId,
          planPriceId: input.planPriceId,
          status: SubscriptionStatus.PENDING_PAYMENT,
        });
        created = true;
      }
    }

    const offerEnd = new Date(now.getTime() + input.days * DAY_MS);
    const currentEnd = subscription.currentPeriodEnd;
    const periodEnd = currentEnd && currentEnd > offerEnd ? currentEnd : offerEnd;
    subscription.grantComplimentary(input.planPriceId, periodEnd, now);
    await this.repository.save(subscription);

    if (created) {
      this.eventEmitter.emit(
        "subscription.created",
        new SubscriptionCreatedEvent(subscription.id, input.tenantId, input.planPriceId, subscription.status),
      );
    }
    this.eventEmitter.emit(
      "subscription.plan-offered",
      new SubscriptionPlanOfferedEvent(subscription.id, input.tenantId, input.actorId, input.planPriceId, periodEnd, reason, price.planName ?? ""),
    );
    return { id: subscription.id, currentPeriodEnd: periodEnd };
  }
}
