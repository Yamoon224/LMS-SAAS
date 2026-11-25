import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions, SkipSubscriptionCheck } from "@shared/decorators";

import { ChangePlanUseCase } from "../application/change-plan.use-case";
import { GetSubscriptionUsageUseCase } from "../application/get-subscription-usage.use-case";
import {
  CancelPendingPlanChangeUseCase,
  PreviewPlanChangeUseCase,
  SetAutoRenewUseCase,
} from "../application/plan-change.use-cases";
import { SubscribeToPlanUseCase } from "../application/subscribe-to-plan.use-case";

import { ChangePlanDto } from "./dto/change-plan.dto";
import { PreviewPlanChangeQueryDto } from "./dto/preview-plan-change.dto";
import { SetAutoRenewDto } from "./dto/set-auto-renew.dto";
import { SubscribeToPlanDto } from "./dto/subscribe-to-plan.dto";

/**
 * ENT-01 à ENT-04/ENT-07: abonnement et facturation de l'entreprise. Toutes
 * les routes contournent le SubscriptionGuard (@SkipSubscriptionCheck) car
 * elles doivent rester accessibles même sans abonnement valide (section 6).
 */
@ApiTags("Entreprise / Abonnement")
@Controller("business/subscription")
@SkipSubscriptionCheck()
export class BusinessSubscriptionsController {
  constructor(
    private readonly subscribeToPlanUseCase: SubscribeToPlanUseCase,
    private readonly changePlanUseCase: ChangePlanUseCase,
    private readonly getSubscriptionUsageUseCase: GetSubscriptionUsageUseCase,
    private readonly previewPlanChangeUseCase: PreviewPlanChangeUseCase,
    private readonly cancelPendingPlanChangeUseCase: CancelPendingPlanChangeUseCase,
    private readonly setAutoRenewUseCase: SetAutoRenewUseCase,
  ) {}

  @Post()
  @RequirePermissions("subscriptions.manage")
  @ApiOperation({ summary: "Souscrire à un plan (ENT-01/ENT-02)" })
  async subscribe(@CurrentTenant() tenantId: string, @Body() dto: SubscribeToPlanDto) {
    const subscription = await this.subscribeToPlanUseCase.execute({
      tenantId,
      planPriceId: dto.planPriceId,
      startWithTrial: dto.startWithTrial ?? false,
      selfService: true,
    });
    return { id: subscription.id, status: subscription.status };
  }

  @Post("change-plan")
  @RequirePermissions("subscriptions.manage")
  @ApiOperation({ summary: "Changer de plan, montée immédiate ou descente différée (ENT-04)" })
  async changePlan(@CurrentTenant() tenantId: string, @Body() dto: ChangePlanDto) {
    const { immediate, proration, scheduledFor } = await this.changePlanUseCase.execute({
      tenantId,
      newPlanPriceId: dto.newPlanPriceId,
      isUpgrade: dto.isUpgrade,
      selfService: true,
    });
    return { tenantId, newPlanPriceId: dto.newPlanPriceId, immediate, proration, scheduledFor };
  }

  @Get("change-plan/preview")
  @RequirePermissions("subscriptions.manage")
  @ApiOperation({ summary: "Aperçu du prorata avant confirmation d'un changement de plan (ENT-04)" })
  async previewChangePlan(@CurrentTenant() tenantId: string, @Query() query: PreviewPlanChangeQueryDto) {
    return this.previewPlanChangeUseCase.execute(tenantId, query.newPlanPriceId);
  }

  @Delete("change-plan/pending")
  @HttpCode(204)
  @RequirePermissions("subscriptions.manage")
  @ApiOperation({ summary: "Annuler la descente de gamme planifiée (ENT-04)" })
  async cancelPendingChange(@CurrentTenant() tenantId: string): Promise<void> {
    await this.cancelPendingPlanChangeUseCase.execute(tenantId);
  }

  @Patch("auto-renew")
  @RequirePermissions("subscriptions.manage")
  @ApiOperation({ summary: "Activer/désactiver le renouvellement automatique (ENT-03)" })
  async setAutoRenew(@CurrentTenant() tenantId: string, @Body() dto: SetAutoRenewDto) {
    await this.setAutoRenewUseCase.execute(tenantId, dto.autoRenew);
    return { autoRenew: dto.autoRenew };
  }

  @Get()
  @RequirePermissions("subscriptions.manage")
  @ApiOperation({ summary: "Statut de l'abonnement courant et jauges d'usage (ENT-07)" })
  async getCurrent(@CurrentTenant() tenantId: string) {
    const subscription = await this.getSubscriptionUsageUseCase.execute(tenantId);
    return {
      id: subscription.id,
      status: subscription.status,
      planPriceId: subscription.planPriceId,
      autoRenew: subscription.autoRenew,
      startedAt: subscription.startedAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      graceEndsAt: subscription.graceEndsAt,
      pendingPlanPriceId: subscription.pendingPlanPriceId,
      pendingChangeAt: subscription.pendingChangeAt,
      lastRenewal: subscription.lastRenewalStatus
        ? {
            status: subscription.lastRenewalStatus,
            at: subscription.lastRenewalAt,
            amount: subscription.lastRenewalAmount,
            paymentUrl: subscription.lastRenewalCheckoutUrl,
          }
        : null,
    };
  }
}
