import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { PlanFeatureRepositoryPort } from "../domain/plan-feature.repository.port";
import type { PlanFeatures } from "../domain/plan-quotas";

@Injectable()
export class PlanFeaturePrismaRepository implements PlanFeatureRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getFeaturesForTenant(tenantId: string): Promise<PlanFeatures | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] } },
      include: { planPrice: { include: { plan: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return null;
    }

    return subscription.planPrice.plan.features as PlanFeatures;
  }
}
