import { Injectable } from "@nestjs/common";
import type { AuditLog as PrismaAuditLog } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { AuditEntry } from "../domain/audit-entry.entity";
import type {
  AuditEntryFilters,
  AuditEntryRepositoryPort,
  CreateAuditEntryData,
  PageInput,
} from "../domain/audit-entry.repository.port";

@Injectable()
export class AuditEntryPrismaRepository implements AuditEntryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditEntryData): Promise<AuditEntry> {
    const record = await this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        actorId: data.actorId,
        action: data.action,
        objectType: data.objectType,
        objectId: data.objectId,
        before: data.before as object | undefined,
        after: data.after as object | undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
    return this.toDomain(record);
  }

  async list(filters: AuditEntryFilters, page: PageInput): Promise<AuditEntry[]> {
    const records = await this.prisma.auditLog.findMany({
      where: this.buildWhere(filters),
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
    });
    return records.map((record) => this.toDomain(record));
  }

  async count(filters: AuditEntryFilters): Promise<number> {
    return this.prisma.auditLog.count({ where: this.buildWhere(filters) });
  }

  private buildWhere(filters: AuditEntryFilters) {
    return {
      tenantId: filters.tenantId === undefined ? undefined : filters.tenantId,
      actorId: filters.actorId,
      objectType: filters.objectType,
      objectId: filters.objectId,
      action: filters.action,
      createdAt:
        filters.from || filters.to
          ? { gte: filters.from, lte: filters.to }
          : undefined,
    };
  }

  private toDomain(record: PrismaAuditLog): AuditEntry {
    return AuditEntry.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      actorId: record.actorId,
      action: record.action,
      objectType: record.objectType,
      objectId: record.objectId,
      before: record.before,
      after: record.after,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      createdAt: record.createdAt,
    });
  }
}
