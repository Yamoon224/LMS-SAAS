import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

/** ENT-57: dépôt du lien de replay après la tenue de la session. */
@Injectable()
export class SetReplayUrlUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
  ) {}

  async execute(liveSessionId: string, tenantId: string, replayUrl: string): Promise<void> {
    const session = await this.liveSessionRepository.findById(liveSessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }

    session.setReplayUrl(replayUrl);
    await this.liveSessionRepository.save(session);
  }
}
