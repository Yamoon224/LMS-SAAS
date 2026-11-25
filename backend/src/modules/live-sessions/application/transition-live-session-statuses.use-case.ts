import { Inject, Injectable, Logger } from "@nestjs/common";

import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

/**
 * BE: fait avancer automatiquement le statut des sessions live selon
 * l'horloge serveur — jamais au gré d'une action cliente, pour rester fiable
 * même si personne ne consulte la session au bon moment.
 */
@Injectable()
export class TransitionLiveSessionStatusesUseCase {
  private readonly logger = new Logger(TransitionLiveSessionStatusesUseCase.name);

  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
  ) {}

  async execute(now: Date = new Date()): Promise<void> {
    const toStart = await this.liveSessionRepository.listScheduledStartingBefore(now);
    for (const session of toStart) {
      session.start();
      await this.liveSessionRepository.save(session);
    }

    const toComplete = await this.liveSessionRepository.listInProgressEndingBefore(now);
    for (const session of toComplete) {
      session.complete();
      await this.liveSessionRepository.save(session);
    }

    if (toStart.length > 0 || toComplete.length > 0) {
      this.logger.log(`Sessions live démarrées: ${toStart.length}, terminées: ${toComplete.length}`);
    }
  }
}
