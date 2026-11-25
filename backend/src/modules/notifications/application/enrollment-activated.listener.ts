import { CoursesFacade } from "@modules/courses/courses.facade";
import { EnrollmentActivatedEvent } from "@modules/enrollments/enrollments.events";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotificationChannel } from "../domain/notification-channel";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** Confirme à l'apprenant son inscription, dès qu'elle donne accès au contenu. */
@Injectable()
export class EnrollmentActivatedListener {
  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly coursesFacade: CoursesFacade,
  ) {}

  @OnEvent("enrollment.activated")
  async handle(event: EnrollmentActivatedEvent): Promise<void> {
    const course = await this.coursesFacade.findById(event.courseId);

    await this.notifyUserUseCase.execute({
      userId: event.userId,
      templateKey: "enrollment.activated",
      channel: NotificationChannel.IN_APP,
      payload: { courseTitle: course.title },
    });
  }
}
