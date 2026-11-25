import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { PlanQuotaRepositoryPort } from "../domain/plan-quota.repository.port";

interface PlanQuotas {
  maxCourses?: number;
  maxActiveLearners?: number;
  maxManagers?: number;
  storageGb?: number;
  liveSessionsPerMonth?: number;
}

@Injectable()
export class PlanQuotaPrismaRepository implements PlanQuotaRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getQuotaLimit(tenantId: string, quotaName: string): Promise<number | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] } },
      include: { planPrice: { include: { plan: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return 0;
    }

    const quotas = subscription.planPrice.plan.quotas as PlanQuotas;
    const limit = quotas[quotaName as keyof PlanQuotas];
    return typeof limit === "number" ? limit : null;
  }

  async getCurrentUsage(tenantId: string, quotaName: string): Promise<number> {
    switch (quotaName) {
      case "maxCourses":
        return this.prisma.course.count({
          where: { tenantId, status: { not: "ARCHIVED" } },
        });
      case "maxActiveLearners":
        return this.prisma.enrollment.count({
          where: { course: { tenantId }, status: "ACTIVE" },
        });
      case "maxManagers":
        return this.prisma.user.count({
          where: { tenantId, type: "COMPANY_USER", status: "ACTIVE" },
        });
      case "storageGb": {
        // ENT-24 : stockage occupé, en Go (décimal), pour la jauge d'usage ; hors assets refusés ou échoués.
        const result = await this.prisma.mediaAsset.aggregate({
          where: { tenantId, status: { notIn: ["REJECTED", "FAILED"] } },
          _sum: { sizeBytes: true },
        });
        return (result._sum.sizeBytes ?? 0) / (1024 * 1024 * 1024);
      }
      case "liveSessionsPerMonth": {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        return this.prisma.liveSession.count({
          where: { tenantId, createdAt: { gte: startOfMonth } },
        });
      }
      default:
        return 0;
    }
  }
}
