import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import {
  GetTenantSettingsUseCase,
  UpdatePayoutAccountUseCase,
  UpdateTenantSettingsUseCase,
} from "../application/tenant-settings.use-cases";

import {
  UpdateBrandingDto,
  UpdateContactsDto,
  UpdateOfflinePaymentDto,
  UpdatePayoutAccountDto,
} from "./dto/tenant-settings.dto";

/**
 * ENT-08 / ENT-11 / ENT-12 : paramètres de l'entreprise courante. Le tenant vient TOUJOURS du jeton
 * (jamais du corps ou de l'URL) : une entreprise ne peut ni lire ni modifier celle d'une autre.
 */
@ApiTags("Entreprise / Paramètres")
@Controller("business/settings")
export class BusinessSettingsController {
  constructor(
    private readonly getSettings: GetTenantSettingsUseCase,
    private readonly updateSettings: UpdateTenantSettingsUseCase,
    private readonly updatePayoutAccount: UpdatePayoutAccountUseCase,
  ) {}

  @Get()
  @RequirePermissions("settings.manage")
  @ApiOperation({ summary: "Réglages courants (compte de reversement masqué ***1234)" })
  async get(@CurrentTenant() tenantId: string) {
    return this.getSettings.execute(tenantId);
  }

  @Put("branding")
  @RequirePermissions("settings.manage")
  @ApiOperation({ summary: "Identité visuelle : nom d'affichage, logo https, couleurs #RRGGBB (ENT-08)" })
  async putBranding(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateBrandingDto) {
    return this.updateSettings.updateBranding(tenantId, user.userId, dto);
  }

  @Put("contacts")
  @RequirePermissions("settings.manage")
  @ApiOperation({ summary: "Contacts et informations légales (ENT-08)" })
  async putContacts(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateContactsDto) {
    return this.updateSettings.updateContacts(tenantId, user.userId, dto);
  }

  @Put("offline-payment")
  @RequirePermissions("settings.manage")
  @ApiOperation({ summary: "Paiement hors plateforme : activation et instructions (ENT-12)" })
  async putOfflinePayment(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOfflinePaymentDto) {
    return this.updateSettings.updateOfflinePayment(tenantId, user.userId, dto);
  }

  @Put("payout-account")
  @RequirePermissions("settings.manage")
  @ApiOperation({ summary: "Coordonnées de reversement (ENT-11) : mot de passe requis, remet le compte à « non vérifié »" })
  async putPayoutAccount(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePayoutAccountDto) {
    return this.updatePayoutAccount.execute(tenantId, user.userId, dto);
  }
}
