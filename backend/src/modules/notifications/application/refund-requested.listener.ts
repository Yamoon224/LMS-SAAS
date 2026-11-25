import { RefundRequestedEvent } from "@modules/payments/payments.events";
import { UsersFacade } from "@modules/users/users.facade";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** ENT-70 : prévient l'entreprise qu'une demande de remboursement attend son examen. */
@Injectable()
export class RefundRequestedListener {
  private readonly logger = new Logger(RefundRequestedListener.name);

  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly usersFacade: UsersFacade,
  ) {}

  @OnEvent("refund-request.requested")
  async handle(event: RefundRequestedEvent): Promise<void> {
    const owner = await this.usersFacade.findTenantOwner(event.tenantId);
    if (!owner) {
      this.logger.warn(`Propriétaire introuvable pour le tenant ${event.tenantId} : demande ${event.refundId} non notifiée.`);
      return;
    }

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "refund.requested",
      payload: { courseTitle: event.courseTitle, amount: event.amount, currency: event.currency },
    });
  }
}
