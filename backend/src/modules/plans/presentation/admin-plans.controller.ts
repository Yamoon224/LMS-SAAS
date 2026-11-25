import { Body, Controller, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { ArchivePlanUseCase } from "../application/archive-plan.use-case";
import { CreatePlanUseCase } from "../application/create-plan.use-case";
import { ListPlansUseCase } from "../application/list-plans.use-case";
import { ManageCreditPacksUseCase } from "../application/manage-credit-packs.use-case";
import { SetCommissionRuleUseCase } from "../application/set-commission-rule.use-case";
import { SetPlanPriceUseCase } from "../application/set-plan-price.use-case";
import { UpdatePlanUseCase } from "../application/update-plan.use-case";

import { CreateCreditPackDto } from "./dto/create-credit-pack.dto";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { ReviseCommissionRuleDto } from "./dto/revise-commission-rule.dto";
import { SetCommissionRuleDto } from "./dto/set-commission-rule.dto";
import { SetPlanPriceDto } from "./dto/set-plan-price.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";

/** ADM-13 à ADM-19: plans tarifaires, prix, règles de commission, packs de crédits IA. */
@ApiTags("Admin / Plans tarifaires")
@Controller("admin/plans")
export class AdminPlansController {
  constructor(
    private readonly createPlanUseCase: CreatePlanUseCase,
    private readonly archivePlanUseCase: ArchivePlanUseCase,
    private readonly setPlanPriceUseCase: SetPlanPriceUseCase,
    private readonly setCommissionRuleUseCase: SetCommissionRuleUseCase,
    private readonly manageCreditPacksUseCase: ManageCreditPacksUseCase,
    private readonly listPlansUseCase: ListPlansUseCase,
    private readonly updatePlanUseCase: UpdatePlanUseCase,
  ) {}

  @Post()
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Créer un plan tarifaire (ADM-13/ADM-14)" })
  async create(@Body() dto: CreatePlanDto) {
    const plan = await this.createPlanUseCase.execute(dto);
    return { id: plan.id, name: plan.name };
  }

  @Get()
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Lister tous les plans, y compris privés et archivés (ADM-13)" })
  async list() {
    const plans = await this.listPlansUseCase.listAll();
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      isPublic: plan.isPublic,
      isArchived: plan.isArchived,
      quotas: plan.quotas,
      features: plan.features,
      commissionRatePercent: plan.commissionRatePercent,
      prices: plan.prices,
    }));
  }

  @Post(":id/archive")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Archiver un plan (ADM-13)" })
  async archive(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.archivePlanUseCase.execute(id, actor.userId);
    return { id, archived: true };
  }

  @Post(":id/unarchive")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Désarchiver un plan : il redevient souscriptible (ADM-13)" })
  async unarchive(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.archivePlanUseCase.restore(id, actor.userId);
    return { id, archived: false };
  }

  @Patch(":id")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Modifier nom, description, quotas et fonctionnalités d'un plan (prix versionné à part) — ADM-13" })
  async update(@Param("id") id: string, @Body() dto: UpdatePlanDto, @CurrentUser() actor: AuthenticatedUser) {
    await this.updatePlanUseCase.execute({ planId: id, actorId: actor.userId, ...dto });
    return { id, updated: true };
  }

  @Post(":id/prices")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Définir un nouveau prix (nouvelle version, ADM-17)" })
  async setPrice(@Param("id") planId: string, @Body() dto: SetPlanPriceDto) {
    await this.setPlanPriceUseCase.execute({ planId, ...dto });
    return { planId, period: dto.period, amount: dto.amount };
  }

  @Get("commission-rules")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Lister les règles de commission définies (ADM-15/ADM-16)" })
  async listCommissionRules() {
    return this.setCommissionRuleUseCase.listAll();
  }

  @Put("commission-rules/:id")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Modifier une règle de commission : crée une nouvelle version, l'ancienne est close (ADM-15/ADM-16)" })
  async reviseCommissionRule(@Param("id") id: string, @Body() dto: ReviseCommissionRuleDto) {
    return this.setCommissionRuleUseCase.revise(id, dto);
  }

  @Post("commission-rules")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Définir une règle de commission (ADM-15/ADM-16)" })
  async setCommissionRule(@Body() dto: SetCommissionRuleDto) {
    await this.setCommissionRuleUseCase.execute(dto);
    return { scope: dto.scope, type: dto.type };
  }

  @Get("credit-packs")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Lister tous les packs de crédits IA, y compris archivés (ADM-18)" })
  async listCreditPacks() {
    return this.manageCreditPacksUseCase.listAll();
  }

  @Post("credit-packs")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Créer un pack de crédits IA (ADM-18)" })
  async createCreditPack(@Body() dto: CreateCreditPackDto) {
    const pack = await this.manageCreditPacksUseCase.create(dto);
    return { id: pack.id, name: pack.name };
  }

  @Post("credit-packs/:id/archive")
  @RequirePermissions("plans.manage")
  @ApiOperation({ summary: "Archiver un pack de crédits IA (ADM-18)" })
  async archiveCreditPack(@Param("id") id: string) {
    await this.manageCreditPacksUseCase.archive(id);
    return { id, archived: true };
  }
}
