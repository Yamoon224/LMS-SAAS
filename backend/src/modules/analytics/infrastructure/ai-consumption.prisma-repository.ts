import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { RawJobAggregate } from "../domain/ai-consumption";
import type { AiConsumptionRepositoryPort } from "../domain/ai-consumption.repository.port";
import type { DateRange } from "../domain/analytics.repository.port";

/**
 * Lecture directe des tables Prisma de la traduction IA et des paiements (même précédent documenté que
 * `analytics.prisma-repository.ts`). Aucune écriture ; aucun contenu de formation n'est lu, seulement des comptages.
 */
@Injectable()
export class AiConsumptionPrismaRepository implements AiConsumptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getJobAggregates(range: DateRange): Promise<RawJobAggregate[]> {
    const groups = await this.prisma.translationJob.groupBy({
      by: ["tenantId", "status"],
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
      _sum: { debitedCredits: true, wordCount: true },
    });
    if (groups.length === 0) return [];

    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: [...new Set(groups.map((group) => group.tenantId))] } },
      select: { id: true, name: true },
    });
    const names = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));

    return groups.map((group) => ({
      tenantId: group.tenantId,
      tenantName: names.get(group.tenantId) ?? group.tenantId,
      status: group.status,
      jobsCount: group._count._all,
      debitedCredits: group._sum.debitedCredits ?? 0,
      words: group._sum.wordCount ?? 0,
    }));
  }

  async getCreditPackSales(): Promise<{ amount: number; credits: number }[]> {
    const payments = await this.prisma.payment.findMany({
      where: { type: "CREDIT_PURCHASE", status: "SUCCEEDED", creditPackId: { not: null } },
      select: { amount: true, creditPack: { select: { creditsAmount: true } } },
    });
    return payments.flatMap((payment) =>
      payment.creditPack ? [{ amount: payment.amount, credits: payment.creditPack.creditsAmount }] : [],
    );
  }
}
