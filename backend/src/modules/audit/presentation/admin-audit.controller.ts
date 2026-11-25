import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { ListAuditEntriesUseCase } from "../application/list-audit-entries.use-case";

import { ListAuditEntriesDto } from "./dto/list-audit-entries.dto";

/** RG-19: journal d'audit plateforme entier, tous tenants confondus. */
@ApiTags("Admin / Audit")
@Controller("admin/audit")
export class AdminAuditController {
  constructor(private readonly listAuditEntriesUseCase: ListAuditEntriesUseCase) {}

  @Get()
  @RequirePermissions("audit.view")
  @ApiOperation({ summary: "Consulter le journal d'audit plateforme (tous tenants)" })
  async list(@Query() query: ListAuditEntriesDto) {
    const { entries, total } = await this.listAuditEntriesUseCase.execute(
      {
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
        tenantId: entry.tenantId,
        actorId: entry.actorId,
        action: entry.action,
        objectType: entry.objectType,
        objectId: entry.objectId,
        createdAt: entry.createdAt,
      })),
    };
  }
}
