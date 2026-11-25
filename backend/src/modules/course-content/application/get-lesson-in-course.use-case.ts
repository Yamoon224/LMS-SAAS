import { Inject, Injectable } from "@nestjs/common";

import { COURSE_MODULE_REPOSITORY } from "../domain/course-module.repository.port";
import type { CourseModuleRepositoryPort } from "../domain/course-module.repository.port";
import type { Lesson } from "../domain/lesson.entity";
import { LESSON_REPOSITORY } from "../domain/lesson.repository.port";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";

/**
 * Lecteur apprenant (PUB-09): retrouve une leçon uniquement si son module appartient bien à la
 * formation indiquée (celle de l'inscription). Leçon inconnue OU d'une autre formation: `null`,
 * que l'appelant convertit en 404 uniforme (jamais d'erreur de clé étrangère, jamais de 403).
 */
@Injectable()
export class GetLessonInCourseUseCase {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessonRepository: LessonRepositoryPort,
    @Inject(COURSE_MODULE_REPOSITORY) private readonly moduleRepository: CourseModuleRepositoryPort,
  ) {}

  async execute(lessonId: string, courseId: string): Promise<Lesson | null> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) return null;
    const courseModule = await this.moduleRepository.findById(lesson.moduleId);
    return courseModule && courseModule.courseId === courseId ? lesson : null;
  }
}
