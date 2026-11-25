import { UsersModule } from "@modules/users/users.module";
import { Module } from "@nestjs/common";

import { AuditSensitiveEventsListener } from "./application/audit-sensitive-events.listener";
import { ListAuditEntriesUseCase } from "./application/list-audit-entries.use-case";
import { RecordAuditEntryUseCase } from "./application/record-audit-entry.use-case";
import { AuditFacade } from "./audit.facade";
import { AUDIT_ENTRY_REPOSITORY } from "./domain/audit-entry.repository.port";
import { AuditEntryPrismaRepository } from "./infrastructure/audit-entry.prisma-repository";
import { AdminAuditController } from "./presentation/admin-audit.controller";
import { BusinessAuditController } from "./presentation/business-audit.controller";

@Module({
  imports: [UsersModule],
  controllers: [AdminAuditController, BusinessAuditController],
  providers: [
    RecordAuditEntryUseCase,
    ListAuditEntriesUseCase,
    AuditSensitiveEventsListener,
    AuditFacade,
    { provide: AUDIT_ENTRY_REPOSITORY, useClass: AuditEntryPrismaRepository },
  ],
  exports: [AuditFacade],
})
export class AuditModule {}
