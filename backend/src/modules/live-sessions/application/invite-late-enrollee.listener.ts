import { EnrollmentActivatedEvent } from "@modules/enrollments/enrollments.events";
import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { LiveSessionStatus } from "../domain/live-session-status";
import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";
import {
  VIDEO_CONFERENCE_PROVIDER,
  type VideoConferenceProviderPort,
} from "../domain/video-conference-provider.port";

/**
 * ENT-55: "les apprenants qui s'inscrivent après la planification d'une
 * session live y sont automatiquement ajoutés comme invités." Ne couvre que
 * les sessions futures déjà créées côté Google Calendar — une session déjà
 * tenue n'a plus de sens à inviter rétroactivement.
 */
@Injectable()
export class InviteLateEnrolleeListener {
  private readonly logger = new Logger(InviteLateEnrolleeListener.name);

  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
    @Inject(VIDEO_CONFERENCE_PROVIDER)
    private readonly videoConferenceProvider: VideoConferenceProviderPort,
    private readonly usersFacade: UsersFacade,
  ) {}

  @OnEvent("enrollment.activated")
  async handle(event: EnrollmentActivatedEvent): Promise<void> {
    const sessions = await this.liveSessionRepository.listByCourse(event.courseId);
    const upcomingSessions = sessions.filter(
      (session) => session.status === LiveSessionStatus.SCHEDULED && session.meetLink !== null,
    );
    if (upcomingSessions.length === 0) {
      return;
    }

    const user = await this.usersFacade.findById(event.userId);
    if (!user) {
      this.logger.warn(`Apprenant introuvable pour l'invitation tardive: ${event.userId}`);
      return;
    }

    for (const session of upcomingSessions) {
      const googleEventId = session.toSnapshot().googleEventId;
      if (!googleEventId) continue;
      await this.videoConferenceProvider.addAttendees(googleEventId, [user.email]);
    }
  }
}
