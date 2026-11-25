import { Inject, Injectable } from "@nestjs/common";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { ATTEMPT_GRANT_REPOSITORY } from "../domain/attempt-grant.repository.port";
import type { AttemptGrantRepositoryPort } from "../domain/attempt-grant.repository.port";
import type { Attempt } from "../domain/attempt.entity";
import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { drawQuestions } from "../domain/question-drawer";
import { AttemptStatus } from "../domain/question-type";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

export class AttemptsExhaustedError extends DomainError {
  readonly code = "TENTATIVES_EPUISEES";
}

export class RetryTooSoonError extends DomainError {
  readonly code = "NOUVELLE_TENTATIVE_TROP_TOT";
}

/**
 * ENT-27 à ENT-29: démarre une tentative de quiz. RG-10: bloque si les
 * tentatives sont épuisées ; ENT-28: respecte le délai minimum entre deux
 * tentatives et tire aléatoirement le nombre de questions configuré.
 * RG-08(b)/ENT-29 (présence live obligatoire, contenus obligatoires
 * consultés) sont vérifiés par l'appelant, côté futur module enrollments,
 * seul capable de connaître la progression de l'apprenant.
 */
@Injectable()
export class StartQuizAttemptUseCase {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort,
    @Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort,
    @Inject(ATTEMPT_GRANT_REPOSITORY) private readonly attemptGrantRepository: AttemptGrantRepositoryPort,
  ) {}

  async execute(enrollmentId: string, quizId: string): Promise<Attempt> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundDomainError(`Quiz introuvable: ${quizId}`);
    }

    // Reprise: une tentative déjà en cours (et non expirée) est renvoyée telle quelle plutôt que d'en
    // tirer une nouvelle (sinon on pourrait redéclencher des tirages sans consommer de tentative).
    const latest = await this.attemptRepository.findLatestForQuiz(enrollmentId, quizId);
    if (latest && latest.status === AttemptStatus.IN_PROGRESS && !quiz.passingRules.hasTimeLimitElapsed(latest.startedAt)) {
      return latest;
    }

    const [attemptsUsed, extraGranted] = await Promise.all([
      this.attemptRepository.countForQuiz(enrollmentId, quizId),
      this.attemptGrantRepository.totalGrantedForQuiz(enrollmentId, quizId),
    ]);
    if (!quiz.passingRules.hasAttemptsRemaining(attemptsUsed, extraGranted)) {
      throw new AttemptsExhaustedError(
        "Toutes les tentatives ont été utilisées ; un gestionnaire doit en accorder de nouvelles (RG-10).",
      );
    }

    const lastAttempt = latest;
    if (lastAttempt && !quiz.passingRules.canRetryAt(lastAttempt.startedAt)) {
      throw new RetryTooSoonError("Le délai minimum entre deux tentatives n'est pas encore écoulé.");
    }

    const drawnQuestions = drawQuestions(quiz.questions, quiz.questionCountForAttempt, quiz.shuffleQuestions);

    return this.attemptRepository.create({
      enrollmentId,
      quizId,
      questionIds: drawnQuestions.map((question) => question.id),
    });
  }
}
