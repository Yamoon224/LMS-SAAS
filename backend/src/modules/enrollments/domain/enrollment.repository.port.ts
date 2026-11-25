import type { EnrollmentStatus } from "./enrollment-status";
import type { Enrollment } from "./enrollment.entity";
import type { InactivityCandidate } from "./inactivity-reminder";

export interface CreateEnrollmentData {
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  pricePaid: number;
  currency: string;
  locale: string;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface EnrollmentRepositoryPort {
  findById(id: string): Promise<Enrollment | null>;
  /** RG-20: un même utilisateur ne peut avoir qu'une inscription par formation. */
  findByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null>;
  listByUser(userId: string): Promise<Enrollment[]>;
  listByCourse(courseId: string, status?: EnrollmentStatus): Promise<Enrollment[]>;
  create(data: CreateEnrollmentData): Promise<Enrollment>;
  save(enrollment: Enrollment): Promise<void>;
  countActiveByCourse(courseId: string): Promise<number>;
  /** BE-12: inscriptions actives dont la date d'expiration est dépassée (cron). */
  listExpiredButStillActive(now: Date): Promise<Enrollment[]>;
  /**
   * PUB-18 : inscriptions ACTIVE, non expirées, sans activité depuis `inactiveSince` et non relancées depuis
   * `remindedBefore`, avec leur dernière activité (progression de leçon, à défaut début/création).
   */
  listInactivityCandidates(inactiveSince: Date, remindedBefore: Date, now: Date, limit: number): Promise<InactivityCandidate[]>;
  /** PUB-18 : réserve atomiquement le rappel (faux si un autre passage l'a déjà réservé ou si l'inscription n'est plus ACTIVE). */
  claimInactivityReminder(enrollmentId: string, at: Date, previousReminderAt: Date | null): Promise<boolean>;
}

export const ENROLLMENT_REPOSITORY = Symbol("ENROLLMENT_REPOSITORY");
