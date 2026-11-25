import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { inactivityCutoffs, selectInactivityReminders } from "../domain/inactivity-reminder";
import { EnrollmentInactivityDetectedEvent } from "../enrollments.events";

/** Nombre maximal d'inscriptions examinées par passage (le cron quotidien reprend le reste le lendemain). */
const BATCH_SIZE = 500;

/**
 * PUB-18 : relance les apprenants dont l'inscription ACTIVE n'a pas progressé depuis 7 jours, au plus une fois par
 * 14 jours. Le rappel est « réservé » en base (comparaison avec la valeur précédente) AVANT l'émission de
 * l'événement : deux instances ou deux passages simultanés ne peuvent donc pas envoyer le même rappel deux fois.
 */
@Injectable()
export class SendInactivityRemindersUseCase {
  private readonly logger = new Logger(SendInactivityRemindersUseCase.name);

  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const { inactiveSince, remindedBefore } = inactivityCutoffs(now);
    const candidates = await this.enrollmentRepository.listInactivityCandidates(inactiveSince, remindedBefore, now, BATCH_SIZE);
    const reminders = selectInactivityReminders(candidates, now);

    let sent = 0;
    for (const reminder of reminders) {
      const claimed = await this.enrollmentRepository.claimInactivityReminder(
        reminder.enrollmentId,
        now,
        reminder.previousReminderAt,
      );
      if (!claimed) continue;
      this.eventEmitter.emit(
        "enrollment.inactivity-detected",
        new EnrollmentInactivityDetectedEvent(reminder.enrollmentId, reminder.userId, reminder.courseId, reminder.daysInactive),
      );
      sent += 1;
    }

    if (sent > 0) this.logger.log(`${sent} rappel(s) d'inactivité émis.`);
    return sent;
  }
}
