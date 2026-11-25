import { Inject, Injectable } from "@nestjs/common";

import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";

/**
 * RG-11: "le score retenu pour un quiz est le meilleur score obtenu
 * (paramétrable : meilleur ou dernier)." Seul le mode "meilleur" (le défaut
 * du cahier des charges) est implémenté pour l'instant ; le mode "dernier"
 * sera ajouté si ce paramétrage devient effectivement configurable par
 * l'entreprise plutôt que fixé en dur.
 */
@Injectable()
export class GetBestQuizScoreUseCase {
  constructor(@Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort) {}

  async execute(enrollmentId: string, quizId: string): Promise<number | null> {
    const attempts = await this.attemptRepository.listSubmittedForQuiz(enrollmentId, quizId);
    const scores = attempts
      .map((attempt) => attempt.scorePercent)
      .filter((score): score is number => score !== null);

    if (scores.length === 0) return null;
    return Math.max(...scores);
  }
}
