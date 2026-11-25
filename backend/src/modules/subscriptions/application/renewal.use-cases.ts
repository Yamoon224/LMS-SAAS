import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { applyDiscount, nextPeriodEnd, periodMonths } from "../domain/billing-math";
import { SubscriptionStatus } from "../domain/subscription-status";
import type { Subscription } from "../domain/subscription.entity";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";
import {
  RenewalPaymentRequestedEvent,
  SubscriptionActivatedEvent,
  SubscriptionEnteredGracePeriodEvent,
  SubscriptionExpiredEvent,
  SubscriptionRenewedEvent,
} from "../subscriptions.events";

/** Demande de paiement à créer par le module payments pour une échéance. */
export interface RenewalQuote {
  subscriptionId: string;
  tenantId: string;
  amount: number;
  currency: string;
  dueDate: Date;
}

async function loadOrThrow(repository: SubscriptionRepositoryPort, id: string): Promise<Subscription> {
  const subscription = await repository.findById(id);
  if (!subscription) throw new NotFoundDomainError(`Abonnement introuvable: ${id}`);
  return subscription;
}

/** Identifiants des abonnements pour lesquels une demande de renouvellement peut être créée maintenant. */
@Injectable()
export class ListRenewalCandidatesUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
  ) {}

  async execute(now: Date = new Date()): Promise<string[]> {
    const candidates = await this.subscriptionRepository.listRenewalCandidates(now);
    return candidates.filter((subscription) => subscription.canStartRenewal(now)).map((subscription) => subscription.id);
  }
}

/**
 * ENT-03: réserve le renouvellement d'une échéance (idempotence : mise à jour conditionnelle atomique — un second
 * passage ou un passage concurrent reçoit `null`). Le prix facturé est celui du changement planifié s'il existe.
 * Un prix à 0 est renouvelé immédiatement, sans paiement.
 */
@Injectable()
export class BeginRenewalUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(subscriptionId: string, now: Date = new Date()): Promise<RenewalQuote | null> {
    const subscription = await loadOrThrow(this.subscriptionRepository, subscriptionId);
    if (!subscription.canStartRenewal(now) || !subscription.currentPeriodEnd) return null;

    const price = await this.subscriptionRepository.findPlanPriceSelection(subscription.nextPlanPriceId());
    if (!price) throw new NotFoundDomainError(`Prix de plan introuvable: ${subscription.nextPlanPriceId()}`);

    const dueDate = subscription.currentPeriodEnd;
    // ADM-09 : la remise Admin s'applique au montant facturé ; une remise de 100 % renouvelle sans paiement.
    const amountDue = applyDiscount(price.amount, subscription.activeDiscount());
    const expected = {
      status: subscription.status,
      renewalForPeriodEnd: subscription.renewalForPeriodEnd,
      lastRenewalStatus: subscription.lastRenewalStatus,
      lastRenewalAt: subscription.lastRenewalAt,
    };
    subscription.markRenewalRequested(amountDue, now);
    if (!(await this.subscriptionRepository.claimRenewalRequest(subscription, expected))) return null;

    if (amountDue <= 0) {
      const end = nextPeriodEnd(dueDate, periodMonths(price.period), now, false);
      subscription.completeRenewal(end, now);
      await this.subscriptionRepository.save(subscription);
      this.eventEmitter.emit(
        "subscription.renewed",
        new SubscriptionRenewedEvent(subscription.id, subscription.tenantId, subscription.planPriceId, end),
      );
      return null;
    }

    return {
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
      amount: amountDue,
      currency: price.currency,
      dueDate,
    };
  }
}

/** Rattache le paiement créé (et son lien) à la demande de renouvellement, puis prévient l'entreprise. */
@Injectable()
export class AttachRenewalPaymentUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(subscriptionId: string, paymentId: string, checkoutUrl: string | null, currency: string): Promise<void> {
    const subscription = await loadOrThrow(this.subscriptionRepository, subscriptionId);
    subscription.attachRenewalPayment(paymentId, checkoutUrl);
    await this.subscriptionRepository.save(subscription);
    this.eventEmitter.emit(
      "subscription.renewal-payment-requested",
      new RenewalPaymentRequestedEvent(
        subscription.id,
        subscription.tenantId,
        subscription.lastRenewalAmount ?? 0,
        currency,
        checkoutUrl,
        subscription.renewalForPeriodEnd,
      ),
    );
  }
}

