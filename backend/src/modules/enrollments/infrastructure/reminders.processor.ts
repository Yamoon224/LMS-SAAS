import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { QUEUE_NAMES } from "@shared/queue/queue.constants";
import type { Job } from "bullmq";

import { ExpireOverdueEnrollmentsUseCase } from "../application/expire-overdue-enrollments.use-case";
import { SendInactivityRemindersUseCase } from "../application/send-inactivity-reminders.use-case";

export const INACTIVITY_REMINDERS_JOB = "inactivity-reminders";
export const EXPIRE_ENROLLMENTS_JOB = "expire-overdue-enrollments";

/**
 * BE-08 : worker de la file « reminders ». Les cas d'usage sont idempotents (le rappel est « réservé » en base avant
 * émission), une reprise après échec ne peut donc pas envoyer deux fois le même rappel.
 */
@Processor(QUEUE_NAMES.REMINDERS)
export class RemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(RemindersProcessor.name);

  constructor(
    private readonly expireOverdueEnrollmentsUseCase: ExpireOverdueEnrollmentsUseCase,
    private readonly sendInactivityRemindersUseCase: SendInactivityRemindersUseCase,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Tâche ${job.name} (tentative ${job.attemptsMade + 1})`);
    switch (job.name) {
      case INACTIVITY_REMINDERS_JOB:
        await this.sendInactivityRemindersUseCase.execute();
        return;
      case EXPIRE_ENROLLMENTS_JOB:
        await this.expireOverdueEnrollmentsUseCase.execute();
        return;
      default:
        throw new Error(`Tâche inconnue dans la file reminders : ${job.name}`);
    }
  }
}
