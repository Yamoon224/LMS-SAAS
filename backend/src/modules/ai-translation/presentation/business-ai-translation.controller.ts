import { CoursesFacade } from "@modules/courses/courses.facade";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import { ConfirmTranslationUseCase } from "../application/confirm-translation.use-case";
import {
  ListCourseTranslationsUseCase,
  SetCourseTranslationPublicationUseCase,
} from "../application/course-translations.use-cases";
import { EstimateTranslationUseCase } from "../application/estimate-translation.use-case";
import { GetWalletBalanceUseCase } from "../application/get-wallet-balance.use-case";
import { ListLedgerUseCase } from "../application/list-ledger.use-case";
import { ListTranslationJobsUseCase } from "../application/list-translation-jobs.use-case";
import { PurchaseCreditPackUseCase } from "../application/purchase-credit-pack.use-case";

import { EstimateTranslationDto } from "./dto/estimate-translation.dto";
import { PurchaseCreditPackDto } from "./dto/purchase-credit-pack.dto";

/** ADM-18: traduction IA du contenu pédagogique et gestion des crédits. */
@ApiTags("Entreprise / Traduction IA")
@Controller("business/ai-translation")
export class BusinessAiTranslationController {
  constructor(
    private readonly estimateTranslationUseCase: EstimateTranslationUseCase,
    private readonly confirmTranslationUseCase: ConfirmTranslationUseCase,
    private readonly listTranslationJobsUseCase: ListTranslationJobsUseCase,
    private readonly getWalletBalanceUseCase: GetWalletBalanceUseCase,
    private readonly listLedgerUseCase: ListLedgerUseCase,
    private readonly purchaseCreditPackUseCase: PurchaseCreditPackUseCase,
    private readonly coursesFacade: CoursesFacade,
    private readonly listCourseTranslationsUseCase: ListCourseTranslationsUseCase,
    private readonly setCourseTranslationPublicationUseCase: SetCourseTranslationPublicationUseCase,
  ) {}

  @Post("courses/:courseId/estimate")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Estimer le coût en crédits d'une traduction (ADM-18)" })
  async estimate(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Body() dto: EstimateTranslationDto,
  ) {
    const job = await this.estimateTranslationUseCase.execute(courseId, tenantId, dto.targetLocale);
    const snapshot = job.toSnapshot();
    return {
      id: job.id,
      status: job.status,
      estimatedCredits: job.estimatedCredits,
      wordCount: snapshot.wordCount,
      targetLocale: snapshot.targetLocale,
    };
  }

  @Post("jobs/:jobId/confirm")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Confirmer et débiter la traduction estimée (ADM-18)" })
  async confirm(@CurrentTenant() tenantId: string, @Param("jobId") jobId: string) {
    await this.confirmTranslationUseCase.execute(jobId, tenantId);
    return { jobId, status: "CONFIRMED" };
  }

  @Get("courses/:courseId/jobs")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Historique des traductions d'une formation" })
  async listForCourse(@CurrentTenant() tenantId: string, @Param("courseId") courseId: string) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    const jobs = await this.listTranslationJobsUseCase.listForCourse(courseId, tenantId);
    return jobs.map((job) => ({
      id: job.id,
      targetLocale: job.targetLocale,
      status: job.status,
      estimatedCredits: job.estimatedCredits,
    }));
  }

  @Get("courses/:courseId/translations")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Langues traduites d'une formation : statut et couverture des leçons (PUB-17)" })
  async listTranslations(@CurrentTenant() tenantId: string, @Param("courseId") courseId: string) {
    return this.listCourseTranslationsUseCase.execute(courseId, tenantId);
  }

  @Post("courses/:courseId/translations/:locale/publish")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Publier une langue pour toute la formation, après relecture (PUB-17)" })
  async publishTranslation(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Param("locale") locale: string,
  ) {
    await this.setCourseTranslationPublicationUseCase.execute(courseId, tenantId, locale, true);
    return { courseId, locale, published: true };
  }

  @Post("courses/:courseId/translations/:locale/unpublish")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Retirer une langue publiée : l'apprenant retombe sur la langue d'origine (PUB-17)" })
  async unpublishTranslation(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Param("locale") locale: string,
  ) {
    await this.setCourseTranslationPublicationUseCase.execute(courseId, tenantId, locale, false);
    return { courseId, locale, published: false };
  }

  @Get("wallet")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Solde du portefeuille de crédits IA" })
  async wallet(@CurrentTenant() tenantId: string) {
    const balance = await this.getWalletBalanceUseCase.execute(tenantId);
    return { balance };
  }

  @Get("wallet/ledger")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Historique des mouvements de crédits" })
  async ledger(@CurrentTenant() tenantId: string) {
    return this.listLedgerUseCase.execute(tenantId);
  }

  @Post("wallet/purchase")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Acheter un pack de crédits IA (ADM-18)" })
  async purchase(@CurrentTenant() tenantId: string, @Body() dto: PurchaseCreditPackDto) {
    return this.purchaseCreditPackUseCase.execute({
      tenantId,
      creditPackId: dto.creditPackId,
      method: dto.method,
      customerEmail: dto.customerEmail,
      callbackUrl: dto.callbackUrl,
    });
  }
}
