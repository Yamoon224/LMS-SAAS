import { Inject, Injectable } from "@nestjs/common";

import type { AuditEntry } from "../domain/audit-entry.entity";
import { AUDIT_ENTRY_REPOSITORY } from "../domain/audit-entry.repository.port";
import type { AuditEntryRepositoryPort, CreateAuditEntryData } from "../domain/audit-entry.repository.port";

/** RG-19: toute action sensible est inscrite au journal d'audit, non modifiable. */
@Injectable()
export class RecordAuditEntryUseCase {
  constructor(
    @Inject(AUDIT_ENTRY_REPOSITORY) private readonly auditRepository: AuditEntryRepositoryPort,
  ) {}

  async execute(data: CreateAuditEntryData): Promise<AuditEntry> {
    return this.auditRepository.create(data);
  }
}
