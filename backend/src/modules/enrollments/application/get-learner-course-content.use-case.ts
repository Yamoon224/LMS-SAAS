import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { Progress } from "../domain/progress.entity";
import { PROGRESS_REPOSITORY } from "../domain/progress.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

import { GetAccessibleModulesUseCase } from "./get-accessible-modules.use-case";
import { GetEnrollmentUseCase } from "./get-enrollment.use-case";
import { ResolveLearnerContentLocaleUseCase } from "./learner-content-locale.use-cases";

export interface LearnerLessonSummary {
  id: string;
  title: string;
  order: number;
  resourceType: string;
  isMandatory: boolean;
  completed: boolean;
}

export interface LearnerModuleSummary {
  id: string;
  title: string;
  order: number;
  accessible: boolean;
  validated: boolean;
  lessons: LearnerLessonSummary[];
}

export interface LearnerCourseContent {
  enrollmentId: string;
  courseId: string;
  progressionMode: string;
  /** Langue des titres de leçons renvoyés : la langue d'origine ou la traduction demandée si elle est lisible. */
  contentLocale: string;
  modules: LearnerModuleSummary[];
}

/** Une leçon est « terminée » si elle a été ouverte ET que son critère de consultation (RG-08a) est atteint. */
export function isLessonCompleted(
  lesson: { isCompletedBy(progress: { watchedPercent: number | null; opened: boolean }): boolean },
  progress: Progress | undefined,
): boolean {
  if (!progress?.opened) return false;
  return lesson.isCompletedBy({ watchedPercent: progress.watchedPercent, opened: progress.opened });
}

/**
 * PUB-09: programme de la formation pour le lecteur apprenant (modules + leçons, sans corps ni URL de
 * ressource). L'inscription doit appartenir à l'appelant (tenant courant) et donner un accès actif
 * (RG-17): 404 uniforme dans les autres cas.
 */
@Injectable()
export class GetLearnerCourseContentUseCase {
  constructor(
    private readonly getEnrollmentUseCase: GetEnrollmentUseCase,
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly getAccessibleModulesUseCase: GetAccessibleModulesUseCase,
    @Inject(PROGRESS_REPOSITORY) private readonly progressRepository: ProgressRepositoryPort,
    private readonly resolveLocaleUseCase: ResolveLearnerContentLocaleUseCase,
  ) {}

  async execute(
    enrollmentId: string,
    userId: string,
    tenantId: string,
    requestedLocale?: string,
  ): Promise<LearnerCourseContent> {
    const enrollment = await this.getEnrollmentUseCase.executeOwned(enrollmentId, userId, tenantId);
    if (!enrollment.hasContentAccess()) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }

    const course = await this.coursesFacade.findByIdInTenant(enrollment.courseId, tenantId);
    const access = await this.getAccessibleModulesUseCase.execute(
      enrollmentId,
      enrollment.courseId,
      course.progressionMode,
    );
    // PUB-17 : titres de leçons traduits si la langue demandée est lisible ; les titres de modules restent d'origine.
    const appliedLocale = await this.resolveLocaleUseCase.execute(enrollment.courseId, course.sourceLocale, requestedLocale);
    const translatedTitles = appliedLocale
      ? await this.courseContentFacade.listPublishedLessonTitles(enrollment.courseId, appliedLocale)
      : new Map<string, string>();
    const progressByLesson = new Map(
      (await this.progressRepository.listByEnrollment(enrollmentId)).map((p) => [p.lessonId, p]),
    );

    const modules: LearnerModuleSummary[] = [];
    for (const moduleAccess of [...access].sort((a, b) => a.order - b.order)) {
      const lessons = await this.courseContentFacade.listLessons(moduleAccess.moduleId);
      modules.push({
        id: moduleAccess.moduleId,
        title: moduleAccess.title,
        order: moduleAccess.order,
        accessible: moduleAccess.accessible,
        validated: moduleAccess.validated,
        lessons: [...lessons]
          .sort((a, b) => a.order - b.order)
          .map((lesson) => ({
            id: lesson.id,
            title: translatedTitles.get(lesson.id) ?? lesson.title,
            order: lesson.order,
            resourceType: lesson.resourceType,
            isMandatory: lesson.isMandatory,
            completed: isLessonCompleted(lesson, progressByLesson.get(lesson.id)),
          })),
      });
    }

    return {
      enrollmentId,
      courseId: enrollment.courseId,
      progressionMode: course.progressionMode,
      contentLocale: appliedLocale ?? course.sourceLocale,
      modules,
    };
  }
}
