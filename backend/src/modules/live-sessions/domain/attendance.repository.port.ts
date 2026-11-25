import type { Attendance } from "./attendance.entity";

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface AttendanceRepositoryPort {
  findByLiveSessionAndUser(liveSessionId: string, userId: string): Promise<Attendance | null>;
  listByLiveSession(liveSessionId: string): Promise<Attendance[]>;
  /** RG-08(b): toutes les présences effectives d'un apprenant sur les sessions liées à un module. */
  listAttendedByUserAndModule(userId: string, moduleId: string): Promise<Attendance[]>;
  register(liveSessionId: string, userId: string): Promise<Attendance>;
  save(attendance: Attendance): Promise<void>;
}

export const ATTENDANCE_REPOSITORY = Symbol("ATTENDANCE_REPOSITORY");
