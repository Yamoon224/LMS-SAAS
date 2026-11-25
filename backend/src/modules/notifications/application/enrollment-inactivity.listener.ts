import { CoursesFacade } from "@modules/courses/courses.facade";
import { EnrollmentInactivityDetectedEvent } from "@modules/enrollments/enrollments.events";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotificationChannel } from "../domain/notification-channel";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** PUB-18 : rappel d'inactivité envoyé dans l'application ET par e-mail (gabarit `enrollment.inactivity-reminder`). */
@Injectable()
export class EnrollmentInactivityListener {
  private readonly logger = new Logger(EnrollmentInactivityListener.name);

  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly coursesFacade: CoursesFacade,
  ) {}

  @OnEvent("enrollment.inactivity-detected")
  async handle(event: EnrollmentInactivityDetectedEvent): Promise<void> {
    try {
      const course = await this.coursesFacade.findById(event.courseId);
      const payload = { courseTitle: course.title, daysInactive: event.daysInactive };
      for (const channel of [NotificationChannel.IN_APP, NotificationChannel.EMAIL]) {
        await this.notifyUserUseCase.execute({
          userId: event.userId,
          templateKey: "enrollment.inactivity-reminder",
          channel,
          payload,
        });
      }
    } catch (error) {
      // Un rappel raté ne doit jamais faire échouer le passage planifié (il sera simplement sauté jusqu'au prochain cycle).
      this.logger.warn(`Rappel d'inactivité non envoyé (inscription ${event.enrollmentId}): ${String(error)}`);
    }
  }
}
