import type { CourseStatus } from "./course-status";
import type { CourseType, ProgressionMode } from "./course-type";
import type { Course } from "./course.entity";

export interface CreateCourseData {
  tenantId: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: CourseType;
  progressionMode: ProgressionMode;
  sourceLocale: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  accessDurationDays?: number;
  category?: string;
  level?: string;
  estimatedDurationMinutes?: number;
  coverImageUrl?: string;
  instructorIds: string[];
}

export interface UpdateCourseData {
  title?: string;
  subtitle?: string;
  description?: string;
  progressionMode?: ProgressionMode;
  price?: number;
  compareAtPrice?: number;
  accessDurationDays?: number;
  category?: string;
  level?: string;
  estimatedDurationMinutes?: number;
  coverImageUrl?: string;
  instructorIds?: string[];
}

export interface CourseFilters {
  tenantId: string;
  status?: CourseStatus;
  category?: string;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface CourseRepositoryPort {
  findById(id: string): Promise<Course | null>;
  findByIdInTenant(id: string, tenantId: string): Promise<Course | null>;
  list(filters: CourseFilters): Promise<Course[]>;
  /** Une seule requête pour N formations d'un tenant (ids inconnus ou d'un autre tenant absents du résultat). */
  findManyByIdsInTenant(ids: string[], tenantId: string): Promise<Course[]>;
  create(data: CreateCourseData): Promise<Course>;
  update(id: string, data: UpdateCourseData): Promise<void>;
  updateStatus(id: string, status: CourseStatus): Promise<void>;
  /** BE-03: nombre de formations non archivées, pour le quota "maxCourses" (RG-03). */
  countActiveByTenant(tenantId: string): Promise<number>;
}

export const COURSE_REPOSITORY = Symbol("COURSE_REPOSITORY");
