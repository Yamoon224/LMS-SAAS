import { Inject, Injectable } from "@nestjs/common";

import { LESSON_REPOSITORY } from "../domain/lesson.repository.port";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";

/** ENT-22/ENT-23: glisser-déposer pour réordonner les leçons d'un module. */
@Injectable()
export class ReorderLessonsUseCase {
  constructor(@Inject(LESSON_REPOSITORY) private readonly lessonRepository: LessonRepositoryPort) {}

  async execute(moduleId: string, orderedLessonIds: string[]): Promise<void> {
    await this.lessonRepository.reorder(moduleId, orderedLessonIds);
  }
}
