import type { LiveSession } from "./live-session.entity";

export interface CreateLiveSessionData {
  tenantId: string;
  courseId: string;
  moduleId?: string;
  title: string;
  startAt: Date;
  durationMinutes: number;
  timezone: string;
  capacity?: number;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface LiveSessionRepositoryPort {
  findById(id: string): Promise<LiveSession | null>;
  listByCourse(courseId: string): Promise<LiveSession[]>;
  listByModule(moduleId: string): Promise<LiveSession[]>;
  /** PUB-05 : prochaines sessions (planifiées ou en cours, non terminées avant `from`) de plusieurs formations. */
  listUpcomingByCourses(courseIds: string[], from: Date, limit: number): Promise<LiveSession[]>;
  /** BE: sessions planifiées dont l'heure de début est dépassée, pour le passage automatique en IN_PROGRESS/COMPLETED. */
  listScheduledStartingBefore(cutoff: Date): Promise<LiveSession[]>;
  listInProgressEndingBefore(cutoff: Date): Promise<LiveSession[]>;
  create(data: CreateLiveSessionData): Promise<LiveSession>;
  save(session: LiveSession): Promise<void>;
  countRegistrations(liveSessionId: string): Promise<number>;
}

export const LIVE_SESSION_REPOSITORY = Symbol("LIVE_SESSION_REPOSITORY");
