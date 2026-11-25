import { CoursesFacade } from "@modules/courses/courses.facade";
import { EnrollmentRefusedEvent } from "@modules/enrollments/enrollments.events";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotificationChannel } from "../domain/notification-channel";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** ENT-61 : prévient l'apprenant que son paiement hors plateforme a été refusé, avec le motif de l'entreprise. */
@Injectable()
export class EnrollmentRefusedListener {
  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly coursesFacade: CoursesFacade,
  ) {}

  @OnEvent("enrollment.refused")
  async handle(event: EnrollmentRefusedEvent): Promise<void> {
    const course = await this.coursesFacade.findById(event.courseId);

    await this.notifyUserUseCase.execute({
      userId: event.userId,
      templateKey: "enrollment.refused",
      channel: NotificationChannel.IN_APP,
      payload: { courseTitle: course.title, reason: event.reason },
    });
  }
}
