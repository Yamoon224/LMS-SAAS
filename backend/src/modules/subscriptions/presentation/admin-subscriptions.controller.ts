import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import {
  ApplySubscriptionDiscountUseCase,
  ExtendSubscriptionPeriodUseCase,
  OfferPlanUseCase,
} from "../application/admin-subscription.use-cases";
import { GetTenantSubscriptionUseCase } from "../application/get-tenant-subscription.use-case";
import { SubscribeToPlanUseCase } from "../application/subscribe-to-plan.use-case";

import { ApplyDiscountDto, ExtendSubscriptionDto, OfferPlanDto } from "./dto/admin-subscription.dto";
import { SubscribeToPlanDto } from "./dto/subscribe-to-plan.dto";

/** ADM-09: attribuer un plan, accorder un essai, prolonger, remiser ou offrir un plan. */
@ApiTags("Admin / Entreprises")
@Controller("admin/tenants/:tenantId/subscription")
export class AdminSubscriptionsController {
  constructor(
    private readonly subscribeToPlanUseCase: SubscribeToPlanUseCase,
    private readonly getTenantSubscriptionUseCase: GetTenantSubscriptionUseCase,
    private readonly extendUseCase: ExtendSubscriptionPeriodUseCase,
    private readonly discountUseCase: ApplySubscriptionDiscountUseCase,
    private readonly offerPlanUseCase: OfferPlanUseCase,
  ) {}

  @Get()
  @RequirePermissions("subscriptions.assign")
  @ApiOperation({ summary: "Consulter l'abonnement courant d'une entreprise (ADM-09)" })
  async getCurrent(@Param("tenantId") tenantId: string) {
    const subscription = await this.getTenantSubscriptionUseCase.execute(tenantId);
    return subscription;
  }

  @Post()
  @RequirePermissions("subscriptions.assign")
  @ApiOperation({ summary: "Attribuer un plan à une entreprise, avec essai optionnel (ADM-09)" })
  async assign(@Param("tenantId") tenantId: string, @Body() dto: SubscribeToPlanDto) {
    const subscription = await this.subscribeToPlanUseCase.execute({
      tenantId,
      planPriceId: dto.planPriceId,
      startWithTrial: dto.startWithTrial ?? false,
    });
    return { id: subscription.id, status: subscription.status };
  }

  @Post("extend")
  @HttpCode(200)
  @RequirePermissions("subscriptions.assign")
  @ApiOperation({ summary: "Prolonger la période courante, en jours ou jusqu'à une date (ADM-09)" })
  async extend(
    @Param("tenantId") tenantId: string,
    @Body() dto: ExtendSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.extendUseCase.execute({ tenantId, actorId: actor.userId, ...dto });
  }

  @Post("discount")
  @HttpCode(200)
  @RequirePermissions("subscriptions.assign")
  @ApiOperation({ summary: "Appliquer une remise (pourcentage ou montant) sur les prochaines périodes (ADM-09)" })
  async applyDiscount(
    @Param("tenantId") tenantId: string,
    @Body() dto: ApplyDiscountDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.discountUseCase.execute({ tenantId, actorId: actor.userId, ...dto });
  }

  @Delete("discount")
  @RequirePermissions("subscriptions.assign")
  @ApiOperation({ summary: "Retirer la remise en cours (ADM-09)" })
  async removeDiscount(@Param("tenantId") tenantId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.discountUseCase.remove(tenantId, actor.userId);
  }

  @Post("offer")
  @HttpCode(200)
  @RequirePermissions("subscriptions.assign")
  @ApiOperation({ summary: "Offrir un plan sans paiement, motif obligatoire (ADM-09)" })
  async offer(
    @Param("tenantId") tenantId: string,
    @Body() dto: OfferPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.offerPlanUseCase.execute({ tenantId, actorId: actor.userId, ...dto });
  }
}
