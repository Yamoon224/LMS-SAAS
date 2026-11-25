import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { QUEUE_NAMES, jobOptions } from "@shared/queue/queue.constants";
import type { Queue } from "bullmq";

import { ExpireOverdueEnrollmentsUseCase } from "./application/expire-overdue-enrollments.use-case";
import { SendInactivityRemindersUseCase } from "./application/send-inactivity-reminders.use-case";
import { EXPIRE_ENROLLMENTS_JOB, INACTIVITY_REMINDERS_JOB } from "./infrastructure/reminders.processor";

/**
 * BE-12/RG-17 et PUB-18 : les déclencheurs cron ne font plus le travail eux-mêmes, ils déposent une tâche dans la
 * file « reminders » (BE-08) : reprise automatique avec attente exponentielle, échecs conservés. Le `jobId` est
 * propre à la période : plusieurs instances du backend déposent la même tâche une seule fois. Si Redis est
 * injoignable, on exécute directement (comportement historique) plutôt que de perdre le passage.
 */
@Injectable()
export class EnrollmentsScheduler {
  private readonly logger = new Logger(EnrollmentsScheduler.name);

  constructor(
    private readonly expireOverdueEnrollmentsUseCase: ExpireOverdueEnrollmentsUseCase,
    private readonly sendInactivityRemindersUseCase: SendInactivityRemindersUseCase,
    @InjectQueue(QUEUE_NAMES.REMINDERS) private readonly remindersQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireOverdueEnrollments(): Promise<void> {
    await this.enqueueOrRun(EXPIRE_ENROLLMENTS_JOB, 13, () => this.expireOverdueEnrollmentsUseCase.execute());
  }

  /** PUB-18: rappel d'inactivité (7 jours sans progression, au plus un rappel par 14 jours), chaque jour à 09h00. */
  @Cron("0 9 * * *")
  async sendInactivityReminders(): Promise<void> {
    await this.enqueueOrRun(INACTIVITY_REMINDERS_JOB, 10, () => this.sendInactivityRemindersUseCase.execute());
  }

  /** @param periodLength longueur du préfixe ISO identifiant la période (13 = heure, 10 = jour). */
  private async enqueueOrRun(name: string, periodLength: number, runInline: () => Promise<unknown>): Promise<void> {
    const period = new Date().toISOString().slice(0, periodLength);
    try {
      await this.remindersQueue.add(name, {}, jobOptions({ jobId: `${name}:${period}` }));
    } catch (error) {
      this.logger.warn(`File reminders indisponible (${String(error)}), exécution directe de « ${name} ».`);
      await runInline();
    }
  }
}
