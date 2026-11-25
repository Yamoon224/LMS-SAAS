import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { Attendance } from "../domain/attendance.entity";
import { ATTENDANCE_REPOSITORY } from "../domain/attendance.repository.port";
import type { AttendanceRepositoryPort } from "../domain/attendance.repository.port";
import { SessionFullError } from "../domain/live-session.entity";
import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

/** ENT-52/PUB: inscription d'un apprenant à une session live, dans la limite de la capacité. */
@Injectable()
export class RegisterForLiveSessionUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepository: AttendanceRepositoryPort,
  ) {}

  async execute(liveSessionId: string, userId: string): Promise<Attendance> {
    const session = await this.liveSessionRepository.findById(liveSessionId);
    if (!session) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }

    const existing = await this.attendanceRepository.findByLiveSessionAndUser(liveSessionId, userId);
    if (existing) {
      return existing;
    }

    const currentRegistrations = await this.liveSessionRepository.countRegistrations(liveSessionId);
    if (!session.hasAvailableSeat(currentRegistrations)) {
      throw new SessionFullError("Cette session a atteint sa capacité maximale.");
    }

    return this.attendanceRepository.register(liveSessionId, userId);
  }
}
