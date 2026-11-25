import { Inject, Injectable } from "@nestjs/common";

import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { GetBestQuizScoreUseCase } from "./get-best-quiz-score.use-case";

/**
 * RG-08(c): "le quiz est réussi selon la note minimale." Résout le quiz
 * d'un module puis applique sa règle de passage au meilleur score retenu
 * (RG-11). Retourne null si le module n'a pas de quiz — dans ce cas,
 * RG-08(c) ne s'applique simplement pas à ce module.
 */
@Injectable()
export class CheckModuleQuizPassedUseCase {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort,
    private readonly getBestQuizScoreUseCase: GetBestQuizScoreUseCase,
  ) {}

  async execute(enrollmentId: string, moduleId: string): Promise<boolean | null> {
    const quiz = await this.quizRepository.findByModuleId(moduleId);
    if (!quiz) return null;

    const bestScore = await this.getBestQuizScoreUseCase.execute(enrollmentId, quiz.id);
    if (bestScore === null) return false; // module avec quiz, jamais tenté : pas validé.

    return quiz.passingRules.isScoreSufficient(bestScore);
  }
}
