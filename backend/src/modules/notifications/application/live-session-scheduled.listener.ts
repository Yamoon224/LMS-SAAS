import { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import { LiveSessionScheduledEvent } from "@modules/live-sessions/live-sessions.events";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** ENT-53: informe les apprenants déjà inscrits qu'une nouvelle session live a été planifiée. */
@Injectable()
export class LiveSessionScheduledListener {
  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly enrollmentsFacade: EnrollmentsFacade,
  ) {}

  @OnEvent("live-session.scheduled")
  async handle(event: LiveSessionScheduledEvent): Promise<void> {
    const enrollments = await this.enrollmentsFacade.listForCourse(event.courseId);
    const activeEnrollments = enrollments.filter((enrollment) => enrollment.hasContentAccess());

    await Promise.all(
      activeEnrollments.map((enrollment) =>
        this.notifyUserUseCase.execute({
          userId: enrollment.userId,
          templateKey: "live-session.scheduled",
          payload: {
            sessionTitle: event.title,
            startAt: event.startAt.toLocaleString("fr-FR"),
            meetLink: event.meetLink,
          },
        }),
      ),
    );
  }
}
