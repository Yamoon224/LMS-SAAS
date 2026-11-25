import { Inject, Injectable, Logger } from "@nestjs/common";

import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

/**
 * ENT-36/RG-12: "soumission automatique à expiration" — pour les tentatives
 * qu'un apprenant a laissées en cours sans jamais revenir les soumettre
 * (fermeture d'onglet, perte de connexion). Déclenché par une tâche
 * planifiée (BE-12) ; SubmitAttemptUseCase gère déjà l'expiration détectée
 * au moment d'une soumission tardive, ce use case couvre le cas où
 * l'apprenant ne soumet jamais du tout.
 */
@Injectable()
export class ExpireOverdueAttemptsUseCase {
  private readonly logger = new Logger(ExpireOverdueAttemptsUseCase.name);

  constructor(
    @Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort,
    @Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort,
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    // Fenêtre large: la durée maximale configurable raisonnable pour un examen/quiz.
    const cutoff = new Date(now);
    cutoff.setHours(cutoff.getHours() - 6);

    const candidates = await this.attemptRepository.listInProgressStartedBefore(cutoff);
    let expiredCount = 0;

    for (const attempt of candidates) {
      const assessment = attempt.quizId
        ? await this.quizRepository.findById(attempt.quizId)
        : attempt.examId
          ? await this.examRepository.findById(attempt.examId)
          : null;
      if (!assessment) continue;

      if (assessment.passingRules.hasTimeLimitElapsed(attempt.startedAt, now)) {
        attempt.expire(assessment.questions);
        await this.attemptRepository.save(attempt);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`${expiredCount} tentative(s) expirée(s) automatiquement (ENT-36).`);
    }
    return expiredCount;
  }
}
