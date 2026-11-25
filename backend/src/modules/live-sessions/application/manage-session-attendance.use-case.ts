import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { Attendance } from "../domain/attendance.entity";
import { ATTENDANCE_REPOSITORY } from "../domain/attendance.repository.port";
import type { AttendanceRepositoryPort } from "../domain/attendance.repository.port";
import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";
import { LiveAttendanceMarkedEvent } from "../live-sessions.events";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "PENDING";

export interface SessionAttendee {
  userId: string;
  learnerName: string | null;
  email: string | null;
  status: AttendanceStatus;
  markedManually: boolean;
  markedAt: Date | null;
}

/**
 * Statut affiché : présent si `attended` (connexion suffisante ou pointage), absent si pointé absent manuellement,
 * sinon « en attente » (pas encore de verdict).
 */
export function attendanceStatus(attendance: Attendance): AttendanceStatus {
  if (attendance.attended) return "PRESENT";
  return attendance.markedManually ? "ABSENT" : "PENDING";
}

/** ENT-57 : l'entreprise liste les inscrits d'une session live et pointe leur présence à la main (audité). */
@Injectable()
export class ManageSessionAttendanceUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepository: AttendanceRepositoryPort,
    private readonly usersFacade: UsersFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(liveSessionId: string, tenantId: string): Promise<SessionAttendee[]> {
    await this.assertSession(liveSessionId, tenantId);
    const attendances = await this.attendanceRepository.listByLiveSession(liveSessionId);
    const users = await this.usersFacade.findManyByIds([...new Set(attendances.map((a) => a.userId))]);
    const userById = new Map(users.map((u) => [u.id, u]));
    return attendances.map((attendance) => {
      const snapshot = attendance.toSnapshot();
      return {
        userId: attendance.userId,
        learnerName: userById.get(attendance.userId)?.fullName ?? null,
        email: userById.get(attendance.userId)?.email ?? null,
        status: attendanceStatus(attendance),
        markedManually: attendance.markedManually,
        markedAt: snapshot.markedAt ?? null,
      };
    });
  }

  async mark(
    liveSessionId: string,
    tenantId: string,
    userId: string,
    present: boolean,
    actorId: string,
    now: Date = new Date(),
  ): Promise<AttendanceStatus> {
    await this.assertSession(liveSessionId, tenantId);
    const attendance = await this.attendanceRepository.findByLiveSessionAndUser(liveSessionId, userId);
    if (!attendance) {
      throw new NotFoundDomainError(`Cet apprenant n'est pas inscrit à la session: ${userId}`);
    }

    attendance.markManually(present, actorId, now);
    await this.attendanceRepository.save(attendance);
    this.eventEmitter.emit(
      "live-attendance.marked",
      new LiveAttendanceMarkedEvent(liveSessionId, tenantId, actorId, userId, present),
    );
    return attendanceStatus(attendance);
  }

  private async assertSession(liveSessionId: string, tenantId: string): Promise<void> {
    const session = await this.liveSessionRepository.findById(liveSessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }
  }
}
