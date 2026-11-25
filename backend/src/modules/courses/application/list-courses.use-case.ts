import { Inject, Injectable } from "@nestjs/common";

import { CourseStatus } from "../domain/course-status";
import type { Course } from "../domain/course.entity";
import { COURSE_REPOSITORY } from "../domain/course.repository.port";
import type { CourseFilters, CourseRepositoryPort } from "../domain/course.repository.port";

/** ENT-15 (liste entreprise) / PUB-02 (catalogue public, formations publiées uniquement). */
@Injectable()
export class ListCoursesUseCase {
  constructor(@Inject(COURSE_REPOSITORY) private readonly courseRepository: CourseRepositoryPort) {}

  async listForTenant(filters: CourseFilters): Promise<Course[]> {
    return this.courseRepository.list(filters);
  }

  /** PUB-02: catalogue public — uniquement les formations publiées. */
  async listPublished(tenantId: string, category?: string): Promise<Course[]> {
    return this.courseRepository.list({ tenantId, status: CourseStatus.PUBLISHED, category });
  }
}
