import type { TranslationJob } from "./translation-job.entity";

export interface CreateTranslationJobData {
  tenantId: string;
  courseId: string;
  targetLocale: string;
  wordCount: number;
  estimatedCredits: number;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface TranslationJobRepositoryPort {
  findById(id: string): Promise<TranslationJob | null>;
  listByCourse(courseId: string): Promise<TranslationJob[]>;
  listByTenant(tenantId: string): Promise<TranslationJob[]>;
  create(data: CreateTranslationJobData): Promise<TranslationJob>;
  save(job: TranslationJob): Promise<void>;
}

export const TRANSLATION_JOB_REPOSITORY = Symbol("TRANSLATION_JOB_REPOSITORY");
