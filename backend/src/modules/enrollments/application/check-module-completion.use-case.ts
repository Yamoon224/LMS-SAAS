import { AssessmentsFacade } from "@modules/assessments/assessments.facade";
import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { LiveSessionsFacade } from "@modules/live-sessions/live-sessions.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { isModuleValidated } from "../domain/module-completion";
import type { LessonCompletionCheck } from "../domain/module-completion";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";
import { PROGRESS_REPOSITORY } from "../domain/progress.repository.port";

/**
 * RG-08: combine les trois conditions de validation d'un module — contenus
 * obligatoires (course-content), présence live (live-sessions), quiz réussi
 * (assessments) — en interrogeant chaque module via sa façade, jamais ses
 * fichiers internes (section 13.2).
 */
@Injectable()
export class CheckModuleCompletionUseCase {
  constructor(
    @Inject(PROGRESS_REPOSITORY) private readonly progressRepository: ProgressRepositoryPort,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly assessmentsFacade: AssessmentsFacade,
    private readonly liveSessionsFacade: LiveSessionsFacade,
  ) {}

  async execute(enrollmentId: string, moduleId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }

    const lessons = await this.courseContentFacade.listLessons(moduleId);
    const progressRecords = await this.progressRepository.listByEnrollment(enrollmentId);
    const progressByLesson = new Map(progressRecords.map((p) => [p.lessonId, p]));

    const lessonChecks: LessonCompletionCheck[] = lessons.map((lesson) => {
      const progress = progressByLesson.get(lesson.id);
      const isSatisfied = lesson.isCompletedBy({
        watchedPercent: progress?.watchedPercent ?? null,
        opened: progress?.opened ?? false,
      });
      return { lessonId: lesson.id, isMandatory: lesson.isMandatory, isSatisfied };
    });

    const [quizPassed, requiredLiveAttendanceSatisfied] = await Promise.all([
      this.assessmentsFacade.isModuleQuizPassed(enrollmentId, moduleId),
      this.liveSessionsFacade.isAttendanceSatisfied(enrollment.userId, moduleId),
    ]);

    return isModuleValidated({
      lessons: lessonChecks,
      requiredLiveAttendanceSatisfied,
      quizPassed,
    });
  }
}
