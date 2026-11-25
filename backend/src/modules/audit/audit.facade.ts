import { Injectable } from "@nestjs/common";

import { RecordAuditEntryUseCase } from "./application/record-audit-entry.use-case";
import type { CreateAuditEntryData } from "./domain/audit-entry.repository.port";

/**
 * Seule API publique du module audit. En pratique, les autres modules
 * n'inscrivent presque jamais d'entrée directement : AuditSensitiveEventsListener
 * s'abonne déjà aux événements de domaine sensibles (section 13.2). Cette
 * façade reste disponible pour un module qui aurait besoin d'un
 * enregistrement explicite hors du catalogue d'événements déjà couverts.
 */
@Injectable()
export class AuditFacade {
  constructor(private readonly recordAuditEntryUseCase: RecordAuditEntryUseCase) {}

  async record(entry: CreateAuditEntryData): Promise<void> {
    await this.recordAuditEntryUseCase.execute(entry);
  }
}
