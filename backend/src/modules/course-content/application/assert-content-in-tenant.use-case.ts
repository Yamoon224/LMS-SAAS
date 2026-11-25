import { CoursesFacade } from "@modules/courses/courses.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { COURSE_MODULE_REPOSITORY } from "../domain/course-module.repository.port";
import type { CourseModuleRepositoryPort } from "../domain/course-module.repository.port";
import { LESSON_REPOSITORY } from "../domain/lesson.repository.port";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";

/**
 * Vérifie qu'un module ou une leçon issu(e) de la requête appartient bien
 * au tenant de l'appelant (formation -> tenant). Toute incohérence (id
 * inconnu, autre tenant, module qui n'est pas celui de la formation de
 * l'URL) produit la même 404 qu'une ressource absente: jamais de 403.
 */
@Injectable()
export class AssertContentInTenantUseCase {
  constructor(
    @Inject(COURSE_MODULE_REPOSITORY) private readonly moduleRepository: CourseModuleRepositoryPort,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepository: LessonRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
  ) {}

  /** Retourne l'id de la formation du module. `courseId` (URL), s'il est fourni, doit correspondre. */
  async assertModule(moduleId: string, tenantId: string, courseId?: string): Promise<string> {
    const courseModule = await this.moduleRepository.findById(moduleId);
    if (!courseModule || (courseId !== undefined && courseModule.courseId !== courseId)) {
      throw new NotFoundDomainError(`Module introuvable: ${moduleId}`);
    }
    await this.coursesFacade.assertCourseInTenant(courseModule.courseId, tenantId);
    return courseModule.courseId;
  }

  async assertLesson(lessonId: string, moduleId: string, tenantId: string): Promise<void> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || lesson.moduleId !== moduleId) {
      throw new NotFoundDomainError(`Leçon introuvable: ${lessonId}`);
    }
    await this.assertModule(moduleId, tenantId);
  }
}
