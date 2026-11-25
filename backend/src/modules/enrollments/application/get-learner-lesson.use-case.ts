import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { MediaFacade } from "@modules/media/media.facade";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { Enrollment } from "../domain/enrollment.entity";
import { localizeLesson } from "../domain/learner-locale";
import { resolveLessonResource } from "../domain/lesson-resource";
import { PROGRESS_REPOSITORY } from "../domain/progress.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

import { GetAccessibleModulesUseCase } from "./get-accessible-modules.use-case";
import { GetEnrollmentUseCase } from "./get-enrollment.use-case";
import { ResolveLearnerContentLocaleUseCase } from "./learner-content-locale.use-cases";
import { ModuleLockedError } from "./learner-lesson-access";

/** Leçon telle que renvoyée par la façade course-content (évite tout import interne de ce module). */
type Lesson = NonNullable<Awaited<ReturnType<CourseContentFacade["findLessonInCourse"]>>>;

export interface LearnerLessonView {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  resourceType: string;
  isMandatory: boolean;
  completionCriteria: unknown;
  downloadAllowed: boolean;
  contentHtml: string | null;
  /** Langue du titre et du contenu renvoyés : la langue d'origine ou la traduction demandée si elle est lisible. */
  contentLocale: string;
  /** URL de lecture/consultation : signée et éphémère pour un média, brute pour un lien externe. */
  resource: { kind: "MEDIA" | "EXTERNAL"; url: string; expiresAt: Date | null } | null;
  progress: { state: string; watchedPercent: number | null; opened: boolean } | null;
}

/**
 * PUB-09: accès à une leçon par un apprenant. Contrôles, dans l'ordre :
 * inscription de l'appelant dans son tenant -> leçon de la formation de CETTE inscription (404 sinon,
 * jamais d'erreur FK) -> module accessible selon RG-09 (sinon MODULE_VERROUILLE).
 */
@Injectable()
export class GetLearnerLessonUseCase {
  private readonly logger = new Logger(GetLearnerLessonUseCase.name);

  constructor(
    private readonly getEnrollmentUseCase: GetEnrollmentUseCase,
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly getAccessibleModulesUseCase: GetAccessibleModulesUseCase,
    private readonly mediaFacade: MediaFacade,
    @Inject(PROGRESS_REPOSITORY) private readonly progressRepository: ProgressRepositoryPort,
    private readonly resolveLocaleUseCase: ResolveLearnerContentLocaleUseCase,
  ) {}

  /**
   * Autorise l'accès à la leçon (propriété, appartenance à la formation, déverrouillage RG-09).
   * `requireActiveAccess`: lecture de contenu -> 404 si l'accès n'est plus actif (RG-17) ; le suivi
   * de consultation garde sa propre erreur ACCES_CONTENU_REFUSE.
   */
  async authorize(
    enrollmentId: string,
    lessonId: string,
    userId: string,
    tenantId: string,
    requireActiveAccess: boolean,
  ): Promise<{ enrollment: Enrollment; lesson: Lesson }> {
    const enrollment = await this.getEnrollmentUseCase.executeOwned(enrollmentId, userId, tenantId);
    if (requireActiveAccess && !enrollment.hasContentAccess()) {
      throw new NotFoundDomainError(`Leçon introuvable: ${lessonId}`);
    }

    const lesson = await this.courseContentFacade.findLessonInCourse(lessonId, enrollment.courseId);
    if (!lesson) {
      throw new NotFoundDomainError(`Leçon introuvable: ${lessonId}`);
    }

    const course = await this.coursesFacade.findByIdInTenant(enrollment.courseId, tenantId);
    const access = await this.getAccessibleModulesUseCase.execute(
      enrollmentId,
      enrollment.courseId,
      course.progressionMode,
    );
    const moduleAccess = access.find((entry) => entry.moduleId === lesson.moduleId);
    if (!moduleAccess?.accessible) {
      throw new ModuleLockedError("Ce module est verrouillé: validez d'abord le module précédent (RG-09).");
    }

    return { enrollment, lesson };
  }

  async execute(
    enrollmentId: string,
    lessonId: string,
    userId: string,
    tenantId: string,
    requestedLocale?: string,
  ): Promise<LearnerLessonView> {
    const { enrollment, lesson } = await this.authorize(enrollmentId, lessonId, userId, tenantId, true);
    const { text, contentLocale } = await this.localizedText(enrollment.courseId, tenantId, lesson, requestedLocale);
    const progress = await this.progressRepository.findByEnrollmentAndLesson(enrollmentId, lessonId);

    return {
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: text.title,
      order: lesson.order,
      resourceType: lesson.resourceType,
      isMandatory: lesson.isMandatory,
      completionCriteria: lesson.completionCriteria,
      downloadAllowed: lesson.downloadAllowed,
      // Contenu d'origine : déjà assaini à l'écriture (BE-09). Contenu traduit : assaini à l'écriture ET à la lecture.
      contentHtml: text.contentHtml,
      contentLocale,
      resource: await this.resolveResource(lesson, tenantId),
      progress: progress
        ? { state: progress.state, watchedPercent: progress.watchedPercent, opened: progress.opened }
        : null,
    };
  }

  /** PUB-17 : titre et contenu dans la langue demandée si elle est lisible, sinon dans la langue d'origine. */
  private async localizedText(
    courseId: string,
    tenantId: string,
    lesson: Lesson,
    requestedLocale: string | undefined,
  ): Promise<{ text: { title: string; contentHtml: string | null }; contentLocale: string }> {
    const source = { title: lesson.title, contentHtml: lesson.contentHtml };
    if (!requestedLocale?.trim()) {
      return { text: source, contentLocale: (await this.coursesFacade.findByIdInTenant(courseId, tenantId)).sourceLocale };
    }
    const course = await this.coursesFacade.findByIdInTenant(courseId, tenantId);
    const applied = await this.resolveLocaleUseCase.execute(courseId, course.sourceLocale, requestedLocale);
    if (!applied) return { text: source, contentLocale: course.sourceLocale };
    const translated = await this.courseContentFacade.findPublishedLessonLocale(lesson.id, applied);
    return { text: localizeLesson(source, translated), contentLocale: translated ? applied : course.sourceLocale };
  }

  private async resolveResource(lesson: Lesson, tenantId: string): Promise<LearnerLessonView["resource"]> {
    const resource = resolveLessonResource(lesson.storageUrl, lesson.resourceType, lesson.downloadAllowed);
    if (resource.kind === "EXTERNAL") {
      return { kind: "EXTERNAL", url: resource.url, expiresAt: null };
    }
    if (resource.kind === "MEDIA") {
      try {
        const signed = await this.mediaFacade.getPlaybackUrl(resource.mediaAssetId, tenantId);
        return { kind: "MEDIA", url: signed.url, expiresAt: signed.expiresAt };
      } catch (error) {
        // Média inconnu du tenant: on dégrade proprement (leçon lisible sans média) plutôt qu'une 404 sur la leçon.
        if (error instanceof NotFoundDomainError) {
          this.logger.warn(`Média introuvable pour la leçon ${lesson.id}: ${resource.mediaAssetId}`);
          return null;
        }
        throw error; // ex. MEDIA_NON_PRET (400): l'apprenant voit un message clair.
      }
    }
    return null;
  }
}
