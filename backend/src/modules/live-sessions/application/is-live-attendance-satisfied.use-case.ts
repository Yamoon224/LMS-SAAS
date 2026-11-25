import { Inject, Injectable } from "@nestjs/common";

import { ATTENDANCE_REPOSITORY } from "../domain/attendance.repository.port";
import type { AttendanceRepositoryPort } from "../domain/attendance.repository.port";
import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

/**
 * RG-08(b): "les présences live obligatoires sont enregistrées." Si le
 * module n'a aucune session live planifiée, la condition est considérée
 * satisfaite par défaut (rien à exiger) — sinon l'apprenant doit avoir une
 * présence effective (Attendance.attended) sur chacune d'entre elles.
 * Appelé par enrollments via LiveSessionsFacade pour résoudre
 * CheckModuleCompletionUseCase sans la limite précédemment documentée.
 */
@Injectable()
export class IsLiveAttendanceSatisfiedUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepository: AttendanceRepositoryPort,
  ) {}

  async execute(userId: string, moduleId: string): Promise<boolean> {
    const sessions = await this.liveSessionRepository.listByModule(moduleId);
    if (sessions.length === 0) {
      return true;
    }

    const attendances = await this.attendanceRepository.listAttendedByUserAndModule(userId, moduleId);
    const attendedLiveSessionIds = new Set(
      attendances.filter((attendance) => attendance.attended).map((attendance) => attendance.liveSessionId),
    );

    return sessions.every((session) => attendedLiveSessionIds.has(session.id));
  }
}
