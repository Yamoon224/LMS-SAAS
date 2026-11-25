import { Inject, Injectable } from "@nestjs/common";

import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";

/**
 * RG-11 (par analogie, appliquée à l'examen final): meilleur score retenu
 * parmi toutes les tentatives soumises. Utilisé par le futur module
 * certificates pour figer le score sur le certificat délivré (ENT-41).
 */
@Injectable()
export class GetBestExamScoreUseCase {
  constructor(@Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort) {}

  async execute(enrollmentId: string, examId: string): Promise<number | null> {
    const attempts = await this.attemptRepository.listSubmittedForExam(enrollmentId, examId);
    const scores = attempts
      .map((attempt) => attempt.scorePercent)
      .filter((score): score is number => score !== null);

    if (scores.length === 0) return null;
    return Math.max(...scores);
  }
}
