import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { ATTENDANCE_REPOSITORY } from "../domain/attendance.repository.port";
import type { AttendanceRepositoryPort } from "../domain/attendance.repository.port";
import { assertCanJoinLiveSession } from "../domain/live-session-join-window";
import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

/** RG-08(b): seuil minimal de présence effective pour valider la session (évite une connexion de quelques secondes). */
const MIN_ATTENDANCE_PERCENT = 70;

/**
 * BE: enregistre la connexion/déconnexion d'un apprenant à une session live,
 * typiquement en réaction à un webhook Google Meet ou à un ping côté client
 * pendant la session. `recordLeave` dérive `attended` de la durée réelle de
 * présence (RG-08b), jamais de la simple inscription.
 */
@Injectable()
export class RecordAttendanceUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepository: AttendanceRepositoryPort,
  ) {}

  /** PUB-13 : on ne rejoint qu'à partir de 15 minutes avant le début et jusqu'à la fin de la session. */
  async recordJoin(liveSessionId: string, userId: string, now: Date = new Date()): Promise<void> {
    const session = await this.liveSessionRepository.findById(liveSessionId);
    if (!session) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }
    assertCanJoinLiveSession(session, now);
    const attendance = await this.getOrRegister(liveSessionId, userId);
    attendance.recordJoin();
    await this.attendanceRepository.save(attendance);
  }

  async recordLeave(liveSessionId: string, userId: string): Promise<void> {
    const session = await this.liveSessionRepository.findById(liveSessionId);
    if (!session) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }

    const attendance = await this.getOrRegister(liveSessionId, userId);
    attendance.recordLeave(session.durationMinutes, MIN_ATTENDANCE_PERCENT);
    await this.attendanceRepository.save(attendance);
  }

  private async getOrRegister(liveSessionId: string, userId: string) {
    const existing = await this.attendanceRepository.findByLiveSessionAndUser(liveSessionId, userId);
    if (existing) return existing;
    return this.attendanceRepository.register(liveSessionId, userId);
  }
}
