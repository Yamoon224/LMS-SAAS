import { RefundRequestDecidedEvent } from "@modules/payments/payments.events";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotificationChannel } from "../domain/notification-channel";

import { NotifyUserUseCase } from "./notify-user.use-case";

const TEMPLATE_BY_OUTCOME = {
  ACCEPTED: "refund.accepted",
  REJECTED: "refund.rejected",
  REFUNDED: "refund.refunded",
} as const;

/** ENT-70 : informe l'apprenant de chaque décision sur sa demande de remboursement. */
@Injectable()
export class RefundRequestDecidedListener {
  constructor(private readonly notifyUserUseCase: NotifyUserUseCase) {}

  @OnEvent("refund-request.decided")
  async handle(event: RefundRequestDecidedEvent): Promise<void> {
    if (!event.learnerUserId) return;

    await this.notifyUserUseCase.execute({
      userId: event.learnerUserId,
      templateKey: TEMPLATE_BY_OUTCOME[event.outcome],
      channel: NotificationChannel.IN_APP,
      payload: {
        courseTitle: event.courseTitle,
        note: event.note ?? "",
        amount: event.amount,
        currency: event.currency,
      },
    });
  }
}
