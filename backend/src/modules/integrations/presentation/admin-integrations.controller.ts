import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import {
  ListIntegrationsUseCase,
  ResetIntegrationUseCase,
  SaveIntegrationUseCase,
  TestSmtpIntegrationUseCase,
} from "../application/integrations.use-cases";

import { SaveIntegrationDto, TestSmtpDto } from "./dto/integration.dto";

/** ADM-37 : intégrations de la plateforme. Les secrets ne sont jamais renvoyés. */
@ApiTags("Admin / Intégrations")
@Controller("admin/integrations")
export class AdminIntegrationsController {
  constructor(
    private readonly listIntegrationsUseCase: ListIntegrationsUseCase,
    private readonly saveIntegrationUseCase: SaveIntegrationUseCase,
    private readonly resetIntegrationUseCase: ResetIntegrationUseCase,
    private readonly testSmtpIntegrationUseCase: TestSmtpIntegrationUseCase,
  ) {}

  @Get()
  @RequirePermissions("integrations.manage")
  @ApiOperation({ summary: "Intégrations, état et valeurs non secrètes" })
  list() {
    return this.listIntegrationsUseCase.execute();
  }

  // Route fixe déclarée avant « :provider » pour ne jamais être capturée par le paramètre.
  @Post("EMAIL_SMTP/test")
  @HttpCode(200)
  @RequirePermissions("integrations.manage")
  @ApiOperation({ summary: "Envoyer un e-mail d'essai avec la configuration SMTP effective" })
  async testSmtp(@Body() dto: TestSmtpDto) {
    await this.testSmtpIntegrationUseCase.execute(dto.to);
    return { sent: true };
  }

  @Put(":provider")
  @RequirePermissions("integrations.manage")
  @ApiOperation({ summary: "Enregistrer la configuration d'une intégration (secrets chiffrés)" })
  async save(
    @Param("provider") provider: string,
    @Body() dto: SaveIntegrationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.saveIntegrationUseCase.execute({
      provider,
      values: dto.values,
      clearSecrets: dto.clearSecrets ?? [],
      actorId: user.userId,
    });
    return { provider, saved: true };
  }

  @Delete(":provider")
  @RequirePermissions("integrations.manage")
  @ApiOperation({ summary: "Supprimer la configuration saisie : retour aux variables d'environnement" })
  async reset(@Param("provider") provider: string, @CurrentUser() user: AuthenticatedUser) {
    await this.resetIntegrationUseCase.execute(provider, user.userId);
    return { provider, reset: true };
  }
}
