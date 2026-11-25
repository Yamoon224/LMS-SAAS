import { Injectable } from "@nestjs/common";
import type { Plan as PrismaPlan, PlanPrice as PrismaPlanPrice } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { PlanFeatures, PlanQuotas } from "../domain/plan-quotas";
import { Plan } from "../domain/plan.entity";
import type {
  CreatePlanData,
  CreatePlanPriceData,
  PlanRepositoryPort,
  UpdatePlanData,
} from "../domain/plan.repository.port";

type PrismaPlanWithPrices = PrismaPlan & { prices: PrismaPlanPrice[] };

@Injectable()
export class PlanPrismaRepository implements PlanRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Plan | null> {
    const record = await this.prisma.plan.findUnique({ where: { id }, include: { prices: true } });
    return record ? this.toDomain(record) : null;
  }

  async listPublic(): Promise<Plan[]> {
    const records = await this.prisma.plan.findMany({
      where: { isPublic: true, isArchived: false },
      include: { prices: { where: { isActive: true } } },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listAll(): Promise<Plan[]> {
    const records = await this.prisma.plan.findMany({
      include: { prices: true },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreatePlanData): Promise<Plan> {
    const record = await this.prisma.plan.create({
      data: {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        quotas: data.quotas as object,
        features: data.features as object,
        commissionRatePercent: data.commissionRatePercent,
      },
      include: { prices: true },
    });
    return this.toDomain(record);
  }

  async archive(id: string): Promise<void> {
    await this.prisma.plan.update({ where: { id }, data: { isArchived: true } });
  }

  async unarchive(id: string): Promise<void> {
    await this.prisma.plan.update({ where: { id }, data: { isArchived: false } });
  }

  async update(id: string, data: UpdatePlanData): Promise<void> {
    await this.prisma.plan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.quotas !== undefined && { quotas: data.quotas as object }),
        ...(data.features !== undefined && { features: data.features as object }),
      },
    });
  }

  async addPriceVersion(data: CreatePlanPriceData): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.planPrice.updateMany({
        where: { planId: data.planId, period: data.period as never, isActive: true },
        data: { isActive: false },
      });

      const lastVersion = await tx.planPrice.findFirst({
        where: { planId: data.planId, period: data.period as never },
        orderBy: { version: "desc" },
      });

      await tx.planPrice.create({
        data: {
          planId: data.planId,
          period: data.period as never,
          currency: data.currency,
          amount: data.amount,
          trialDays: data.trialDays,
          version: (lastVersion?.version ?? 0) + 1,
          isActive: true,
        },
      });
    });
  }

  private toDomain(record: PrismaPlanWithPrices): Plan {
    return Plan.fromPersistence({
      id: record.id,
      name: record.name,
      description: record.description,
      isPublic: record.isPublic,
      isArchived: record.isArchived,
      quotas: record.quotas as PlanQuotas,
      features: record.features as PlanFeatures,
      commissionRatePercent: record.commissionRatePercent
        ? Number(record.commissionRatePercent)
        : null,
      prices: record.prices.map((price) => ({
        id: price.id,
        period: price.period,
        currency: price.currency,
        amount: price.amount,
        trialDays: price.trialDays,
        version: price.version,
        isActive: price.isActive,
      })),
    });
  }
}
