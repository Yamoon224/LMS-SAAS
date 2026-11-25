import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { NOTIFICATION_REPOSITORY } from "../domain/notification.repository.port";
import type { NotificationRepositoryPort } from "../domain/notification.repository.port";

/** Une notification n'est marquée lue que par son propre destinataire. */
@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepository: NotificationRepositoryPort,
  ) {}

  async execute(notificationId: string, requestingUserId: string): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new NotFoundDomainError(`Notification introuvable: ${notificationId}`);
    }

    if (notification.recipientUserId !== requestingUserId) {
      // Même 404 qu'une notification inconnue: ne révèle pas l'existence de celle d'autrui.
      throw new NotFoundDomainError(`Notification introuvable: ${notificationId}`);
    }

    notification.markRead();
    await this.notificationRepository.save(notification);
  }
}
