import { ProrataPaymentRequestedEvent } from "@modules/payments/payments.events";
import {
  RenewalPaymentRequestedEvent,
  RenewalReminderDueEvent,
  SubscriptionRenewedEvent,
  SubscriptionEnteredGracePeriodEvent,
  SubscriptionExpiredEvent,
  SubscriptionDiscountChangedEvent,
  SubscriptionPeriodExtendedEvent,
  SubscriptionPlanOfferedEvent,
} from "@modules/subscriptions/subscriptions.events";
import { UsersFacade } from "@modules/users/users.facade";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** ENT-03/RG-02: rappels de renouvellement, entrée en grâce, expiration — toujours adressés au Propriétaire. */
@Injectable()
export class SubscriptionLifecycleListener {
  private readonly logger = new Logger(SubscriptionLifecycleListener.name);

  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly usersFacade: UsersFacade,
  ) {}

  @OnEvent("subscription.renewal-reminder-due")
  async onRenewalReminderDue(event: RenewalReminderDueEvent): Promise<void> {
    const owner = await this.findOwnerOrWarn(event.tenantId);
    if (!owner) return;

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "subscription.renewal-reminder-due",
      payload: {
        daysUntilRenewal: event.daysUntilRenewal,
        currentPeriodEnd: event.currentPeriodEnd.toLocaleDateString("fr-FR"),
      },
    });
  }

  @OnEvent("subscription.entered-grace-period")
  async onEnteredGracePeriod(event: SubscriptionEnteredGracePeriodEvent): Promise<void> {
    const owner = await this.findOwnerOrWarn(event.tenantId);
    if (!owner) return;

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "subscription.entered-grace-period",
      payload: { graceEndsAt: event.graceEndsAt.toLocaleDateString("fr-FR") },
    });
  }

  @OnEvent("subscription.expired")
  async onExpired(event: SubscriptionExpiredEvent): Promise<void> {
    const owner = await this.findOwnerOrWarn(event.tenantId);
    if (!owner) return;

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "subscription.expired",
      payload: {},
    });
  }

  /** Étape 31 : renouvellement automatique — lien de paiement à régler avant l'échéance/la fin de grâce. */
  @OnEvent("subscription.renewal-payment-requested")
  async onRenewalPaymentRequested(event: RenewalPaymentRequestedEvent): Promise<void> {
    if (!event.checkoutUrl) return;
    const owner = await this.findOwnerOrWarn(event.tenantId);
    if (!owner) return;

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "subscription.renewal-payment-link",
      payload: {
        amount: event.amount,
        currency: event.currency,
        paymentUrl: event.checkoutUrl,
        dueDate: event.dueDate ? event.dueDate.toLocaleDateString("fr-FR") : "",
      },
    });
  }

  @OnEvent("subscription.renewed")
  async onRenewed(event: SubscriptionRenewedEvent): Promise<void> {
    const owner = await this.findOwnerOrWarn(event.tenantId);
    if (!owner) return;

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "subscription.renewed",
      payload: { newPeriodEnd: event.newPeriodEnd.toLocaleDateString("fr-FR") },
    });
  }

  /** ADM-09 : prolongation accordée par l'Admin. */
  @OnEvent("subscription.period-extended")
  async onPeriodExtended(event: SubscriptionPeriodExtendedEvent): Promise<void> {
    const owner = await this.findOwnerOrWarn(event.tenantId);
    if (!owner) return;

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "subscription.period-extended",
      payload: { newPeriodEnd: event.newPeriodEnd.toLocaleDateString("fr-FR") },
    });
  }

  /** ADM-09 : remise posée (rien n'est envoyé au retrait d'une remise). */
  @OnEvent("subscription.discount-changed")
  async onDiscountChanged(event: SubscriptionDiscountChangedEvent): Promise<void> {
    if (event.periods <= 0) return;
    const owner = await this.findOwnerOrWarn(event.tenantId);
    if (!owner) return;

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "subscription.discount-applied",
      payload: {
        discount: event.percent != null ? `${event.percent} %` : `${event.amount ?? 0}`,
        periods: event.periods,
      },
    });
  }

  /** ADM-09 : plan offert. Le nom du plan est résolu au plus simple (identifiant de prix non exposé au Propriétaire). */
  @OnEvent("subscription.plan-offered")
  async onPlanOffered(event: SubscriptionPlanOfferedEvent): Promise<void> {
    const owner = await this.findOwnerOrWarn(event.tenantId);
    if (!owner) return;

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "subscription.plan-offered",
      payload: { planName: event.planName, periodEnd: event.periodEnd.toLocaleDateString("fr-FR") },
    });
  }

  @OnEvent("payment.prorata-requested")
  async onProrataRequested(event: ProrataPaymentRequestedEvent): Promise<void> {
    if (!event.checkoutUrl) return;
    const owner = await this.findOwnerOrWarn(event.tenantId);
    if (!owner) return;

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "subscription.prorata-payment-link",
      payload: { amount: event.amount, currency: event.currency, paymentUrl: event.checkoutUrl },
    });
  }

  private async findOwnerOrWarn(tenantId: string) {
    const owner = await this.usersFacade.findTenantOwner(tenantId);
    if (!owner) {
      this.logger.warn(`Propriétaire introuvable pour le tenant ${tenantId}, notification abonnement ignorée.`);
    }
    return owner;
  }
}
