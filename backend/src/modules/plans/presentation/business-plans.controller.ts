import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, Public, RequirePermissions, SkipSubscriptionCheck } from "@shared/decorators";

import { CheckQuotaUseCase } from "../application/check-quota.use-case";
import { ListPlansUseCase } from "../application/list-plans.use-case";
import { ManageCreditPacksUseCase } from "../application/manage-credit-packs.use-case";

/** Quotas exposés sous forme de jauges (ENT-07). Clés alignées sur PlanQuotas. */
const USAGE_QUOTA_NAMES = [
  "maxCourses",
  "maxActiveLearners",
  "maxManagers",
  "storageGb",
  "liveSessionsPerMonth",
] as const;

/** ENT-01 (choix d'un plan) / ENT-06 (achat de packs de crédits IA) / ENT-07 (usage du plan). */
@ApiTags("Entreprise / Abonnement")
@Controller("business/plans")
export class BusinessPlansController {
  constructor(
    private readonly listPlansUseCase: ListPlansUseCase,
    private readonly manageCreditPacksUseCase: ManageCreditPacksUseCase,
    private readonly checkQuotaUseCase: CheckQuotaUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Comparatif des plans publics et de leurs quotas (ENT-01)" })
  async listPublicPlans() {
    const plans = await this.listPlansUseCase.listPublic();
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      quotas: plan.quotas,
      features: plan.features,
      prices: plan.prices
        .filter((price) => price.isActive)
        .map((price) => ({
          id: price.id,
          period: price.period,
          currency: price.currency,
          amount: price.amount,
          trialDays: price.trialDays,
        })),
    }));
  }

  @Get("usage")
  @SkipSubscriptionCheck()
  @RequirePermissions("subscriptions.manage")
  @ApiOperation({ summary: "Jauges d'usage du plan courant (ENT-07)" })
  async getUsage(@CurrentTenant() tenantId: string) {
    const results = await Promise.all(
      USAGE_QUOTA_NAMES.map(async (name) => {
        const { current, limit } = await this.checkQuotaUseCase.execute(tenantId, name);
        return { name, current, limit };
      }),
    );
    return results;
  }

  @Get("credit-packs")
  @ApiOperation({ summary: "Packs de crédits IA disponibles à l'achat (ENT-06)" })
  async listCreditPacks() {
    return this.manageCreditPacksUseCase.listActive();
  }
}
