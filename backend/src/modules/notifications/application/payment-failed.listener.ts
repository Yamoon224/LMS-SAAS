import { PaymentFailedEvent } from "@modules/payments/payments.events";
import { UsersFacade } from "@modules/users/users.facade";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** Alerte l'entreprise en cas d'échec de paiement (abonnement, crédits ou inscription hors ligne). */
@Injectable()
export class PaymentFailedListener {
  private readonly logger = new Logger(PaymentFailedListener.name);

  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly usersFacade: UsersFacade,
  ) {}

  @OnEvent("payment.failed")
  async handle(event: PaymentFailedEvent): Promise<void> {
    const owner = await this.usersFacade.findTenantOwner(event.payment.tenantId);
    if (!owner) {
      this.logger.warn(`Propriétaire introuvable pour le tenant ${event.payment.tenantId}, paiement échoué.`);
      return;
    }

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "payment.failed",
      payload: { amount: event.payment.amount, currency: event.payment.currency },
    });
  }
}
