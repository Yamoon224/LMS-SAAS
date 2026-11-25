import { Inject, Injectable } from "@nestjs/common";

import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";

/**
 * Étape 30 / section 9.5 : combien de quiz ou d'examens l'apprenant a-t-il SOUMIS sur cette inscription ? Une tentative
 * simplement démarrée (en cours) ou expirée sans soumission ne compte pas.
 */
@Injectable()
export class CountSubmittedAttemptsUseCase {
  constructor(@Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort) {}

  async execute(enrollmentId: string): Promise<number> {
    return this.attemptRepository.countSubmittedForEnrollment(enrollmentId);
  }
}
