import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { DeleteMyAccountUseCase } from "../application/delete-my-account.use-case";
import { ExportMyDataUseCase } from "../application/export-my-data.use-case";

import { DeleteAccountDto } from "./dto/delete-account.dto";

/**
 * Section 11 / loi 2013-450 : droits d'accès et d'effacement de l'apprenant. L'identité vient exclusivement du jeton.
 * Le droit de se connecter à ces routes est celui de tout apprenant (`learner.view-own-enrollments`).
 */
@ApiTags("Plateforme publique / Mes données")
@Controller("public/me")
export class PublicPrivacyController {
  constructor(
    private readonly exportMyDataUseCase: ExportMyDataUseCase,
    private readonly deleteMyAccountUseCase: DeleteMyAccountUseCase,
  ) {}

  @Get("data-export")
  @RequirePermissions("learner.view-own-enrollments")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: "Exporter toutes mes données personnelles (JSON)" })
  async dataExport(@CurrentUser() user: AuthenticatedUser) {
    return this.exportMyDataUseCase.execute(user.userId);
  }

  @Post("delete-account")
  @HttpCode(200)
  @RequirePermissions("learner.view-own-enrollments")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Supprimer (anonymiser) mon compte, avec mon mot de passe" })
  async deleteAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto) {
    await this.deleteMyAccountUseCase.execute(user.userId, dto.password);
    return { deleted: true };
  }
}
