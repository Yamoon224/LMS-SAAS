import { Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { GetTenantPayoutAccountUseCase, VerifyTenantPayoutAccountUseCase } from "../application/payout-account-admin.use-cases";

/** ENT-11 côté Admin : consulter (masqué) et vérifier le compte de reversement d'une entreprise. */
@ApiTags("Admin / Entreprises")
@Controller("admin/tenants/:id/payout-account")
export class AdminTenantPayoutAccountController {
  constructor(
    private readonly getPayoutAccount: GetTenantPayoutAccountUseCase,
    private readonly verifyPayoutAccount: VerifyTenantPayoutAccountUseCase,
  ) {}

  @Get()
  @RequirePermissions("tenants.read")
  @ApiOperation({ summary: "Compte de reversement masqué (***1234) et état de vérification" })
  async get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPayoutAccount.execute(id);
  }

  @Post("verify")
  @RequirePermissions("payout-accounts.verify")
  @ApiOperation({ summary: "Marquer le compte de reversement comme vérifié" })
  async verify(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.verifyPayoutAccount.execute(id, user.userId);
  }
}
