import { Inject, Injectable } from "@nestjs/common";

import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

/** ENT-29/RG-08(b): un module exige la présence live si son quiz le configure ainsi. */
@Injectable()
export class DoesModuleRequireLiveAttendanceUseCase {
  constructor(@Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort) {}

  async execute(moduleId: string): Promise<boolean> {
    const quiz = await this.quizRepository.findByModuleId(moduleId);
    return quiz?.requireLiveAttendance ?? false;
  }
}
