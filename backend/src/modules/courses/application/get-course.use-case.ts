import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { Course } from "../domain/course.entity";
import { COURSE_REPOSITORY } from "../domain/course.repository.port";
import type { CourseRepositoryPort } from "../domain/course.repository.port";

/** PUB-03: fiche formation. */
@Injectable()
export class GetCourseUseCase {
  constructor(@Inject(COURSE_REPOSITORY) private readonly courseRepository: CourseRepositoryPort) {}

  async execute(courseId: string): Promise<Course> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundDomainError(`Formation introuvable: ${courseId}`);
    }
    return course;
  }

  /**
   * Vue entreprise: la formation doit appartenir au tenant de l'appelant.
   * Une formation d'un autre tenant produit exactement la même 404 qu'une
   * formation inexistante (jamais de 403, pour ne pas révéler son existence).
   */
  async executeInTenant(courseId: string, tenantId: string): Promise<Course> {
    const course = await this.courseRepository.findByIdInTenant(courseId, tenantId);
    if (!course) {
      throw new NotFoundDomainError(`Formation introuvable: ${courseId}`);
    }
    return course;
  }

  /** Tableau de bord apprenant: formations (toutes dispositions) d'un tenant en une requête. */
  async executeManyInTenant(courseIds: string[], tenantId: string) {
    return this.courseRepository.findManyByIdsInTenant(courseIds, tenantId);
  }

  /**
   * Vue catalogue public (PUB-03): uniquement une formation PUBLISHED du tenant
   * courant. Brouillon, masquée (HIDDEN), archivée, inconnue ou d'un autre
   * tenant: même 404. Les inscrits à une formation masquée y accèdent par
   * leurs routes apprenant (ENT-18), pas par le catalogue.
   */
  async executePublished(courseId: string, tenantId: string): Promise<Course> {
    const course = await this.executeInTenant(courseId, tenantId);
    if (!course.isPurchasable()) {
      throw new NotFoundDomainError(`Formation introuvable: ${courseId}`);
    }
    return course;
  }
}
