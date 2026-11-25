import { Inject, Injectable } from "@nestjs/common";

import type { AuditEntry } from "../domain/audit-entry.entity";
import { AUDIT_ENTRY_REPOSITORY } from "../domain/audit-entry.repository.port";
import type {
  AuditEntryFilters,
  AuditEntryRepositoryPort,
  PageInput,
} from "../domain/audit-entry.repository.port";

export interface AuditEntryPage {
  entries: AuditEntry[];
  total: number;
}

/** ADM/ENT: consultation du journal d'audit, filtrée et paginée. */
@Injectable()
export class ListAuditEntriesUseCase {
  constructor(
    @Inject(AUDIT_ENTRY_REPOSITORY) private readonly auditRepository: AuditEntryRepositoryPort,
  ) {}

  async execute(filters: AuditEntryFilters, page: PageInput): Promise<AuditEntryPage> {
    const [entries, total] = await Promise.all([
      this.auditRepository.list(filters, page),
      this.auditRepository.count(filters),
    ]);
    return { entries, total };
  }
}
