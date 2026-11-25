import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { COURSE_MODULE_REPOSITORY } from "../domain/course-module.repository.port";
import type { CourseModuleRepositoryPort } from "../domain/course-module.repository.port";

/** ENT-22: supprimer un module (et ses leçons, via la cascade de persistance). */
@Injectable()
export class DeleteModuleUseCase {
  constructor(
    @Inject(COURSE_MODULE_REPOSITORY) private readonly moduleRepository: CourseModuleRepositoryPort,
  ) {}

  async execute(moduleId: string): Promise<void> {
    const courseModule = await this.moduleRepository.findById(moduleId);
    if (!courseModule) {
      throw new NotFoundDomainError(`Module introuvable: ${moduleId}`);
    }

    await this.moduleRepository.delete(moduleId);
  }
}
