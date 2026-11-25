import { Inject, Injectable } from "@nestjs/common";

import { EnqueueNotificationUseCase } from "./application/enqueue-notification.use-case";
import type { EnqueueNotificationInput } from "./application/enqueue-notification.use-case";
import { NOTIFICATION_QUEUE } from "./domain/notification-queue.port";
import type { NotificationQueuePort, NotificationQueueStats } from "./domain/notification-queue.port";
import { renderTemplate } from "./domain/notification-template";

/**
 * Seule API publique du module notifications. La plupart des modules
 * communiquent avec notifications via des événements de domaine plutôt que
 * cette façade (section 13.2) ; elle existe pour les cas où un module a
 * besoin d'un accusé de déclenchement explicite (aucun cas à ce jour).
 */
@Injectable()
export class NotificationsFacade {
  constructor(
    private readonly enqueueNotificationUseCase: EnqueueNotificationUseCase,
    @Inject(NOTIFICATION_QUEUE) private readonly notificationQueue: NotificationQueuePort,
  ) {}

  async notify(input: EnqueueNotificationInput): Promise<void> {
    await this.enqueueNotificationUseCase.execute(input);
  }

  /** Rend un gabarit (sujet + corps) avec sa charge ; langue de repli : français. Lève si le gabarit n'existe pas. */
  render(templateKey: string, locale: string, payload: Record<string, unknown>): { subject: string; body: string } {
    return renderTemplate(templateKey, locale, payload);
  }

  /** État de la file d'envoi (ADM-35) ; lève si le service de file est injoignable. */
  async getQueueStats(): Promise<NotificationQueueStats> {
    return this.notificationQueue.getStats();
  }
}
