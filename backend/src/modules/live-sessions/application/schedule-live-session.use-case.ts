import { CoursesFacade } from "@modules/courses/courses.facade";
import { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import type { LiveSession } from "../domain/live-session.entity";
import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";
import {
  VIDEO_CONFERENCE_PROVIDER,
  type VideoConferenceProviderPort,
} from "../domain/video-conference-provider.port";
import { LiveSessionScheduledEvent } from "../live-sessions.events";

export interface ScheduleLiveSessionInput {
  courseId: string;
  moduleId?: string;
  title: string;
  startAt: Date;
  durationMinutes: number;
  timezone: string;
  capacity?: number;
}

/**
 * ENT-52/ENT-53: planifie une session live et crée automatiquement
 * l'événement Google Calendar avec visioconférence Google Meet, en invitant
 * d'emblée tous les apprenants déjà inscrits à la formation avec un accès
 * actif (ENT-55 couvre les inscriptions ultérieures, via
 * InviteLateEnrolleeListener).
 */
@Injectable()
export class ScheduleLiveSessionUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
    @Inject(VIDEO_CONFERENCE_PROVIDER)
    private readonly videoConferenceProvider: VideoConferenceProviderPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly enrollmentsFacade: EnrollmentsFacade,
    private readonly usersFacade: UsersFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ScheduleLiveSessionInput): Promise<LiveSession> {
    const course = await this.coursesFacade.findById(input.courseId);

    const session = await this.liveSessionRepository.create({
      tenantId: course.tenantId,
      courseId: input.courseId,
      moduleId: input.moduleId,
      title: input.title,
      startAt: input.startAt,
      durationMinutes: input.durationMinutes,
      timezone: input.timezone,
      capacity: input.capacity,
    });

    const attendeeEmails = await this.resolveActiveLearnerEmails(input.courseId);

    const event = await this.videoConferenceProvider.createEvent({
      title: input.title,
      startAt: input.startAt,
      durationMinutes: input.durationMinutes,
      timezone: input.timezone,
      attendeeEmails,
    });

    session.attachGoogleMeet(event.meetLink, event.providerEventId);
    await this.liveSessionRepository.save(session);

    this.eventEmitter.emit(
      "live-session.scheduled",
      new LiveSessionScheduledEvent(session.id, input.courseId, input.title, input.startAt, event.meetLink),
    );

    return session;
  }

  private async resolveActiveLearnerEmails(courseId: string): Promise<string[]> {
    const enrollments = await this.enrollmentsFacade.listForCourse(courseId);
    const activeEnrollments = enrollments.filter((enrollment) => enrollment.hasContentAccess());

    const users = await Promise.all(
      activeEnrollments.map((enrollment) => this.usersFacade.findById(enrollment.userId)),
    );

    return users
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .map((user) => user.email);
  }
}
