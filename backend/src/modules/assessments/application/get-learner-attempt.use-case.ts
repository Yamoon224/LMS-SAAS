import { Inject, Injectable } from "@nestjs/common";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { buildAttemptResult } from "../domain/attempt-result";
import type { AttemptResultView } from "../domain/attempt-result";
import type { Attempt } from "../domain/attempt.entity";
import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { orderOptionsForAttempt } from "../domain/option-order";
import type { PassingRules } from "../domain/passing-rules.vo";
import { AttemptStatus } from "../domain/question-type";
import type { QuestionType, ResultsDisplay } from "../domain/question-type";
import type { Question } from "../domain/question.entity";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

export class AttemptNotSubmittedError extends DomainError {
  readonly code = "TENTATIVE_NON_SOUMISE";
}

/** Question telle que présentée à l'apprenant: JAMAIS de `isCorrect` ni d'explication. */
export interface LearnerQuestionView {
  id: string;
  type: QuestionType;
  statementHtml: string;
  points: number;
  options: { id: string; label: string }[];
}

export interface LearnerAttemptView {
  id: string;
  kind: "QUIZ" | "EXAM";
  quizId: string | null;
  examId: string | null;
  status: AttemptStatus;
  startedAt: Date;
  /** startedAt + durée limite (calculé serveur), ou null si aucune limite. */
  deadline: Date | null;
  serverNow: Date;
  /** Vrai si le temps imparti est écoulé (la soumission sera traitée comme expirée, RG-12). */
  timeElapsed: boolean;
  questions: LearnerQuestionView[];
  answers: { questionId: string; selectedOptionIds: string[] }[];
}

interface AssessmentContext {
  kind: "QUIZ" | "EXAM";
  questions: readonly Question[];
  rules: PassingRules;
  shuffleAnswers: boolean;
  resultsDisplay: ResultsDisplay | null;
}

/** PUB-10/PUB-11: état d'une tentative (reprise après rechargement) et résultat après soumission. */
@Injectable()
export class GetLearnerAttemptUseCase {
  constructor(
    @Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort,
    @Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort,
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
  ) {}

  /** La propriété de la tentative est vérifiée en amont par AuthorizeLearnerAttemptUseCase. */
  async getState(attemptId: string): Promise<LearnerAttemptView> {
    const { attempt, context } = await this.load(attemptId);
    const now = new Date();
    const deadline = this.computeDeadline(attempt, context.rules);

    return {
      id: attempt.id,
      kind: context.kind,
      quizId: attempt.quizId,
      examId: attempt.examId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadline,
      serverNow: now,
      timeElapsed: deadline !== null && now > deadline,
      questions: this.presentQuestions(attempt, context),
      answers: attempt.toSnapshot().answers.map((answer) => ({
        questionId: answer.questionId,
        selectedOptionIds: [...answer.selectedOptionIds],
      })),
    };
  }

  async getResult(attemptId: string): Promise<AttemptResultView> {
    const { attempt, context } = await this.load(attemptId);
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new AttemptNotSubmittedError("Le résultat n'est disponible qu'après la soumission de la tentative.");
    }

    return buildAttemptResult({
      attemptId: attempt.id,
      kind: context.kind,
      status: attempt.status,
      scorePercent: attempt.scorePercent,
      passingScorePercent: context.rules.passingScorePercent,
      submittedAt: attempt.toSnapshot().submittedAt,
      resultsDisplay: context.resultsDisplay,
      drawnQuestions: this.drawnQuestions(attempt, context.questions),
      answers: attempt.toSnapshot().answers,
    });
  }

  private async load(attemptId: string): Promise<{ attempt: Attempt; context: AssessmentContext }> {
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt) throw new NotFoundDomainError(`Tentative introuvable: ${attemptId}`);

    if (attempt.quizId) {
      const quiz = await this.quizRepository.findById(attempt.quizId);
      if (!quiz) throw new NotFoundDomainError(`Quiz introuvable: ${attempt.quizId}`);
      return {
        attempt,
        context: {
          kind: "QUIZ",
          questions: quiz.questions,
          rules: quiz.passingRules,
          shuffleAnswers: quiz.shuffleAnswers,
          resultsDisplay: quiz.resultsDisplay,
        },
      };
    }

    if (attempt.examId) {
      const exam = await this.examRepository.findById(attempt.examId);
      if (!exam) throw new NotFoundDomainError(`Examen introuvable: ${attempt.examId}`);
      return {
        attempt,
        context: {
          kind: "EXAM",
          questions: exam.questions,
          rules: exam.passingRules,
          shuffleAnswers: false,
          resultsDisplay: null,
        },
      };
    }

    throw new NotFoundDomainError(`Tentative introuvable: ${attemptId}`);
  }

  private computeDeadline(attempt: Attempt, rules: PassingRules): Date | null {
    if (rules.timeLimitMinutes === null) return null;
    return new Date(attempt.startedAt.getTime() + rules.timeLimitMinutes * 60_000);
  }

  /** Questions tirées, dans l'ordre stocké (`questionIds`); les questions supprimées depuis sont ignorées. */
  private drawnQuestions(attempt: Attempt, questions: readonly Question[]): Question[] {
    const byId = new Map(questions.map((question) => [question.id, question]));
    return attempt.questionIds
      .map((id) => byId.get(id))
      .filter((question): question is Question => question !== undefined);
  }

  private presentQuestions(attempt: Attempt, context: AssessmentContext): LearnerQuestionView[] {
    return this.drawnQuestions(attempt, context.questions).map((question) => ({
      id: question.id,
      type: question.type,
      statementHtml: question.statementHtml,
      points: question.points,
      options: orderOptionsForAttempt(question.options, context.shuffleAnswers, `${attempt.id}:${question.id}`).map(
        (option) => ({ id: option.id, label: option.label }),
      ),
    }));
  }
}
