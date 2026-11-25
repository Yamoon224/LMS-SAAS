import { CoursesFacade } from "@modules/courses/courses.facade";
import { Inject, Injectable } from "@nestjs/common";
import { DomainError } from "@shared/errors/domain-error";

import type { CourseModule } from "../domain/course-module.entity";
import { COURSE_MODULE_REPOSITORY } from "../domain/course-module.repository.port";
import type { CourseModuleRepositoryPort } from "../domain/course-module.repository.port";

export class CourseNotEditableForContentError extends DomainError {
  readonly code = "FORMATION_NON_MODIFIABLE";
}

export interface CreateModuleInput {
  courseId: string;
  title: string;
  description?: string;
  estimatedDurationMinutes?: number;
}

/** ENT-22: ajouter un module — ajouté en fin de liste (ordre suivant). */
@Injectable()
export class CreateModuleUseCase {
  constructor(
    @Inject(COURSE_MODULE_REPOSITORY) private readonly moduleRepository: CourseModuleRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
  ) {}

  async execute(input: CreateModuleInput): Promise<CourseModule> {
    const course = await this.coursesFacade.findById(input.courseId);
    if (!course.isEditable()) {
      throw new CourseNotEditableForContentError(
        "Impossible d'ajouter un module à une formation archivée.",
      );
    }

    const order = await this.moduleRepository.nextOrder(input.courseId);
    return this.moduleRepository.create({ ...input, order });
  }
}
