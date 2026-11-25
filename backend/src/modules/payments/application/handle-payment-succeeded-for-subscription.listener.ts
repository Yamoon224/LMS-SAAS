import { SubscriptionsFacade } from "@modules/subscriptions/subscriptions.facade";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";


import { PaymentSucceededEvent } from "../payments.events";

/**
 * Réagit à PaymentSucceeded : activation initiale (ENT-02) ou renouvellement (ENT-03), la période étant
 * calculée par le module subscriptions d'après la périodicité du prix. N'agit que si le paiement est de type SUBSCRIPTION et porte un
 * subscriptionId — les autres types (crédits, formation) sont gérés par
 * d'autres listeners à mesure que ces modules se construisent.
 */
@Injectable()
export class HandlePaymentSucceededForSubscriptionListener {
  private readonly logger = new Logger(HandlePaymentSucceededForSubscriptionListener.name);

  constructor(private readonly subscriptionsFacade: SubscriptionsFacade) {}

  @OnEvent("payment.succeeded")
  async handle(event: PaymentSucceededEvent): Promise<void> {
    if (event.payment.type !== "SUBSCRIPTION" || !event.payment.subscriptionId) {
      return;
    }

    await this.subscriptionsFacade.confirmSubscriptionPayment(event.payment.subscriptionId, event.payment.id);
    this.logger.log(`Paiement d'abonnement traité (activation ou renouvellement): ${event.payment.subscriptionId}`);
  }
}
