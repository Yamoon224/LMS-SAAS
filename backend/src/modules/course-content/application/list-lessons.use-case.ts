import { Inject, Injectable } from "@nestjs/common";

import type { Lesson } from "../domain/lesson.entity";
import { LESSON_REPOSITORY } from "../domain/lesson.repository.port";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";

/** PUB-09: navigation par modules et leçons dans le lecteur de formation. */
@Injectable()
export class ListLessonsUseCase {
  constructor(@Inject(LESSON_REPOSITORY) private readonly lessonRepository: LessonRepositoryPort) {}

  async execute(moduleId: string): Promise<Lesson[]> {
    return this.lessonRepository.listByModule(moduleId);
  }
}
