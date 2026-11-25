import { Inject, Injectable } from "@nestjs/common";

import { PROGRESS_REPOSITORY } from "../domain/progress.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

/** ENT-64: "réinitialiser une progression" — remet à zéro toute la progression d'une inscription. */
@Injectable()
export class ResetProgressUseCase {
  constructor(@Inject(PROGRESS_REPOSITORY) private readonly progressRepository: ProgressRepositoryPort) {}

  async execute(enrollmentId: string): Promise<void> {
    await this.progressRepository.deleteAllForEnrollment(enrollmentId);
  }
}
