import { Inject, Injectable } from "@nestjs/common";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { ATTEMPT_GRANT_REPOSITORY } from "../domain/attempt-grant.repository.port";
import type { AttemptGrantRepositoryPort } from "../domain/attempt-grant.repository.port";
import type { Attempt } from "../domain/attempt.entity";
import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { drawQuestionsByModule } from "../domain/exam-question-drawer";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { AttemptStatus } from "../domain/question-type";

export class ExamAttemptsExhaustedError extends DomainError {
  readonly code = "TENTATIVES_EPUISEES";
}

export class ExamRetryNotAllowedError extends DomainError {
  readonly code = "NOUVELLE_TENTATIVE_NON_AUTORISEE";
}

/**
 * ENT-34/ENT-35: démarre une tentative d'examen final. RG-12: "l'examen
 * final n'est accessible que si tous les modules sont validés" est vérifié
 * par l'appelant (futur module enrollments). ENT-34: tirage pondéré par
 * module si questionsPerModule est configuré, sinon toutes les questions.
 */
@Injectable()
export class StartExamAttemptUseCase {
  constructor(
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
    @Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort,
    @Inject(ATTEMPT_GRANT_REPOSITORY) private readonly attemptGrantRepository: AttemptGrantRepositoryPort,
  ) {}

  async execute(enrollmentId: string, examId: string): Promise<Attempt> {
    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      throw new NotFoundDomainError(`Examen introuvable: ${examId}`);
    }

    // Reprise: une tentative d'examen déjà en cours (et non expirée) est renvoyée telle quelle.
    const latest = await this.attemptRepository.findLatestForExam(enrollmentId, examId);
    if (latest && latest.status === AttemptStatus.IN_PROGRESS && !exam.passingRules.hasTimeLimitElapsed(latest.startedAt)) {
      return latest;
    }

    const [attemptsUsed, extraGranted] = await Promise.all([
      this.attemptRepository.countForExam(enrollmentId, examId),
      this.attemptGrantRepository.totalGrantedForExam(enrollmentId, examId),
    ]);
    if (!exam.passingRules.hasAttemptsRemaining(attemptsUsed, extraGranted)) {
      throw new ExamAttemptsExhaustedError(
        "Toutes les tentatives ont été utilisées ; un gestionnaire doit en accorder de nouvelles (RG-10).",
      );
    }

    if (attemptsUsed > 0 && !exam.allowReentry) {
      throw new ExamRetryNotAllowedError(
        "La reprise de l'examen après fermeture n'est pas autorisée pour cette formation (ENT-36).",
      );
    }

    const drawnQuestions = drawQuestionsByModule(exam.questions, exam.questionsPerModule);

    return this.attemptRepository.create({
      enrollmentId,
      examId,
      questionIds: drawnQuestions.map((question) => question.id),
    });
  }
}
