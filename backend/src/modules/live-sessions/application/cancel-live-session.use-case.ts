import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";
import {
  VIDEO_CONFERENCE_PROVIDER,
  type VideoConferenceProviderPort,
} from "../domain/video-conference-provider.port";

/** ENT-56: annulation d'une session planifiée, avec suppression de l'événement Google Calendar. */
@Injectable()
export class CancelLiveSessionUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
    @Inject(VIDEO_CONFERENCE_PROVIDER)
    private readonly videoConferenceProvider: VideoConferenceProviderPort,
  ) {}

  async execute(liveSessionId: string, tenantId: string): Promise<void> {
    const session = await this.liveSessionRepository.findById(liveSessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }

    session.cancel();
    await this.liveSessionRepository.save(session);

    const snapshot = session.toSnapshot();
    if (snapshot.googleEventId) {
      await this.videoConferenceProvider.cancelEvent(snapshot.googleEventId);
    }
  }
}
