import { Injectable } from "@nestjs/common";

import { AssertContentInTenantUseCase } from "./application/assert-content-in-tenant.use-case";
import { GetLessonInCourseUseCase } from "./application/get-lesson-in-course.use-case";
import { ListLessonsUseCase } from "./application/list-lessons.use-case";
import { ListModulesUseCase } from "./application/list-modules.use-case";
import { ManageLessonLocalesUseCase } from "./application/manage-lesson-locales.use-case";
import type { PublishedLessonLocale } from "./application/manage-lesson-locales.use-case";
import { UpsertLessonLocaleUseCase } from "./application/upsert-lesson-locale.use-case";
import type { CourseModule } from "./domain/course-module.entity";
import type { LessonLocaleSummary, UpsertLessonLocaleData } from "./domain/lesson-locale.repository.port";
import type { Lesson } from "./domain/lesson.entity";

/**
 * Seule API publique du module course-content. Utilisée par assessments
 * (quiz liés à un module), enrollments (progression par leçon,
 * déverrouillage séquentiel RG-09) et ai-translation (écriture du contenu
 * de leçon traduit, ENT-46).
 */
@Injectable()
export class CourseContentFacade {
  constructor(
    private readonly listModulesUseCase: ListModulesUseCase,
    private readonly listLessonsUseCase: ListLessonsUseCase,
    private readonly getLessonInCourseUseCase: GetLessonInCourseUseCase,
    private readonly upsertLessonLocaleUseCase: UpsertLessonLocaleUseCase,
    private readonly assertContentInTenantUseCase: AssertContentInTenantUseCase,
    private readonly manageLessonLocalesUseCase: ManageLessonLocalesUseCase,
  ) {}

  /**
   * Vérifie que le module appartient au tenant (404 sinon, jamais 403) et
   * retourne l'id de sa formation. Utilisé par assessments (quiz de module).
   */
  async assertModuleInTenant(moduleId: string, tenantId: string): Promise<string> {
    return this.assertContentInTenantUseCase.assertModule(moduleId, tenantId);
  }

  async listModules(courseId: string): Promise<CourseModule[]> {
    return this.listModulesUseCase.execute(courseId);
  }

  async listLessons(moduleId: string): Promise<Lesson[]> {
    return this.listLessonsUseCase.execute(moduleId);
  }

  /** Leçon de la formation indiquée, ou null (inconnue / d'une autre formation) — anti-IDOR du lecteur apprenant. */
  async findLessonInCourse(lessonId: string, courseId: string): Promise<Lesson | null> {
    return this.getLessonInCourseUseCase.execute(lessonId, courseId);
  }

  async upsertLessonLocale(data: UpsertLessonLocaleData): Promise<void> {
    await this.upsertLessonLocaleUseCase.execute(data);
  }

  /** PUB-17 : traduction PUBLIÉE d'une leçon (HTML assaini), ou null si absente ou en brouillon. */
  async findPublishedLessonLocale(lessonId: string, locale: string): Promise<PublishedLessonLocale | null> {
    return this.manageLessonLocalesUseCase.findPublished(lessonId, locale);
  }

  /** PUB-17 : titres traduits publiés des leçons d'une formation, indexés par identifiant de leçon. */
  async listPublishedLessonTitles(courseId: string, locale: string): Promise<Map<string, string>> {
    return this.manageLessonLocalesUseCase.listPublishedTitles(courseId, locale);
  }

  /** PUB-17 : nombre de leçons traduites d'une formation, par langue et par statut. */
  async summarizeLessonLocales(courseId: string): Promise<LessonLocaleSummary[]> {
    return this.manageLessonLocalesUseCase.summarize(courseId);
  }

  /** PUB-17 : publie ou repasse en brouillon les traductions de leçons d'une formation pour une langue. */
  async setLessonLocalesStatus(courseId: string, locale: string, status: "DRAFT" | "PUBLISHED"): Promise<number> {
    return this.manageLessonLocalesUseCase.setStatus(courseId, locale, status);
  }
}
