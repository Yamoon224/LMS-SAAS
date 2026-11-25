import { Inject, Injectable } from "@nestjs/common";
import { sanitizeHtml } from "@shared/security/html-sanitizer";

import {
  LESSON_LOCALE_REPOSITORY,
  type LessonLocaleRepositoryPort,
  type UpsertLessonLocaleData,
} from "../domain/lesson-locale.repository.port";

/**
 * ENT-46: enregistre le contenu traduit d'une leçon (origine IA ou manuelle).
 * Toujours en DRAFT — la publication reste une action manuelle du
 * gestionnaire après relecture, jamais automatique à la fin de la traduction.
 *
 * Le HTML traduit est assaini à l'écriture comme celui des leçons d'origine (BE-09) : il vient d'un fournisseur
 * d'IA externe et sera affiché aux apprenants.
 */
@Injectable()
export class UpsertLessonLocaleUseCase {
  constructor(
    @Inject(LESSON_LOCALE_REPOSITORY) private readonly lessonLocaleRepository: LessonLocaleRepositoryPort,
  ) {}

  async execute(data: UpsertLessonLocaleData): Promise<void> {
    await this.lessonLocaleRepository.upsert({
      ...data,
      contentHtml: data.contentHtml ? sanitizeHtml(data.contentHtml) : data.contentHtml,
    });
  }
}
