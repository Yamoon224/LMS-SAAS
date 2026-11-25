import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { LESSON_REPOSITORY } from "../domain/lesson.repository.port";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";

@Injectable()
export class DeleteLessonUseCase {
  constructor(@Inject(LESSON_REPOSITORY) private readonly lessonRepository: LessonRepositoryPort) {}

  async execute(lessonId: string): Promise<void> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new NotFoundDomainError(`Leçon introuvable: ${lessonId}`);
    }

    await this.lessonRepository.delete(lessonId);
  }
}
