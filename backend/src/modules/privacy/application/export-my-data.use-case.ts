import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { summarizeExport } from "../domain/learner-data-export";
import type { LearnerDataExport } from "../domain/learner-data-export";
import { PRIVACY_REPOSITORY } from "../domain/privacy.repository.port";
import type { PrivacyRepositoryPort } from "../domain/privacy.repository.port";
import { LearnerDataExportedEvent } from "../privacy.events";

/**
 * Droit d'accès (loi 2013-450, section 11) : toutes les données de l'apprenant connecté, et seulement les siennes.
 * L'identité vient du jeton ; aucun identifiant n'est accepté en entrée.
 */
@Injectable()
export class ExportMyDataUseCase {
  constructor(
    @Inject(PRIVACY_REPOSITORY) private readonly repository: PrivacyRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(userId: string, now: Date = new Date()): Promise<LearnerDataExport> {
    const account = await this.repository.findAccount(userId);
    // Un compte anonymisé n'a plus de données personnelles à exporter : même réponse qu'un compte inconnu.
    if (!account || account.type !== "LEARNER" || account.anonymizedAt) {
      throw new NotFoundDomainError("Compte introuvable.");
    }
    const data = await this.repository.collectLearnerData(userId, now);
    if (!data) throw new NotFoundDomainError("Compte introuvable.");

    this.eventEmitter.emit(
      "privacy.data-exported",
      new LearnerDataExportedEvent(userId, account.tenantId, summarizeExport(data)),
    );
    return data;
  }
}
