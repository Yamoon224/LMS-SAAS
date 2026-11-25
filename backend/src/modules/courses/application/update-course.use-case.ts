import { Inject, Injectable } from "@nestjs/common";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { COURSE_REPOSITORY } from "../domain/course.repository.port";
import type { CourseRepositoryPort, UpdateCourseData } from "../domain/course.repository.port";

export class CourseNotEditableError extends DomainError {
  readonly code = "FORMATION_NON_MODIFIABLE";
}

/**
 * ENT-21: la modification d'une formation publiée ne casse pas la
 * progression des inscrits — c'est garanti structurellement ici puisque la
 * mise à jour ne touche que la fiche (titre, prix, description...), jamais
 * les inscriptions ni la progression, qui vivent dans d'autres modules.
 * Seule une formation archivée est verrouillée.
 */
@Injectable()
export class UpdateCourseUseCase {
  constructor(@Inject(COURSE_REPOSITORY) private readonly courseRepository: CourseRepositoryPort) {}

  async execute(courseId: string, tenantId: string, data: UpdateCourseData): Promise<void> {
    const course = await this.courseRepository.findByIdInTenant(courseId, tenantId);
    if (!course) {
      throw new NotFoundDomainError(`Formation introuvable: ${courseId}`);
    }

    if (!course.isEditable()) {
      throw new CourseNotEditableError("Une formation archivée ne peut plus être modifiée.");
    }

    await this.courseRepository.update(courseId, data);
  }
}
