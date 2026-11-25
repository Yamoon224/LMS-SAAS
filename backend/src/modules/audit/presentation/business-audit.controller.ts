import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import { ListAuditEntriesUseCase } from "../application/list-audit-entries.use-case";

import { ListAuditEntriesDto } from "./dto/list-audit-entries.dto";

/** RG-19: journal d'audit de l'entreprise, strictement cantonné à son tenant. */
@ApiTags("Entreprise / Audit")
@Controller("business/audit")
export class BusinessAuditController {
  constructor(private readonly listAuditEntriesUseCase: ListAuditEntriesUseCase) {}

  @Get()
  @RequirePermissions("audit.view")
  @ApiOperation({ summary: "Consulter le journal d'audit de l'entreprise" })
  async list(@CurrentTenant() tenantId: string, @Query() query: ListAuditEntriesDto) {
    const { entries, total } = await this.listAuditEntriesUseCase.execute(
      {
        tenantId,
        actorId: query.actorId,
        objectType: query.objectType,
        objectId: query.objectId,
        action: query.action,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
      { take: query.take ?? 50, skip: query.skip ?? 0 },
    );

    return {
      total,
      entries: entries.map((entry) => ({
        id: entry.id,
        actorId: entry.actorId,
        action: entry.action,
        objectType: entry.objectType,
        objectId: entry.objectId,
        createdAt: entry.createdAt,
      })),
    };
  }
}
