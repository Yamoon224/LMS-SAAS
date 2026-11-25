import type { CourseModule } from "./course-module.entity";

export interface CreateModuleData {
  courseId: string;
  title: string;
  description?: string;
  estimatedDurationMinutes?: number;
  order: number;
}

export interface UpdateModuleData {
  title?: string;
  description?: string;
  estimatedDurationMinutes?: number;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface CourseModuleRepositoryPort {
  findById(id: string): Promise<CourseModule | null>;
  listByCourse(courseId: string): Promise<CourseModule[]>;
  create(data: CreateModuleData): Promise<CourseModule>;
  update(id: string, data: UpdateModuleData): Promise<void>;
  delete(id: string): Promise<void>;
  /** ENT-22: glisser-déposer — réordonne tous les modules d'une formation en une transaction. */
  reorder(courseId: string, orderedModuleIds: string[]): Promise<void>;
  nextOrder(courseId: string): Promise<number>;
}

export const COURSE_MODULE_REPOSITORY = Symbol("COURSE_MODULE_REPOSITORY");
