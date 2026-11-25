import { Body, Controller, Get, Param, Patch, Post, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import { NotFoundDomainError } from "@shared/errors";

import { ActivateTenantUseCase } from "../application/activate-tenant.use-case";
import { ArchiveTenantUseCase } from "../application/archive-tenant.use-case";
import { CreateTenantUseCase } from "../application/create-tenant.use-case";
import { SuspendTenantUseCase } from "../application/suspend-tenant.use-case";
import { GetTenantSettingsUseCase, UpdateTenantSettingsUseCase } from "../application/tenant-settings.use-cases";
import { UpdateTenantUseCase } from "../application/update-tenant.use-case";
import { UploadTenantLogoUseCase } from "../application/upload-tenant-logo.use-case";
import { LOGO_MAX_BYTES } from "../domain/logo-image";
import type { Tenant } from "../domain/tenant.entity";
import { TenantsFacade } from "../tenants.facade";

import { CreateTenantDto } from "./dto/create-tenant.dto";
import { SuspendTenantDto } from "./dto/suspend-tenant.dto";
import { AdminUpdateBrandingDto } from "./dto/admin-update-branding.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";

function toTenantResponse(tenant: Tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    statusReason: tenant.statusReason,
    country: tenant.country,
    currency: tenant.currency,
    defaultLocale: tenant.defaultLocale,
    logoUrl: tenant.publicBranding.logoUrl,
    createdAt: tenant.createdAt,
  };
}

/** ADM-04, ADM-08: gestion des entreprises par le back-office Admin. */
@ApiTags("Admin / Entreprises")
@Controller("admin/tenants")
export class TenantsController {
  constructor(
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly suspendTenantUseCase: SuspendTenantUseCase,
    private readonly activateTenantUseCase: ActivateTenantUseCase,
    private readonly archiveTenantUseCase: ArchiveTenantUseCase,
    private readonly updateTenantUseCase: UpdateTenantUseCase,
    private readonly uploadTenantLogo: UploadTenantLogoUseCase,
    private readonly getTenantSettings: GetTenantSettingsUseCase,
    private readonly updateTenantSettings: UpdateTenantSettingsUseCase,
    private readonly tenantsFacade: TenantsFacade,
  ) {}

  @Post()
  @RequirePermissions("tenants.create")
  @ApiOperation({ summary: "Créer une entreprise (ADM-04)" })
  async create(@Body() dto: CreateTenantDto) {
    const tenant = await this.createTenantUseCase.execute(dto);
    return { id: tenant.id, slug: tenant.slug, status: tenant.status };
  }

  /** Le fichier n'est rattaché à aucune entreprise tant que son adresse n'est pas enregistrée avec l'identité visuelle. */
  @Post("branding/logo")
  @RequirePermissions("tenants.update")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: LOGO_MAX_BYTES + 1, files: 1 } }))
  @ApiOperation({ summary: "Téléverser un logo (PNG, JPG ou WebP, 2 Mo max) et obtenir son adresse publique (ADM-10)" })
  async uploadLogo(@UploadedFile() file: { buffer: Buffer } | undefined) {
    return this.uploadTenantLogo.execute(file?.buffer);
  }

  @Patch(":id")
  @RequirePermissions("tenants.update")
  @ApiOperation({ summary: "Modifier les informations d'une entreprise : nom, pays, devise, langue, contacts (ADM-10)" })
  async update(@Param("id") id: string, @Body() dto: UpdateTenantDto) {
    const tenant = await this.updateTenantUseCase.execute(id, dto);
    return toTenantResponse(tenant);
  }

  @Get(":id/branding")
  @RequirePermissions("tenants.read")
  @ApiOperation({ summary: "Identité visuelle courante : logo, couleurs principale et secondaire (ADM-10)" })
  async branding(@Param("id") id: string) {
    const settings = await this.getTenantSettings.execute(id);
    return { displayName: settings.displayName, ...settings.branding };
  }

  @Put(":id/branding")
  @RequirePermissions("tenants.update")
  @ApiOperation({ summary: "Modifier l'identité visuelle d'une entreprise : logo https, couleurs #RRGGBB (ADM-10)" })
  async updateBranding(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: AdminUpdateBrandingDto) {
    // Le nom d'affichage se modifie avec les informations générales : on conserve celui en place.
    const { displayName } = await this.getTenantSettings.execute(id);
    const updated = await this.updateTenantSettings.updateBranding(id, user.userId, { displayName, ...dto });
    return { displayName: updated.displayName, ...updated.branding };
  }

  @Post(":id/suspend")
  @RequirePermissions("tenants.suspend")
  @ApiOperation({ summary: "Suspendre une entreprise (ADM-08)" })
  async suspend(@Param("id") id: string, @Body() dto: SuspendTenantDto) {
    await this.suspendTenantUseCase.execute(id, dto.reason);
    return { id, status: "SUSPENDED" };
  }

  @Post(":id/activate")
  @RequirePermissions("tenants.activate")
  @ApiOperation({ summary: "Mettre en service une entreprise (DRAFT) ou lever sa suspension (ADM-04/ADM-08)" })
  async activate(@Param("id") id: string) {
    await this.activateTenantUseCase.execute(id);
    return { id, status: "ACTIVE" };
  }

  /** Pas de permission `tenants.archive` dédiée (aucun rattrapage des rôles existants) : même droit que la suspension. */
  @Post(":id/archive")
  @RequirePermissions("tenants.suspend")
  @ApiOperation({ summary: "Archiver une entreprise (ACTIVE ou SUSPENDED, définitif) — ADM-08" })
  async archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.archiveTenantUseCase.execute(id, user.userId);
    return { id, status: "ARCHIVED" };
  }

  @Get()
  @RequirePermissions("tenants.read")
  @ApiOperation({ summary: "Lister toutes les entreprises, tous statuts confondus (ADM-10)" })
  async list() {
    const tenants = await this.tenantsFacade.listAll();
    return tenants.map(toTenantResponse);
  }

  @Get(":id")
  @RequirePermissions("tenants.read")
  @ApiOperation({ summary: "Fiche 360° entreprise (ADM-10)" })
  async findOne(@Param("id") id: string) {
    const tenant = await this.tenantsFacade.findById(id);
    if (!tenant) {
      throw new NotFoundDomainError(`Entreprise introuvable: ${id}`);
    }
    return toTenantResponse(tenant);
  }
}