/**
 * Réaction à un paiement d'abonnement confirmé (RG-06, déjà re-vérifié par payments) :
 * - paiement de la demande de renouvellement en attente → période prolongée, statut ACTIVE, descente appliquée ;
 * - sinon, abonnement en attente de paiement / en essai → activation initiale (ENT-02) ;
 * - sinon (ex. prorata d'une montée en gamme, déjà appliquée) → aucun effet sur la période.
 */
@Injectable()
export class ConfirmSubscriptionPaymentUseCase {
  private readonly logger = new Logger(ConfirmSubscriptionPaymentUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(subscriptionId: string, paymentId: string, now: Date = new Date()): Promise<void> {
    const subscription = await loadOrThrow(this.subscriptionRepository, subscriptionId);

    if (subscription.isAwaitingRenewalPayment(paymentId)) {
      if (
        subscription.status === SubscriptionStatus.SUSPENDED ||
        subscription.status === SubscriptionStatus.CANCELED
      ) {
        this.logger.warn(`Renouvellement payé mais abonnement ${subscription.status}: ${subscriptionId}`);
        return;
      }
      const price = await this.subscriptionRepository.findPlanPriceSelection(subscription.nextPlanPriceId());
      if (!price) throw new NotFoundDomainError(`Prix de plan introuvable: ${subscription.nextPlanPriceId()}`);
      const lapsed = subscription.status === SubscriptionStatus.EXPIRED;
      const end = nextPeriodEnd(subscription.currentPeriodEnd, periodMonths(price.period), now, lapsed);
      subscription.completeRenewal(end, now);
      await this.subscriptionRepository.save(subscription);
      this.eventEmitter.emit(
        "subscription.renewed",
        new SubscriptionRenewedEvent(subscription.id, subscription.tenantId, subscription.planPriceId, end),
      );
      return;
    }

    if (
      subscription.status === SubscriptionStatus.PENDING_PAYMENT ||
      subscription.status === SubscriptionStatus.TRIALING
    ) {
      const price = await this.subscriptionRepository.findPlanPriceSelection(subscription.planPriceId);
      const end = nextPeriodEnd(null, periodMonths(price?.period ?? "MONTHLY"), now, true);
      subscription.activate(end);
      await this.subscriptionRepository.save(subscription);
      this.eventEmitter.emit(
        "subscription.activated",
        new SubscriptionActivatedEvent(subscription.id, subscription.tenantId),
      );
    }
  }
}

/**
 * RG-02 : échec de renouvellement (paiement échoué/expiré, ou création du paiement impossible) → période de grâce
 * (3 jours). Un paiement échoué qui n'est pas celui de la demande en attente (prorata, paiement initial) est ignoré.
 * Pendant la grâce, l'échec d'une relance ne prolonge pas la grâce ; l'expiration est faite par
 * ProcessGracePeriodExpiryUseCase.
 */
@Injectable()
export class FailRenewalUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(subscriptionId: string, paymentId?: string, graceDays?: number, now: Date = new Date()): Promise<void> {
    const subscription = await loadOrThrow(this.subscriptionRepository, subscriptionId);
    if (paymentId !== undefined && !subscription.isAwaitingRenewalPayment(paymentId)) return;
    if (subscription.lastRenewalStatus !== "PENDING") return;
    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.GRACE_PERIOD
    ) {
      return;
    }

    const grace = subscription.failRenewal(now, graceDays);
    await this.subscriptionRepository.save(subscription);
    if (!grace) return;

    const event = new SubscriptionEnteredGracePeriodEvent(subscription.id, subscription.tenantId, grace.graceEndsAt);
    // Deux noms historiques : l'audit écoute `grace-period-started`, les notifications `entered-grace-period`.
    this.eventEmitter.emit("subscription.grace-period-started", event);
    this.eventEmitter.emit("subscription.entered-grace-period", event);
  }
}

/**
 * Renouvellement automatique désactivé : à l'échéance l'abonnement prend fin (ACTIVE → CANCELED, « fin à
 * l'échéance » de la section 8.1) au lieu de rester actif indéfiniment ; une descente planifiée devient caduque.
 */
@Injectable()
export class EndNonRenewingSubscriptionsUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const ended = await this.subscriptionRepository.listNonRenewingEnded(now);
    for (const subscription of ended) {
      subscription.cancelPendingPlanChange();
      subscription.cancelAtPeriodEnd();
      await this.subscriptionRepository.save(subscription);
      this.eventEmitter.emit("subscription.expired", new SubscriptionExpiredEvent(subscription.id, subscription.tenantId));
    }
    return ended.length;
  }
}
