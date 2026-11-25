import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { SubmittedAnswer } from "../domain/attempt.entity";
import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";

/** PUB-10/PUB-11: enregistre la réponse à une question, "enregistrement automatique des réponses" (UX-16). */
@Injectable()
export class SubmitAnswerUseCase {
  constructor(@Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort) {}

  async execute(attemptId: string, answer: SubmittedAnswer): Promise<void> {
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt) {
      throw new NotFoundDomainError(`Tentative introuvable: ${attemptId}`);
    }

    attempt.recordAnswer(answer);
    await this.attemptRepository.save(attempt);
  }
}
