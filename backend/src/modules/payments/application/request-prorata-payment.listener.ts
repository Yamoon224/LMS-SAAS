import { PlanChangedEvent } from "@modules/subscriptions/subscriptions.events";
import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

import { pickRenewalMethod } from "../domain/renewal-method";
import { ProrataPaymentRequestedEvent } from "../payments.events";

import { InitiatePaymentUseCase } from "./initiate-payment.use-case";
import { ListAvailableMethodsUseCase } from "./list-available-methods.use-case";

/**
 * ENT-04 : une montée en gamme immédiate avec prorata dû crée un paiement (lien) du montant calculé par le module
 * subscriptions. Ce paiement n'est pas celui d'un renouvellement : sa réussite ne modifie pas la période.
 */
@Injectable()
export class RequestProrataPaymentListener {
  private readonly logger = new Logger(RequestProrataPaymentListener.name);

  constructor(
    private readonly initiatePaymentUseCase: InitiatePaymentUseCase,
    private readonly listAvailableMethodsUseCase: ListAvailableMethodsUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent("subscription.plan-changed")
  async handle(event: PlanChangedEvent): Promise<void> {
    if (!event.immediate || event.prorataAmountDue <= 0 || !event.currency) return;

    try {
      const method = pickRenewalMethod(await this.listAvailableMethodsUseCase.execute());
      if (!method) throw new Error("Aucun moyen de paiement disponible.");
      const { checkout } = await this.initiatePaymentUseCase.execute({
        tenantId: event.tenantId,
        type: "SUBSCRIPTION",
        method,
        amount: event.prorataAmountDue,
        currency: event.currency,
        objectId: event.subscriptionId,
        subscriptionId: event.subscriptionId,
      });
      this.eventEmitter.emit(
        "payment.prorata-requested",
        new ProrataPaymentRequestedEvent(
          event.tenantId,
          event.subscriptionId,
          event.prorataAmountDue,
          event.currency,
          checkout.checkoutUrl ?? null,
        ),
      );
    } catch (error) {
      this.logger.error(`Paiement du prorata impossible (${event.subscriptionId}) : ${String(error)}`);
    }
  }
}
