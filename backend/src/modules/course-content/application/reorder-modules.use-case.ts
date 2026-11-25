import { Inject, Injectable } from "@nestjs/common";

import { COURSE_MODULE_REPOSITORY } from "../domain/course-module.repository.port";
import type { CourseModuleRepositoryPort } from "../domain/course-module.repository.port";

/** ENT-22: glisser-déposer pour réordonner les modules d'une formation. */
@Injectable()
export class ReorderModulesUseCase {
  constructor(
    @Inject(COURSE_MODULE_REPOSITORY) private readonly moduleRepository: CourseModuleRepositoryPort,
  ) {}

  async execute(courseId: string, orderedModuleIds: string[]): Promise<void> {
    await this.moduleRepository.reorder(courseId, orderedModuleIds);
  }
}
