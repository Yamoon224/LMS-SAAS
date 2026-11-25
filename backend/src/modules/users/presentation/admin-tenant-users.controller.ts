import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { AdminTenantUsersUseCase } from "../application/admin-tenant-users.use-cases";

import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";

/**
 * ADM-06 : actions de l'Admin sur les comptes internes d'une entreprise (onglet « Utilisateurs » de la fiche).
 * Permission `tenants.suspend` (déjà attribuée au Super Administrateur, comme l'archivage) : aucune nouvelle
 * permission à rattraper. Le périmètre (compte du tenant de l'URL) est vérifié par le cas d'usage.
 */
@ApiTags("Admin / Entreprises")
@Controller("admin/tenants/:tenantId")
export class AdminTenantUsersController {
  constructor(private readonly useCase: AdminTenantUsersUseCase) {}

  @Post("users/:userId/suspend")
  @HttpCode(200)
  @RequirePermissions("tenants.suspend")
  @ApiOperation({ summary: "Suspendre un compte de l'entreprise (refusé pour le dernier propriétaire actif) — ADM-06" })
  async suspend(
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.useCase.suspend(tenantId, userId, actor.userId);
    return { id: userId, status: "SUSPENDED" };
  }

  @Post("users/:userId/reactivate")
  @HttpCode(200)
  @RequirePermissions("tenants.suspend")
  @ApiOperation({ summary: "Réactiver un compte suspendu de l'entreprise — ADM-06" })
  async reactivate(
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.useCase.reactivate(tenantId, userId, actor.userId);
    return { id: userId, status: "ACTIVE" };
  }

  @Post("users/:userId/resend-invitation")
  @HttpCode(200)
  @RequirePermissions("tenants.suspend")
  @ApiOperation({ summary: "Renvoyer l'invitation à un compte non activé — ADM-06" })
  async resendInvitation(
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.useCase.resendInvitationFor(tenantId, userId, actor.userId);
    return { id: userId, invitationResent: true };
  }

  @Post("users/:userId/password-reset")
  @HttpCode(200)
  @RequirePermissions("tenants.suspend")
  @ApiOperation({ summary: "Envoyer un lien de réinitialisation de mot de passe par e-mail (rien n'est retourné) — ADM-06" })
  async passwordReset(
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.useCase.sendPasswordReset(tenantId, userId, actor.userId);
    return { id: userId, passwordResetSent: true };
  }

  @Post("ownership-transfer")
  @HttpCode(200)
  @RequirePermissions("tenants.suspend")
  @ApiOperation({ summary: "Transférer la propriété de l'entreprise à un autre compte actif — ADM-06" })
  async transferOwnership(
    @Param("tenantId", ParseUUIDPipe) tenantId: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.useCase.transferOwnership(tenantId, dto.newOwnerUserId, actor.userId);
    return { tenantId, newOwnerUserId: dto.newOwnerUserId };
  }
}
