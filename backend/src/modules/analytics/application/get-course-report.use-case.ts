import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { buildCourseReport } from "../domain/course-report";
import type { CourseReport } from "../domain/course-report";
import { COURSE_REPORT_REPOSITORY } from "../domain/course-report.repository.port";
import type { CourseReportRepositoryPort } from "../domain/course-report.repository.port";

/** ENT-67 : rapport par formation (entonnoir, modules bloquants, questions les plus échouées). */
@Injectable()
export class GetCourseReportUseCase {
  constructor(@Inject(COURSE_REPORT_REPOSITORY) private readonly repository: CourseReportRepositoryPort) {}

  async execute(tenantId: string, courseId: string): Promise<CourseReport> {
    const raw = await this.repository.getRawCourseReport(tenantId, courseId);
    // Même réponse pour « inexistante » et « autre entreprise » : on ne révèle pas l'existence.
    if (!raw) throw new NotFoundDomainError(`Formation introuvable: ${courseId}`);
    return buildCourseReport(raw);
  }
}
