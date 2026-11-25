import { Controller, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { ResetTwoFactorUseCase } from "../application/two-factor-settings.use-cases";

/**
 * ADM-36 : réinitialisation de la 2FA d'un autre administrateur (appareil perdu). Placé dans le module auth
 * (qui possède les données 2FA) mais exposé sous `admin/users/:id/...` comme les autres actions sur les comptes.
 */
@ApiTags("Admin / Utilisateurs plateforme")
@Controller("admin/users")
export class AdminTwoFactorController {
  constructor(private readonly resetTwoFactor: ResetTwoFactorUseCase) {}

  @Post(":id/2fa/reset")
  @HttpCode(200)
  @RequirePermissions("admin-users.manage")
  @ApiOperation({ summary: "Réinitialiser la 2FA d'un autre administrateur (révoque ses sessions)" })
  async reset(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.resetTwoFactor.execute({ targetUserId: id, actorUserId: actor.userId });
    return { id, twoFactorReset: true };
  }
}

/** ADM-06 : réinitialisation de la 2FA d'un compte interne d'une entreprise (appareil perdu), dans son périmètre. */
@ApiTags("Admin / Entreprises")
@Controller("admin/tenants/:tenantId/users")
export class AdminTenantTwoFactorController {
  constructor(private readonly resetTwoFactor: ResetTwoFactorUseCase) {}

  @Post(":userId/2fa/reset")
  @HttpCode(200)
  @RequirePermissions("tenants.suspend")
  @ApiOperation({ summary: "Réinitialiser la 2FA d'un compte de l'entreprise (révoque ses sessions) — ADM-06" })
  async reset(
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.resetTwoFactor.execute({ targetUserId: userId, actorUserId: actor.userId, scopeTenantId: tenantId });
    return { id: userId, twoFactorReset: true };
  }
}
