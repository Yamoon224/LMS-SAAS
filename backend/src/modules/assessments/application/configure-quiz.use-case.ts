import { Inject, Injectable } from "@nestjs/common";

import type { Quiz } from "../domain/quiz.entity";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { SetQuizRulesData } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

/** ENT-27/ENT-28: configurer les règles de passage du quiz d'un module. */
@Injectable()
export class ConfigureQuizUseCase {
  constructor(@Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort) {}

  async execute(moduleId: string, rules: SetQuizRulesData): Promise<Quiz> {
    return this.quizRepository.upsertForModule(moduleId, rules);
  }
}
