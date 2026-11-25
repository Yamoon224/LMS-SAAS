import { Module } from "@nestjs/common";

import { ArchivePlanUseCase } from "./application/archive-plan.use-case";
import { CheckQuotaUseCase } from "./application/check-quota.use-case";
import { CreatePlanUseCase } from "./application/create-plan.use-case";
import { GetPlanFeaturesUseCase } from "./application/get-plan-features.use-case";
import { ListPlansUseCase } from "./application/list-plans.use-case";
import { ManageCreditPacksUseCase } from "./application/manage-credit-packs.use-case";
import { ResolveCommissionUseCase } from "./application/resolve-commission.use-case";
import { SetCommissionRuleUseCase } from "./application/set-commission-rule.use-case";
import { SetPlanPriceUseCase } from "./application/set-plan-price.use-case";
import { UpdatePlanUseCase } from "./application/update-plan.use-case";
import { COMMISSION_RULE_REPOSITORY } from "./domain/commission-rule.repository.port";
import { CREDIT_PACK_REPOSITORY } from "./domain/credit-pack.repository.port";
import { PLAN_FEATURE_REPOSITORY } from "./domain/plan-feature.repository.port";
import { PLAN_QUOTA_REPOSITORY } from "./domain/plan-quota.repository.port";
import { PLAN_REPOSITORY } from "./domain/plan.repository.port";
import { CommissionRulePrismaRepository } from "./infrastructure/commission-rule.prisma-repository";
import { CreditPackPrismaRepository } from "./infrastructure/credit-pack.prisma-repository";
import { PlanFeaturePrismaRepository } from "./infrastructure/plan-feature.prisma-repository";
import { PlanQuotaPrismaRepository } from "./infrastructure/plan-quota.prisma-repository";
import { PlanPrismaRepository } from "./infrastructure/plan.prisma-repository";
import { PlansFacade } from "./plans.facade";
import { AdminPlansController } from "./presentation/admin-plans.controller";
import { BusinessPlansController } from "./presentation/business-plans.controller";

@Module({
  controllers: [AdminPlansController, BusinessPlansController],
  providers: [
    CheckQuotaUseCase,
    CreatePlanUseCase,
    ArchivePlanUseCase,
    UpdatePlanUseCase,
    SetPlanPriceUseCase,
    SetCommissionRuleUseCase,
    ResolveCommissionUseCase,
    ManageCreditPacksUseCase,
    ListPlansUseCase,
    GetPlanFeaturesUseCase,
    PlansFacade,
    { provide: PLAN_QUOTA_REPOSITORY, useClass: PlanQuotaPrismaRepository },
    { provide: PLAN_REPOSITORY, useClass: PlanPrismaRepository },
    { provide: COMMISSION_RULE_REPOSITORY, useClass: CommissionRulePrismaRepository },
    { provide: CREDIT_PACK_REPOSITORY, useClass: CreditPackPrismaRepository },
    { provide: PLAN_FEATURE_REPOSITORY, useClass: PlanFeaturePrismaRepository },
  ],
  exports: [PlansFacade],
})
export class PlansModule {}
