import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { LanguagesFacade } from "@modules/languages/languages.facade";
import { Injectable } from "@nestjs/common";

import { assertPublishable, buildTranslationOverview } from "../domain/translation-publication";
import type { TranslationOverview } from "../domain/translation-publication";

/**
 * Nombre de leçons et traductions de leçons d'une formation. Les leçons sont lues module par module : la façade
 * course-content ne fournit pas de total par formation.
 */
async function countLessons(content: CourseContentFacade, courseId: string): Promise<number> {
  const modules = await content.listModules(courseId);
  let total = 0;
  for (const courseModule of modules) {
    total += (await content.listLessons(courseModule.id)).length;
  }
  return total;
}

async function translatedLessonsByLocale(content: CourseContentFacade, courseId: string): Promise<Map<string, number>> {
  const summaries = await content.summarizeLessonLocales(courseId);
  const byLocale = new Map<string, number>();
  for (const summary of summaries) {
    byLocale.set(summary.locale, (byLocale.get(summary.locale) ?? 0) + summary.count);
  }
  return byLocale;
}

/** PUB-17 : traductions d'une formation de l'entreprise (langue, statut, couverture des leçons). */
@Injectable()
export class ListCourseTranslationsUseCase {
  constructor(
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
  ) {}

  /** La formation doit appartenir à l'entreprise de l'appelant (404 sinon). */
  async execute(courseId: string, tenantId: string): Promise<TranslationOverview[]> {
    const course = await this.coursesFacade.findByIdInTenant(courseId, tenantId);
    const [courseLocales, lessonsTotal, translated] = await Promise.all([
      this.coursesFacade.listCourseLocales(courseId),
      countLessons(this.courseContentFacade, courseId),
      translatedLessonsByLocale(this.courseContentFacade, courseId),
    ]);
    return buildTranslationOverview(course.sourceLocale, courseLocales, translated, lessonsTotal);
  }
}

/**
 * PUB-17 : le gestionnaire publie (ou retire) une langue pour toute la formation, après relecture.
 *
 * Deux écritures dans deux modules, sans transaction commune. La fiche de la formation est la « porte » côté
 * apprenant : à la publication elle passe en DERNIER, au retrait en PREMIER. Une interruption entre les deux ne laisse
 * donc jamais une langue visible à moitié : au pire des leçons publiées restent invisibles faute de fiche publiée.
 */
@Injectable()
export class SetCourseTranslationPublicationUseCase {
  constructor(
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly languagesFacade: LanguagesFacade,
  ) {}

  async execute(courseId: string, tenantId: string, locale: string, published: boolean): Promise<void> {
    const course = await this.coursesFacade.findByIdInTenant(courseId, tenantId);

    if (!published) {
      await this.coursesFacade.setCourseLocaleStatus(courseId, locale, "DRAFT");
      await this.courseContentFacade.setLessonLocalesStatus(courseId, locale, "DRAFT");
      return;
    }

    // Publier une langue désactivée sur la plateforme (ADM-40) serait sans effet : on le refuse clairement.
    await this.languagesFacade.assertEnabled(locale);
    const [courseLocales, translated] = await Promise.all([
      this.coursesFacade.listCourseLocales(courseId),
      translatedLessonsByLocale(this.courseContentFacade, courseId),
    ]);
    assertPublishable(
      course.sourceLocale,
      locale,
      courseLocales.some((entry) => entry.locale === locale),
      translated.get(locale) ?? 0,
    );

    await this.courseContentFacade.setLessonLocalesStatus(courseId, locale, "PUBLISHED");
    await this.coursesFacade.setCourseLocaleStatus(courseId, locale, "PUBLISHED");
  }
}
