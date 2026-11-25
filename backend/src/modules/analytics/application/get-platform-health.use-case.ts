import { NotificationsFacade } from "@modules/notifications/notifications.facade";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { QueueHealthService } from "@shared/queue/queue-health.service";

import {
  assessQueue,
  overallStatus,
  summarizeStorage,
  summarizeWebhooks,
  WEBHOOK_WINDOW_HOURS,
} from "../domain/platform-health";
import type { HealthStatus, QueueHealth, StorageHealth, WebhookHealth } from "../domain/platform-health";
import { PLATFORM_HEALTH_REPOSITORY } from "../domain/platform-health.repository.port";
import type { PlatformHealthRepositoryPort } from "../domain/platform-health.repository.port";

export interface PlatformHealthReport {
  generatedAt: Date;
  overall: HealthStatus;
  queues: QueueHealth[];
  webhooks: WebhookHealth;
  storage: StorageHealth;
}

const NOTIFICATIONS_QUEUE_LABEL = "notifications";

/**
 * ADM-35 : santé technique. Chaque composant est lu indépendamment : une file injoignable (ex. Redis arrêté) est
 * signalée comme telle sans empêcher d'afficher les webhooks et le stockage.
 */
@Injectable()
export class GetPlatformHealthUseCase {
  private readonly logger = new Logger(GetPlatformHealthUseCase.name);

  constructor(
    @Inject(PLATFORM_HEALTH_REPOSITORY) private readonly repository: PlatformHealthRepositoryPort,
    private readonly notificationsFacade: NotificationsFacade,
    @Optional() private readonly queueHealthService?: QueueHealthService,
  ) {}

  async execute(now: Date = new Date()): Promise<PlatformHealthReport> {
    const since = new Date(now.getTime() - WEBHOOK_WINDOW_HOURS * 60 * 60 * 1000);
    const [notificationsQueue, sharedQueues, webhookCounts, storageRows] = await Promise.all([
      this.readNotificationsQueue(),
      this.readSharedQueues(),
      this.repository.getWebhookCounts(since),
      this.repository.getStorageByTenant(),
    ]);

    const queues = [notificationsQueue, ...sharedQueues];
    const webhooks = summarizeWebhooks(webhookCounts);
    return {
      generatedAt: now,
      overall: overallStatus([...queues.map((queue) => queue.status), webhooks.status]),
      queues,
      webhooks,
      storage: summarizeStorage(storageRows),
    };
  }

  /** BE-08 : files dédiées (rappels, PDF, traduction IA). */
  private async readSharedQueues(): Promise<QueueHealth[]> {
    if (!this.queueHealthService) return [];
    try {
      const stats = await this.queueHealthService.getAllStats();
      return stats.map((queue) => assessQueue(queue.name, queue.counts));
    } catch (error) {
      this.logger.warn(`Files partagées illisibles : ${String(error)}`);
      return [];
    }
  }

  private async readNotificationsQueue(): Promise<QueueHealth> {
    try {
      return assessQueue(NOTIFICATIONS_QUEUE_LABEL, await this.notificationsFacade.getQueueStats());
    } catch (error) {
      this.logger.warn(`File « ${NOTIFICATIONS_QUEUE_LABEL} » injoignable : ${String(error)}`);
      return assessQueue(NOTIFICATIONS_QUEUE_LABEL, null);
    }
  }
}
