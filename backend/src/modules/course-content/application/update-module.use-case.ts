import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { COURSE_MODULE_REPOSITORY } from "../domain/course-module.repository.port";
import type { CourseModuleRepositoryPort, UpdateModuleData } from "../domain/course-module.repository.port";

@Injectable()
export class UpdateModuleUseCase {
  constructor(
    @Inject(COURSE_MODULE_REPOSITORY) private readonly moduleRepository: CourseModuleRepositoryPort,
  ) {}

  async execute(moduleId: string, data: UpdateModuleData): Promise<void> {
    const courseModule = await this.moduleRepository.findById(moduleId);
    if (!courseModule) {
      throw new NotFoundDomainError(`Module introuvable: ${moduleId}`);
    }

    await this.moduleRepository.update(moduleId, data);
  }
}
