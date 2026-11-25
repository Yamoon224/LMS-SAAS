import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import { SendNotificationUseCase } from "../application/send-notification.use-case";
import type { NotificationJobData } from "../domain/notification-queue.port";

import { NOTIFICATIONS_QUEUE_NAME } from "./bullmq-notification-queue.adapter";

/** Section 12.7: worker qui consomme la file et déclenche l'envoi effectif, avec nouvelle tentative automatique (BullMQ). */
@Processor(NOTIFICATIONS_QUEUE_NAME)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly sendNotificationUseCase: SendNotificationUseCase) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.debug(`Traitement de la notification ${job.data.notificationId} (tentative ${job.attemptsMade + 1})`);
    await this.sendNotificationUseCase.execute(job.data.notificationId);
  }
}
