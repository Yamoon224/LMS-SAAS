import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { ExamPassedEvent, QuizPassedEvent } from "../assessments.events";
import type { Attempt } from "../domain/attempt.entity";
import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { AttemptStatus } from "../domain/question-type";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

export class AttemptAlreadySubmittedError extends DomainError {
  readonly code = "TENTATIVE_DEJA_SOUMISE";
}

/**
 * RG-12/ENT-36: soumission d'une tentative de quiz ou d'examen. Le temps
 * imparti est revérifié côté serveur avant d'accepter la soumission — si le
 * délai est dépassé, la tentative est traitée comme expirée plutôt que
 * normalement soumise, quelle que soit l'heure indiquée par le client.
 */
@Injectable()
export class SubmitAttemptUseCase {
  constructor(
    @Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort,
    @Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort,
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(attemptId: string): Promise<void> {
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt) {
      throw new NotFoundDomainError(`Tentative introuvable: ${attemptId}`);
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new AttemptAlreadySubmittedError("Cette tentative a déjà été soumise ou a expiré.");
    }

    const quizId = attempt.quizId;
    const examId = attempt.examId;

    if (quizId) {
      await this.submitQuizAttempt(attempt, quizId);
    } else if (examId) {
      await this.submitExamAttempt(attempt, examId);
    }
  }

  private async submitQuizAttempt(attempt: Attempt, quizId: string): Promise<void> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundDomainError(`Quiz introuvable: ${quizId}`);
    }

    const rules = quiz.passingRules;
    if (rules.hasTimeLimitElapsed(attempt.startedAt)) {
      attempt.expire(quiz.questions);
    } else {
      attempt.submit(quiz.questions, rules.passingScorePercent);
    }
    await this.attemptRepository.save(attempt);

    if (attempt.status === AttemptStatus.PASSED) {
      this.eventEmitter.emit("quiz.passed", new QuizPassedEvent(attempt.enrollmentId, quizId));
    }
  }

  private async submitExamAttempt(attempt: Attempt, examId: string): Promise<void> {
    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      throw new NotFoundDomainError(`Examen introuvable: ${examId}`);
    }

    const rules = exam.passingRules;
    if (rules.hasTimeLimitElapsed(attempt.startedAt)) {
      attempt.expire(exam.questions);
    } else {
      attempt.submit(exam.questions, rules.passingScorePercent);
    }
    await this.attemptRepository.save(attempt);

    if (attempt.status === AttemptStatus.PASSED) {
      this.eventEmitter.emit("exam.passed", new ExamPassedEvent(attempt.enrollmentId, examId));
    }
  }
}
