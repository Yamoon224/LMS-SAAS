import { Inject, Injectable } from "@nestjs/common";

import { ATTEMPT_GRANT_REPOSITORY } from "../domain/attempt-grant.repository.port";
import type { AttemptGrantRepositoryPort } from "../domain/attempt-grant.repository.port";
import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import type { PassingRules } from "../domain/passing-rules.vo";
import { AttemptStatus } from "../domain/question-type";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

export type AssessmentRuleBlock = "ATTEMPTS_EXHAUSTED" | "RETRY_TOO_SOON" | "REENTRY_NOT_ALLOWED";

/** Règles visibles par l'apprenant + état de ses tentatives (aucune donnée de correction). */
export interface LearnerAssessmentInfo {
  kind: "QUIZ" | "EXAM";
  /** quizId ou examId */
  id: string;
  passingScorePercent: number;
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  delayBetweenAttemptsMinutes: number | null;
  /** Nombre de questions d'une tentative, ou null si non connu à l'avance (tirage pondéré par module). */
  questionCount: number | null;
  attemptsUsed: number;
  extraAttemptsGranted: number;
  /** null = illimité */
  attemptsRemaining: number | null;
  /** Tentative en cours à reprendre (POST start renvoie la même). */
  inProgressAttemptId: string | null;
  nextAttemptAt: Date | null;
  /** Vrai si les règles propres à l'évaluation (tentatives, délai) autorisent un démarrage maintenant. */
  canStartByRules: boolean;
  ruleBlock: AssessmentRuleBlock | null;
  /** Quiz uniquement. */
  requireLiveAttendance?: boolean;
}

interface Shared {
  rules: PassingRules;
  attemptsUsed: number;
  extraGranted: number;
  inProgressAttemptId: string | null;
  lastStartedAt: Date | null;
}

/** PUB-10/PUB-11: informations pré-tentative d'un quiz de module ou de l'examen final. */
@Injectable()
export class GetLearnerAssessmentInfoUseCase {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort,
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
    @Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort,
    @Inject(ATTEMPT_GRANT_REPOSITORY) private readonly attemptGrantRepository: AttemptGrantRepositoryPort,
  ) {}

  async forModuleQuiz(enrollmentId: string, moduleId: string): Promise<LearnerAssessmentInfo | null> {
    const quiz = await this.quizRepository.findByModuleId(moduleId);
    if (!quiz) return null;

    const [attemptsUsed, extraGranted, latest] = await Promise.all([
      this.attemptRepository.countForQuiz(enrollmentId, quiz.id),
      this.attemptGrantRepository.totalGrantedForQuiz(enrollmentId, quiz.id),
      this.attemptRepository.findLatestForQuiz(enrollmentId, quiz.id),
    ]);
    const shared: Shared = {
      rules: quiz.passingRules,
      attemptsUsed,
      extraGranted,
      inProgressAttemptId: latest?.status === AttemptStatus.IN_PROGRESS ? latest.id : null,
      lastStartedAt: latest?.startedAt ?? null,
    };

    return {
      ...this.build("QUIZ", quiz.id, shared, Math.min(quiz.questionCountForAttempt, quiz.questions.length), false),
      requireLiveAttendance: quiz.requireLiveAttendance,
    };
  }

  async forCourseExam(enrollmentId: string, courseId: string): Promise<LearnerAssessmentInfo | null> {
    const exam = await this.examRepository.findByCourseId(courseId);
    if (!exam) return null;

    const [attemptsUsed, extraGranted, latest] = await Promise.all([
      this.attemptRepository.countForExam(enrollmentId, exam.id),
      this.attemptGrantRepository.totalGrantedForExam(enrollmentId, exam.id),
      this.attemptRepository.findLatestForExam(enrollmentId, exam.id),
    ]);
    const shared: Shared = {
      rules: exam.passingRules,
      attemptsUsed,
      extraGranted,
      inProgressAttemptId: latest?.status === AttemptStatus.IN_PROGRESS ? latest.id : null,
      lastStartedAt: latest?.startedAt ?? null,
    };

    return this.build(
      "EXAM",
      exam.id,
      shared,
      exam.questionsPerModule === null ? exam.questions.length : null,
      !exam.allowReentry,
    );
  }

  private build(
    kind: "QUIZ" | "EXAM",
    id: string,
    shared: Shared,
    questionCount: number | null,
    singleSitting: boolean,
  ): LearnerAssessmentInfo {
    const { rules, attemptsUsed, extraGranted, inProgressAttemptId, lastStartedAt } = shared;
    const attemptsRemaining =
      rules.maxAttempts === null ? null : Math.max(0, rules.maxAttempts + extraGranted - attemptsUsed);

    let nextAttemptAt: Date | null = null;
    if (lastStartedAt && rules.delayBetweenAttemptsMinutes !== null) {
      nextAttemptAt = new Date(lastStartedAt.getTime() + rules.delayBetweenAttemptsMinutes * 60_000);
    }

    let ruleBlock: AssessmentRuleBlock | null = null;
    if (inProgressAttemptId === null) {
      if (!rules.hasAttemptsRemaining(attemptsUsed, extraGranted)) ruleBlock = "ATTEMPTS_EXHAUSTED";
      else if (kind === "EXAM" && singleSitting && attemptsUsed > 0) ruleBlock = "REENTRY_NOT_ALLOWED";
      else if (kind === "QUIZ" && lastStartedAt && !rules.canRetryAt(lastStartedAt)) ruleBlock = "RETRY_TOO_SOON";
    }

    return {
      kind,
      id,
      passingScorePercent: rules.passingScorePercent,
      timeLimitMinutes: rules.timeLimitMinutes,
      maxAttempts: rules.maxAttempts,
      delayBetweenAttemptsMinutes: rules.delayBetweenAttemptsMinutes,
      questionCount,
      attemptsUsed,
      extraAttemptsGranted: extraGranted,
      attemptsRemaining,
      inProgressAttemptId,
      nextAttemptAt: ruleBlock === "RETRY_TOO_SOON" ? nextAttemptAt : null,
      canStartByRules: inProgressAttemptId !== null || ruleBlock === null,
      ruleBlock,
    };
  }
}
