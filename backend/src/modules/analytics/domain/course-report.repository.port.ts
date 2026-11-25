import type { RawCourseReport } from "./course-report";

/** Lecture seule des données brutes d'un rapport par formation (ENT-67). */
export interface CourseReportRepositoryPort {
  /** null si la formation n'existe pas dans cette entreprise. */
  getRawCourseReport(tenantId: string, courseId: string): Promise<RawCourseReport | null>;
}

export const COURSE_REPORT_REPOSITORY = Symbol("COURSE_REPORT_REPOSITORY");
