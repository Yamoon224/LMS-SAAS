import { Inject, Injectable, Logger } from "@nestjs/common";

import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";

/**
 * BE-12/RG-17: fait passer au statut Expiré les inscriptions dont la date
 * d'accès est dépassée. "L'apprenant conserve après expiration l'accès à
 * ses certificats mais plus au contenu" — ce cron ne fait que marquer le
 * statut, hasContentAccess() applique déjà la règle indépendamment de lui
 * (défense en profondeur si le cron tarde à s'exécuter).
 */
@Injectable()
export class ExpireOverdueEnrollmentsUseCase {
  private readonly logger = new Logger(ExpireOverdueEnrollmentsUseCase.name);

  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const overdue = await this.enrollmentRepository.listExpiredButStillActive(now);

    for (const enrollment of overdue) {
      enrollment.expire();
      await this.enrollmentRepository.save(enrollment);
    }

    if (overdue.length > 0) {
      this.logger.log(`${overdue.length} inscription(s) expirée(s) automatiquement.`);
    }
    return overdue.length;
  }
}
