import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";

import type { NotificationJobData, NotificationQueuePort, NotificationQueueStats } from "../domain/notification-queue.port";

export const NOTIFICATIONS_QUEUE_NAME = "notifications";

@Injectable()
export class BullMqNotificationQueueAdapter implements NotificationQueuePort {
  constructor(@InjectQueue(NOTIFICATIONS_QUEUE_NAME) private readonly queue: Queue<NotificationJobData>) {}

  async enqueue(data: NotificationJobData): Promise<void> {
    await this.queue.add("send", data, {
      attempts: 5,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async getStats(): Promise<NotificationQueueStats> {
    const counts = await this.queue.getJobCounts("waiting", "active", "delayed", "failed", "paused");
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
      failed: counts.failed ?? 0,
      paused: counts.paused ?? 0,
    };
  }
}
