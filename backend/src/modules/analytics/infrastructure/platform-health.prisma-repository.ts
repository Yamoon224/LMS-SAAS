import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { RawStorageRow, RawWebhookCount } from "../domain/platform-health";
import type { PlatformHealthRepositoryPort } from "../domain/platform-health.repository.port";

/**
 * Lecture directe des tables Prisma (même précédent documenté que `analytics.prisma-repository.ts`). Aucune écriture,
 * aucun contenu : seulement des comptages et des tailles.
 */
@Injectable()
export class PlatformHealthPrismaRepository implements PlatformHealthRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getWebhookCounts(since: Date): Promise<RawWebhookCount[]> {
    const groups = await this.prisma.webhookEvent.groupBy({
      by: ["providerCode", "outcome"],
      where: { receivedAt: { gte: since } },
      _count: { _all: true },
    });
    return groups.map((group) => ({
      providerCode: group.providerCode,
      outcome: group.outcome,
      count: group._count._all,
    }));
  }

  async getStorageByTenant(): Promise<RawStorageRow[]> {
    const groups = await this.prisma.mediaAsset.groupBy({
      by: ["tenantId"],
      _sum: { sizeBytes: true },
      _count: { _all: true },
    });
    if (groups.length === 0) return [];

    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: groups.map((group) => group.tenantId) } },
      select: { id: true, name: true },
    });
    const names = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));

    return groups.map((group) => ({
      tenantId: group.tenantId,
      tenantName: names.get(group.tenantId) ?? group.tenantId,
      bytes: group._sum.sizeBytes ?? 0,
      assets: group._count._all,
    }));
  }
}
