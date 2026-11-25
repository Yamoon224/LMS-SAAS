import { Inject, Injectable } from "@nestjs/common";

import type { NotificationChannel } from "../domain/notification-channel";
import { NOTIFICATION_QUEUE } from "../domain/notification-queue.port";
import type { NotificationQueuePort } from "../domain/notification-queue.port";
import { NOTIFICATION_REPOSITORY } from "../domain/notification.repository.port";
import type { NotificationRepositoryPort } from "../domain/notification.repository.port";

export interface EnqueueNotificationInput {
  tenantId: string | null;
  recipientUserId: string;
  channel: NotificationChannel;
  templateKey: string;
  locale: string;
  payload: Record<string, unknown>;
}

/**
 * Section 12.7: persiste la notification (statut PENDING) puis la met en
 * file — jamais d'envoi synchrone depuis un listener d'événement métier, qui
 * ne doit pas être ralenti ni échouer à cause d'un fournisseur externe
 * indisponible.
 */
@Injectable()
export class EnqueueNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepository: NotificationRepositoryPort,
    @Inject(NOTIFICATION_QUEUE) private readonly notificationQueue: NotificationQueuePort,
  ) {}

  async execute(input: EnqueueNotificationInput): Promise<void> {
    const notification = await this.notificationRepository.create({
      tenantId: input.tenantId,
      recipientUserId: input.recipientUserId,
      channel: input.channel,
      templateKey: input.templateKey,
      locale: input.locale,
      payload: input.payload,
    });

    await this.notificationQueue.enqueue({ notificationId: notification.id });
  }
}
