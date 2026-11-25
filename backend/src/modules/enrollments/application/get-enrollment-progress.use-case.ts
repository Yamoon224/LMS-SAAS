import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { PROGRESS_REPOSITORY } from "../domain/progress.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

import { isLessonCompleted } from "./get-learner-course-content.use-case";

/** Progression d'une inscription en leçons : terminées / total (toutes les leçons de la formation, obligatoires ou non). */
export interface EnrollmentProgressSummary {
  completedLessons: number;
  totalLessons: number;
}

/**
 * Étape 30 / section 9.5 : la politique de remboursement exige une progression < 20 %. La progression est le rapport
 * leçons terminées (RG-08a) / leçons de la formation ; une formation sans leçon a une progression nulle.
 */
@Injectable()
export class GetEnrollmentProgressUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    @Inject(PROGRESS_REPOSITORY) private readonly progressRepository: ProgressRepositoryPort,
    private readonly courseContentFacade: CourseContentFacade,
  ) {}

  async execute(enrollmentId: string): Promise<EnrollmentProgressSummary> {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);

    const progressByLesson = new Map(
      (await this.progressRepository.listByEnrollment(enrollmentId)).map((progress) => [progress.lessonId, progress]),
    );
    let completedLessons = 0;
    let totalLessons = 0;
    for (const courseModule of await this.courseContentFacade.listModules(enrollment.courseId)) {
      for (const lesson of await this.courseContentFacade.listLessons(courseModule.id)) {
        totalLessons += 1;
        if (isLessonCompleted(lesson, progressByLesson.get(lesson.id))) completedLessons += 1;
      }
    }
    return { completedLessons, totalLessons };
  }
}
