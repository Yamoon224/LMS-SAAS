import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { LanguagesFacade } from "@modules/languages/languages.facade";
import { Inject, Injectable } from "@nestjs/common";
import { DomainError } from "@shared/errors";

import { estimateTranslationCredits } from "../domain/translation-credit-cost";
import type { TranslationJob } from "../domain/translation-job.entity";
import { TRANSLATION_JOB_REPOSITORY } from "../domain/translation-job.repository.port";
import type { TranslationJobRepositoryPort } from "../domain/translation-job.repository.port";
import { countWords } from "../domain/word-counter";

export class CannotTranslateToSourceLocaleError extends DomainError {
  readonly code = "LANGUE_CIBLE_IDENTIQUE_SOURCE";
}

/** 1 crédit IA pour 10 mots, arrondi au supérieur — taux unique de la plateforme (ADM-18). */
const CREDITS_PER_WORD = 0.1;

/**
 * ADM-18: "le gestionnaire voit le coût estimé (en crédits) avant de
 * confirmer la traduction." Compte les mots de la fiche formation et de
 * toutes les leçons, convertit en crédits, et crée le job en ESTIMATED —
 * aucun débit n'a encore lieu à ce stade.
 */
@Injectable()
export class EstimateTranslationUseCase {
  constructor(
    @Inject(TRANSLATION_JOB_REPOSITORY) private readonly jobRepository: TranslationJobRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly languagesFacade: LanguagesFacade,
  ) {}

  /** La formation doit appartenir au tenant de l'appelant (404 sinon): le job est facturé à ce tenant. */
  async execute(courseId: string, tenantId: string, targetLocale: string): Promise<TranslationJob> {
    // ADM-40 : la langue cible doit exister et être activée (jamais une chaîne libre envoyée au fournisseur d'IA).
    await this.languagesFacade.assertEnabled(targetLocale);
    const course = await this.coursesFacade.findByIdInTenant(courseId, tenantId);
    if (course.sourceLocale === targetLocale) {
      throw new CannotTranslateToSourceLocaleError(
        "La langue cible ne peut pas être identique à la langue source de la formation.",
      );
    }

    const wordCount = await this.countCourseWords(courseId);
    const estimatedCredits = estimateTranslationCredits(wordCount, CREDITS_PER_WORD);

    return this.jobRepository.create({
      tenantId: course.tenantId,
      courseId,
      targetLocale,
      wordCount,
      estimatedCredits,
    });
  }

  private async countCourseWords(courseId: string): Promise<number> {
    const modules = await this.courseContentFacade.listModules(courseId);
    let total = 0;

    for (const courseModule of modules) {
      const lessons = await this.courseContentFacade.listLessons(courseModule.id);
      for (const lesson of lessons) {
        total += countWords(lesson.contentHtml ?? "");
      }
    }

    return total;
  }
}
