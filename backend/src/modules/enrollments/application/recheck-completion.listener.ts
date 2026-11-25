import { QuizPassedEvent } from "@modules/assessments/assessments.events";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";


import { CompleteNonCertifyingCourseUseCase } from "./complete-non-certifying-course.use-case";
import { LessonViewedEvent } from "./record-lesson-view.use-case";

/**
 * RG-21: réévalue si une formation non certifiante est terminée après
 * chaque progression susceptible de valider le dernier module restant
 * (consultation de leçon ou quiz réussi).
 */
@Injectable()
export class RecheckCompletionListener {
  constructor(private readonly completeNonCertifyingCourseUseCase: CompleteNonCertifyingCourseUseCase) {}

  @OnEvent("lesson.viewed")
  async onLessonViewed(event: LessonViewedEvent): Promise<void> {
    await this.completeNonCertifyingCourseUseCase.execute(event.enrollmentId);
  }

  @OnEvent("quiz.passed")
  async onQuizPassed(event: QuizPassedEvent): Promise<void> {
    await this.completeNonCertifyingCourseUseCase.execute(event.enrollmentId);
  }
}
