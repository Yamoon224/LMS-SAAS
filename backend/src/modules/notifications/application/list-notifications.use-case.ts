import { Inject, Injectable } from "@nestjs/common";

import type { Notification } from "../domain/notification.entity";
import { NOTIFICATION_REPOSITORY } from "../domain/notification.repository.port";
import type { NotificationRepositoryPort } from "../domain/notification.repository.port";

/** Centre de notifications in-app de l'utilisateur connecté. */
@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepository: NotificationRepositoryPort,
  ) {}

  async execute(recipientUserId: string, unreadOnly = false): Promise<Notification[]> {
    return this.notificationRepository.listForRecipient(recipientUserId, { unreadOnly });
  }
}
