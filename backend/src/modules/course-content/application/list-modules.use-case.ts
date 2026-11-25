import { Inject, Injectable } from "@nestjs/common";

import type { CourseModule } from "../domain/course-module.entity";
import { COURSE_MODULE_REPOSITORY } from "../domain/course-module.repository.port";
import type { CourseModuleRepositoryPort } from "../domain/course-module.repository.port";

/** ENT-22/PUB-03: programme d'une formation (liste des modules). */
@Injectable()
export class ListModulesUseCase {
  constructor(
    @Inject(COURSE_MODULE_REPOSITORY) private readonly moduleRepository: CourseModuleRepositoryPort,
  ) {}

  async execute(courseId: string): Promise<CourseModule[]> {
    return this.moduleRepository.listByCourse(courseId);
  }
}
