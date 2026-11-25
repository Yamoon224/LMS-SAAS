import { Injectable } from "@nestjs/common";

import { CheckModuleQuizPassedUseCase } from "./application/check-module-quiz-passed.use-case";
import { CountSubmittedAttemptsUseCase } from "./application/count-submitted-attempts.use-case";
import { DoesModuleRequireLiveAttendanceUseCase } from "./application/does-module-require-live-attendance.use-case";
import { GetBestExamScoreUseCase } from "./application/get-best-exam-score.use-case";
import { GetBestQuizScoreUseCase } from "./application/get-best-quiz-score.use-case";
import { GetExamResultForCourseUseCase } from "./application/get-exam-result-for-course.use-case";
import type { ExamResult } from "./application/get-exam-result-for-course.use-case";
import type { LearnerAssessmentInfo } from "./application/get-learner-assessment-info.use-case";
import { GetLearnerAssessmentInfoUseCase } from "./application/get-learner-assessment-info.use-case";
import { GetWeightedFinalScoreUseCase } from "./application/get-weighted-final-score.use-case";

/**
 * Seule API publique du module assessments. Utilisée par enrollments pour
 * RG-08(c) ("le quiz est réussi selon la note minimale"), par le module
 * certificates pour connaître le score de l'examen final (ENT-41), et par
 * le module live-sessions pour savoir si un module exige la présence live
 * avant de résoudre RG-08(b) (ENT-29).
 */
@Injectable()
export class AssessmentsFacade {
  constructor(
    private readonly getBestQuizScoreUseCase: GetBestQuizScoreUseCase,
    private readonly getBestExamScoreUseCase: GetBestExamScoreUseCase,
    private readonly checkModuleQuizPassedUseCase: CheckModuleQuizPassedUseCase,
    private readonly getExamResultForCourseUseCase: GetExamResultForCourseUseCase,
    private readonly doesModuleRequireLiveAttendanceUseCase: DoesModuleRequireLiveAttendanceUseCase,
    private readonly getLearnerAssessmentInfoUseCase: GetLearnerAssessmentInfoUseCase,
    private readonly countSubmittedAttemptsUseCase: CountSubmittedAttemptsUseCase,
    private readonly getWeightedFinalScoreUseCase: GetWeightedFinalScoreUseCase,
  ) {}

  /** ENT-34 : note finale pondérée (quiz de module + examen, selon leur poids) ; null si aucune note. */
  async getWeightedFinalScore(enrollmentId: string, courseId: string): Promise<number | null> {
    return this.getWeightedFinalScoreUseCase.execute(enrollmentId, courseId);
  }

  /** Étape 30 (politique de remboursement, section 9.5) : nombre de tentatives de quiz/examen soumises. */
  async countSubmittedAttempts(enrollmentId: string): Promise<number> {
    return this.countSubmittedAttemptsUseCase.execute(enrollmentId);
  }

  /** RG-11: meilleur score obtenu sur toutes les tentatives soumises. */
  async getBestQuizScore(enrollmentId: string, quizId: string): Promise<number | null> {
    return this.getBestQuizScoreUseCase.execute(enrollmentId, quizId);
  }

  /** RG-11 (par analogie): meilleur score obtenu sur l'examen final. */
  async getBestExamScore(enrollmentId: string, examId: string): Promise<number | null> {
    return this.getBestExamScoreUseCase.execute(enrollmentId, examId);
  }

  /** RG-08(c): null si le module n'a pas de quiz, sinon le verdict de réussite. */
  async isModuleQuizPassed(enrollmentId: string, moduleId: string): Promise<boolean | null> {
    return this.checkModuleQuizPassedUseCase.execute(enrollmentId, moduleId);
  }

  /** ENT-41: résultat de l'examen final pour figer le score sur le certificat délivré. */
  async getExamResultForCourse(enrollmentId: string, courseId: string): Promise<ExamResult | null> {
    return this.getExamResultForCourseUseCase.execute(enrollmentId, courseId);
  }

  /** Règles visibles + état des tentatives du quiz d'un module pour cette inscription (null si pas de quiz). */
  async getQuizInfoForEnrollment(enrollmentId: string, moduleId: string): Promise<LearnerAssessmentInfo | null> {
    return this.getLearnerAssessmentInfoUseCase.forModuleQuiz(enrollmentId, moduleId);
  }

  /** Idem pour l'examen final de la formation (null si pas d'examen). */
  async getExamInfoForEnrollment(enrollmentId: string, courseId: string): Promise<LearnerAssessmentInfo | null> {
    return this.getLearnerAssessmentInfoUseCase.forCourseExam(enrollmentId, courseId);
  }

  /** ENT-29/RG-08(b): un module exige la présence live si son quiz le configure ainsi. */
  async doesModuleRequireLiveAttendance(moduleId: string): Promise<boolean> {
    return this.doesModuleRequireLiveAttendanceUseCase.execute(moduleId);
  }
}
