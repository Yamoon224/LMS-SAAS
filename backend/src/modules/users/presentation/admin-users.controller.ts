import { Body, Controller, Get, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { RequirePermissions } from "@shared/decorators";
import { Public } from "@shared/decorators/public.decorator";

import { ActivateAccountUseCase } from "../application/activate-account.use-case";
import { AssertRolesInScopeUseCase } from "../application/assert-roles-in-scope.use-case";
import { AssignRolesUseCase } from "../application/assign-roles.use-case";
import { InviteUserUseCase } from "../application/invite-user.use-case";
import { ListUsersUseCase } from "../application/list-users.use-case";
import { ManageUserStatusUseCase } from "../application/manage-user-status.use-case";
import { ResendInvitationUseCase } from "../application/resend-invitation.use-case";
import { ROLE_REPOSITORY } from "../domain/role.repository.port";
import type { RoleRepositoryPort } from "../domain/role.repository.port";

import { ActivateAccountDto } from "./dto/activate-account.dto";
import { AssignRolesDto } from "./dto/assign-roles.dto";
import { InviteUserDto } from "./dto/invite-user.dto";

/**
 * ADM-36: gestion des comptes Administrateur / Opérateur / Finance / Support
 * (tenantId = null, comptes plateforme). ADM-05/06: le même mécanisme
 * d'invitation sert à créer le compte propriétaire d'une entreprise, mais
 * cette création passe par TenantsController (elle fixe aussi le tenant).
 */
@ApiTags("Admin / Utilisateurs plateforme")
@Controller("admin/users")
export class AdminUsersController {
  constructor(
    private readonly inviteUserUseCase: InviteUserUseCase,
    private readonly resendInvitationUseCase: ResendInvitationUseCase,
    private readonly manageUserStatusUseCase: ManageUserStatusUseCase,
    private readonly assignRolesUseCase: AssignRolesUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly assertRolesInScopeUseCase: AssertRolesInScopeUseCase,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepositoryPort,
  ) {}

  @Post()
  @RequirePermissions("admin-users.manage")
  @ApiOperation({ summary: "Inviter un administrateur plateforme (ADM-36)" })
  async invite(@Body() dto: InviteUserDto) {
    await this.assertRolesInScopeUseCase.execute(dto.roleIds, null);
    const { user } = await this.inviteUserUseCase.execute({
      tenantId: null,
      type: "PLATFORM_ADMIN",
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      locale: dto.locale,
      roleIds: dto.roleIds,
    });
    return { id: user.id, status: user.status };
  }

  @Get()
  @RequirePermissions("admin-users.manage")
  @ApiOperation({ summary: "Lister les comptes admin plateforme" })
  async list() {
    const users = await this.listUsersUseCase.execute(null);
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      roleIds: user.roleIds,
    }));
  }

  @Get("roles")
  @RequirePermissions("admin-users.manage")
  @ApiOperation({ summary: "Lister les rôles plateforme disponibles (pour invitation / affectation)" })
  async listRoles() {
    return this.roleRepository.listByTenant(null);
  }

  @Post(":id/resend-invitation")
  @RequirePermissions("admin-users.manage")
  @ApiOperation({ summary: "Renvoyer le lien d'activation (ADM-06)" })
  async resendInvitation(@Param("id") id: string) {
    await this.resendInvitationUseCase.execute(id);
    return { id, invitationResent: true };
  }

  @Post(":id/suspend")
  @RequirePermissions("admin-users.manage")
  @ApiOperation({ summary: "Révoquer l'accès (ADM-06)" })
  async suspend(@Param("id") id: string) {
    await this.manageUserStatusUseCase.suspend(id);
    return { id, status: "SUSPENDED" };
  }

  @Post(":id/reactivate")
  @RequirePermissions("admin-users.manage")
  @ApiOperation({ summary: "Réactiver un compte suspendu (ADM-06)" })
  async reactivate(@Param("id") id: string) {
    await this.manageUserStatusUseCase.reactivate(id);
    return { id, status: "ACTIVE" };
  }

  @Post(":id/deactivate")
  @RequirePermissions("admin-users.manage")
  @ApiOperation({ summary: "Désactiver définitivement un compte (ADM-06)" })
  async deactivate(@Param("id") id: string) {
    await this.manageUserStatusUseCase.deactivate(id);
    return { id, status: "DEACTIVATED" };
  }

  @Put(":id/roles")
  @RequirePermissions("admin-users.manage")
  @ApiOperation({ summary: "Modifier les rôles d'un compte admin" })
  async assignRoles(@Param("id") id: string, @Body() dto: AssignRolesDto) {
    await this.assignRolesUseCase.execute(id, dto.roleIds);
    return { id, roleIds: dto.roleIds };
  }
}

/** Activation de compte — route publique, utilisée depuis le lien reçu par e-mail. */
@ApiTags("Auth")
@Controller("auth")
export class AccountActivationController {
  constructor(private readonly activateAccountUseCase: ActivateAccountUseCase) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("activate")
  @ApiOperation({ summary: "Activer un compte via le lien reçu par e-mail (ADM-05)" })
  async activate(@Body() dto: ActivateAccountDto) {
    await this.activateAccountUseCase.execute({ token: dto.token, password: dto.password });
    return { activated: true };
  }
}
