import type { Progress } from "./progress.entity";

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface ProgressRepositoryPort {
  findByEnrollmentAndLesson(enrollmentId: string, lessonId: string): Promise<Progress | null>;
  listByEnrollment(enrollmentId: string): Promise<Progress[]>;
  /** Crée l'enregistrement de progression au premier accès à une leçon (upsert implicite côté use case). */
  create(enrollmentId: string, lessonId: string): Promise<Progress>;
  save(progress: Progress): Promise<void>;
  /** ENT-64: "réinitialiser une progression" — supprime tous les enregistrements de cette inscription. */
  deleteAllForEnrollment(enrollmentId: string): Promise<void>;
}

export const PROGRESS_REPOSITORY = Symbol("PROGRESS_REPOSITORY");
