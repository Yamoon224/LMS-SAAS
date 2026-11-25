import { Injectable } from "@nestjs/common";
import type { CommissionRule as PrismaCommissionRule } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type {
  CommissionRuleRecord,
  CommissionRuleRepositoryPort,
  CommissionType,
  SetCommissionRuleData,
} from "../domain/commission-rule.repository.port";

@Injectable()
export class CommissionRulePrismaRepository implements CommissionRuleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: SetCommissionRuleData): Promise<CommissionRuleRecord> {
    const record = await this.prisma.commissionRule.create({
      data: {
        scope: data.scope,
        type: data.type,
        tenantId: data.tenantId,
        planId: data.planId,
        courseId: data.courseId,
        percentRate: data.percentRate,
        fixedAmount: data.fixedAmount,
      },
    });
    return this.toRecord(record);
  }

  async supersede(id: string, rates: { percentRate: number | null; fixedAmount: number | null }): Promise<CommissionRuleRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      // Fermeture conditionnelle : deux modifications simultanées ne peuvent pas toutes deux réussir.
      const closed = await tx.commissionRule.updateMany({
        where: { id, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
        data: { validUntil: now },
      });
      if (closed.count === 0) return null;

      const previous = await tx.commissionRule.findUniqueOrThrow({ where: { id } });
      const created = await tx.commissionRule.create({
        data: {
          scope: previous.scope,
          type: previous.type,
          tenantId: previous.tenantId,
          planId: previous.planId,
          courseId: previous.courseId,
          percentRate: rates.percentRate,
          fixedAmount: rates.fixedAmount,
          validFrom: now,
        },
      });
      return this.toRecord(created);
    });
  }

  /**
   * ADM-15: priorité formation > entreprise > plan > globale. On interroge
   * chaque portée du plus spécifique au plus général et on retient la
   * première règle valide trouvée (validUntil non dépassée).
   */
  async resolveApplicableRule(
    type: CommissionType,
    tenantId: string,
    options: { courseId?: string; planId?: string } = {},
  ): Promise<CommissionRuleRecord | null> {
    const now = new Date();
    const baseWhere = {
      type,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    };

    if (options.courseId) {
      const courseRule = await this.prisma.commissionRule.findFirst({
        where: { ...baseWhere, scope: "COURSE", courseId: options.courseId },
        orderBy: { validFrom: "desc" },
      });
      if (courseRule) return this.toRecord(courseRule);
    }

    const tenantRule = await this.prisma.commissionRule.findFirst({
      where: { ...baseWhere, scope: "TENANT", tenantId },
      orderBy: { validFrom: "desc" },
    });
    if (tenantRule) return this.toRecord(tenantRule);

    const planId = options.planId ?? (await this.resolveCurrentPlanId(tenantId));
    if (planId) {
      const planRule = await this.prisma.commissionRule.findFirst({
        where: { ...baseWhere, scope: "PLAN", planId },
        orderBy: { validFrom: "desc" },
      });
      if (planRule) return this.toRecord(planRule);
    }

    const globalRule = await this.prisma.commissionRule.findFirst({
      where: { ...baseWhere, scope: "GLOBAL" },
      orderBy: { validFrom: "desc" },
    });
    return globalRule ? this.toRecord(globalRule) : null;
  }

  async listAll(): Promise<CommissionRuleRecord[]> {
    const records = await this.prisma.commissionRule.findMany({
      orderBy: { validFrom: "desc" },
    });
    return records.map((record) => this.toRecord(record));
  }

  private async resolveCurrentPlanId(tenantId: string): Promise<string | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] } },
      include: { planPrice: { select: { planId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return subscription?.planPrice.planId ?? null;
  }

  private toRecord(record: PrismaCommissionRule): CommissionRuleRecord {
    return {
      id: record.id,
      scope: record.scope,
      type: record.type,
      tenantId: record.tenantId,
      planId: record.planId,
      courseId: record.courseId,
      percentRate: record.percentRate ? Number(record.percentRate) : null,
      fixedAmount: record.fixedAmount,
      validFrom: record.validFrom,
      validUntil: record.validUntil,
    };
  }
}
