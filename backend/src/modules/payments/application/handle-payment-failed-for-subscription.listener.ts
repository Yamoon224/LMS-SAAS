import { SubscriptionsFacade } from "@modules/subscriptions/subscriptions.facade";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";


import { PaymentFailedEvent } from "../payments.events";

/** RG-02: un échec de renouvellement fait entrer l'abonnement en période de grâce. */
@Injectable()
export class HandlePaymentFailedForSubscriptionListener {
  private readonly logger = new Logger(HandlePaymentFailedForSubscriptionListener.name);

  constructor(private readonly subscriptionsFacade: SubscriptionsFacade) {}

  @OnEvent("payment.failed")
  async handle(event: PaymentFailedEvent): Promise<void> {
    if (event.payment.type !== "SUBSCRIPTION" || !event.payment.subscriptionId) {
      return;
    }

    await this.subscriptionsFacade.handleRenewalFailure(event.payment.subscriptionId, event.payment.id);
    this.logger.warn(`Échec de paiement d'abonnement traité: ${event.payment.subscriptionId}`);
  }
}
