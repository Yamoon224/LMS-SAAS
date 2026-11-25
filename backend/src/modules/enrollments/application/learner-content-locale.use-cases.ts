import { CoursesFacade } from "@modules/courses/courses.facade";
import { LanguagesFacade } from "@modules/languages/languages.facade";
import { Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { listAvailableLocales, resolveContentLocale } from "../domain/learner-locale";

import { GetEnrollmentUseCase } from "./get-enrollment.use-case";

/**
 * Langues traduites actuellement lisibles pour une formation : fiche publiée ET langue toujours activée sur la
 * plateforme (ADM-40). Désactiver une langue la retire donc aussi de la lecture, sans toucher aux traductions.
 */
@Injectable()
export class FindReadableTranslationsUseCase {
  constructor(
    private readonly coursesFacade: CoursesFacade,
    private readonly languagesFacade: LanguagesFacade,
  ) {}

  async execute(courseId: string): Promise<string[]> {
    const published = await this.coursesFacade.listPublishedCourseLocales(courseId);
    return this.languagesFacade.filterEnabled(published);
  }
}

/**
 * PUB-17 : langue à appliquer à une lecture. Ne coûte aucune requête quand aucune langue n'est demandée (cas
 * courant) ; une demande non satisfaisable retombe sur la langue d'origine sans erreur.
 */
@Injectable()
export class ResolveLearnerContentLocaleUseCase {
  constructor(private readonly findReadableTranslationsUseCase: FindReadableTranslationsUseCase) {}

  /** `null` = rester dans la langue d'origine. */
  async execute(courseId: string, sourceLocale: string, requested: string | undefined): Promise<string | null> {
    if (!requested?.trim() || requested.trim() === sourceLocale) return null;
    return resolveContentLocale(requested, sourceLocale, await this.findReadableTranslationsUseCase.execute(courseId));
  }
}

export interface LearnerCourseLocales {
  sourceLocale: string;
  /** Langue d'origine d'abord, puis les langues traduites lisibles. */
  available: string[];
}

/** PUB-17 : langues dans lesquelles l'apprenant peut lire sa formation. */
@Injectable()
export class ListLearnerCourseLocalesUseCase {
  constructor(
    private readonly getEnrollmentUseCase: GetEnrollmentUseCase,
    private readonly coursesFacade: CoursesFacade,
    private readonly findReadableTranslationsUseCase: FindReadableTranslationsUseCase,
  ) {}

  /** L'inscription doit appartenir à l'appelant et donner un accès actif : 404 uniforme sinon (RG-17). */
  async execute(enrollmentId: string, userId: string, tenantId: string): Promise<LearnerCourseLocales> {
    const enrollment = await this.getEnrollmentUseCase.executeOwned(enrollmentId, userId, tenantId);
    if (!enrollment.hasContentAccess()) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }
    const course = await this.coursesFacade.findByIdInTenant(enrollment.courseId, tenantId);
    const translated = await this.findReadableTranslationsUseCase.execute(enrollment.courseId);
    return { sourceLocale: course.sourceLocale, available: listAvailableLocales(course.sourceLocale, translated) };
  }
}
