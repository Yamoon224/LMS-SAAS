import { Injectable } from "@nestjs/common";
import type { Role as PrismaRole } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { CreateRoleData, RoleRecord, RoleRepositoryPort } from "../domain/role.repository.port";

@Injectable()
export class RolePrismaRepository implements RoleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRoleData): Promise<RoleRecord> {
    const permissions = await this.resolvePermissionIds(data.permissionCodes, data.tenantId);

    const record = await this.prisma.role.create({
      data: {
        tenantId: data.tenantId,
        scope: data.tenantId === null ? "PLATFORM" : "TENANT",
        name: data.name,
        isDefault: data.isDefault,
        permissions: { create: permissions.map((permissionId) => ({ permissionId })) },
      },
    });

    return this.toRecord(record);
  }

  async findByTenantAndName(tenantId: string | null, name: string): Promise<RoleRecord | null> {
    const record = await this.prisma.role.findUnique({
      where: { tenantId_name: { tenantId: tenantId as unknown as string, name } },
    });
    return record ? this.toRecord(record) : null;
  }

  async listByTenant(tenantId: string | null): Promise<RoleRecord[]> {
    const records = await this.prisma.role.findMany({ where: { tenantId } });
    return records.map((record) => this.toRecord(record));
  }

  async findByIds(ids: string[]): Promise<RoleRecord[]> {
    if (ids.length === 0) return [];
    const records = await this.prisma.role.findMany({ where: { id: { in: ids } } });
    return records.map((record) => this.toRecord(record));
  }

  /** Crée à la volée toute permission encore inconnue (code libre, section 2 "permissions configurables"). */
  private async resolvePermissionIds(codes: string[], tenantId: string | null): Promise<string[]> {
    const ids: string[] = [];
    for (const code of codes) {
      const permission = await this.prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, scope: tenantId === null ? "PLATFORM" : "TENANT", description: code },
      });
      ids.push(permission.id);
    }
    return ids;
  }

  private toRecord(record: PrismaRole): RoleRecord {
    return { id: record.id, tenantId: record.tenantId, name: record.name };
  }
}
