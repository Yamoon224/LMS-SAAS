import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { buildIcsCalendar } from "../domain/ics-calendar";
import { LiveSessionStatus } from "../domain/live-session-status";
import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

import { AuthorizeLearnerLiveSessionUseCase } from "./authorize-learner-live-session.use-case";

export interface LiveSessionCalendarFile {
  filename: string;
  content: string;
}

/** PUB-13 : fichier .ics (« Ajouter à mon agenda ») d'une session live, pour un apprenant qui y a accès. */
@Injectable()
export class GetLiveSessionCalendarUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
    private readonly authorizeLearnerLiveSessionUseCase: AuthorizeLearnerLiveSessionUseCase,
  ) {}

  async execute(liveSessionId: string, userId: string, tenantId: string, now: Date = new Date()): Promise<LiveSessionCalendarFile> {
    await this.authorizeLearnerLiveSessionUseCase.assertSessionAccess(liveSessionId, userId, tenantId);
    return this.build(liveSessionId, now);
  }

  /** ENT-56 : même fichier pour le gestionnaire, après contrôle d'appartenance de la session au tenant. */
  async executeForTenant(liveSessionId: string, tenantId: string, now: Date = new Date()): Promise<LiveSessionCalendarFile> {
    const session = await this.liveSessionRepository.findById(liveSessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }
    return this.build(liveSessionId, now);
  }

  private async build(liveSessionId: string, now: Date): Promise<LiveSessionCalendarFile> {
    const session = await this.liveSessionRepository.findById(liveSessionId);
    if (!session || session.status === LiveSessionStatus.CANCELED) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }

    const content = buildIcsCalendar({
      uid: session.id,
      title: session.title,
      startAt: session.startAt,
      durationMinutes: session.durationMinutes,
      url: session.meetLink,
      timezone: session.timezone,
      now,
    });
    // Nom de fichier construit uniquement à partir de l'identifiant (jamais du titre) : pas d'injection d'en-tête.
    return { filename: `session-${session.id.replace(/[^A-Za-z0-9-]/g, "")}.ics`, content };
  }
}
