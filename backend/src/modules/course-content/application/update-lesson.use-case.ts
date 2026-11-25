import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { LessonContent } from "../domain/lesson-content.vo";
import { LESSON_REPOSITORY } from "../domain/lesson.repository.port";
import type { LessonRepositoryPort, UpdateLessonData } from "../domain/lesson.repository.port";

@Injectable()
export class UpdateLessonUseCase {
  constructor(@Inject(LESSON_REPOSITORY) private readonly lessonRepository: LessonRepositoryPort) {}

  async execute(lessonId: string, data: UpdateLessonData): Promise<void> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new NotFoundDomainError(`Leçon introuvable: ${lessonId}`);
    }

    // Chaîne vide acceptée : vider le contenu d'une leçon est une modification légitime.
    const sanitizedContentHtml =
      data.contentHtml === undefined ? undefined : LessonContent.create(data.contentHtml).toString();

    await this.lessonRepository.update(lessonId, { ...data, contentHtml: sanitizedContentHtml });
  }
}
