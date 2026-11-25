import { Body, Controller, Get, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { AssertRolesInScopeUseCase } from "../application/assert-roles-in-scope.use-case";
import { AssignRolesUseCase } from "../application/assign-roles.use-case";
import { InviteLearnerUseCase } from "../application/invite-learner.use-case";
import { InviteUserUseCase } from "../application/invite-user.use-case";
import { ListTrainersUseCase } from "../application/list-trainers.use-case";
import { ListUsersUseCase } from "../application/list-users.use-case";
import { ManageUserStatusUseCase } from "../application/manage-user-status.use-case";
import { ResendInvitationUseCase } from "../application/resend-invitation.use-case";
import { TENANT_LEARNER_ROLE_NAME } from "../domain/default-tenant-roles";
import { ROLE_REPOSITORY } from "../domain/role.repository.port";
import type { RoleRepositoryPort } from "../domain/role.repository.port";

import { AssignRolesDto } from "./dto/assign-roles.dto";
import { InviteLearnerDto } from "./dto/invite-learner.dto";
import { InviteUserDto } from "./dto/invite-user.dto";

/** ENT-10: invitation de gestionnaires et formateurs, attribution des rôles, désactivation. */
@ApiTags("Entreprise / Utilisateurs internes")
@Controller("business/users")
export class BusinessUsersController {
  constructor(
    private readonly inviteUserUseCase: InviteUserUseCase,
    private readonly resendInvitationUseCase: ResendInvitationUseCase,
    private readonly manageUserStatusUseCase: ManageUserStatusUseCase,
    private readonly assignRolesUseCase: AssignRolesUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly assertRolesInScopeUseCase: AssertRolesInScopeUseCase,
    private readonly listTrainersUseCase: ListTrainersUseCase,
    private readonly inviteLearnerUseCase: InviteLearnerUseCase,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepositoryPort,
  ) {}

  @Post()
  @RequirePermissions("business-users.manage")
  @ApiOperation({ summary: "Inviter un gestionnaire ou formateur (ENT-10)" })
  async invite(@CurrentTenant() tenantId: string, @Body() dto: InviteUserDto) {
    await this.assertRolesInScopeUseCase.execute(dto.roleIds, tenantId);
    const { user } = await this.inviteUserUseCase.execute({
      tenantId,
      type: "COMPANY_USER",
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      locale: dto.locale,
      roleIds: dto.roleIds,
    });
    return { id: user.id, status: user.status };
  }

  @Post("learners")
  @RequirePermissions("learners.manage")
  @ApiOperation({
    summary: "Inviter un apprenant (compte LEARNER, rôle « Apprenant » uniquement, lien d'activation par e-mail)",
  })
  async inviteLearner(@CurrentTenant() tenantId: string, @Body() dto: InviteLearnerDto) {
    const { user } = await this.inviteLearnerUseCase.execute({
      tenantId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      locale: dto.locale ?? "fr",
    });
    return { id: user.id, status: user.status };
  }

  @Get()
  @RequirePermissions("business-users.manage")
  @ApiOperation({ summary: "Lister les utilisateurs internes de l'entreprise (ENT-10)" })
  async list(@CurrentTenant() tenantId: string) {
    const users = await this.listUsersUseCase.execute(tenantId);
    // Les comptes apprenants (LEARNER) relèvent de la gestion des inscrits, pas des utilisateurs internes.
    return users
      .filter((user) => user.type === "COMPANY_USER")
      .map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roleIds: [...user.roleIds],
    }));
  }

  @Get("trainers")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Formateurs actifs de l'entreprise (sélecteur de formateur, id + nom uniquement)" })
  async listTrainers(@CurrentTenant() tenantId: string) {
    return this.listTrainersUseCase.execute(tenantId);
  }

  @Get("roles")
  @RequirePermissions("business-users.manage")
  @ApiOperation({ summary: "Lister les rôles de l'entreprise (formulaire d'invitation, ENT-10)" })
  async listRoles(@CurrentTenant() tenantId: string) {
    const roles = await this.roleRepository.listByTenant(tenantId);
    // Le rôle « Apprenant » est réservé aux comptes apprenants : jamais proposé pour un utilisateur interne.
    return roles
      .filter((role) => role.name !== TENANT_LEARNER_ROLE_NAME)
      .map((role) => ({ id: role.id, name: role.name }));
  }

  @Post(":id/resend-invitation")
  @RequirePermissions("business-users.manage")
  @ApiOperation({ summary: "Renvoyer le lien d'activation" })
  async resendInvitation(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    await this.resendInvitationUseCase.execute(id, tenantId);
    return { id, invitationResent: true };
  }

  @Post(":id/suspend")
  @RequirePermissions("business-users.manage")
  @ApiOperation({ summary: "Désactiver un utilisateur interne (ENT-10)" })
  async suspend(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.manageUserStatusUseCase.suspend(id, tenantId, actor.userId);
    return { id, status: "SUSPENDED" };
  }

  @Post(":id/reactivate")
  @RequirePermissions("business-users.manage")
  @ApiOperation({ summary: "Réactiver un utilisateur interne suspendu (ENT-10)" })
  async reactivate(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    await this.manageUserStatusUseCase.reactivate(id, tenantId);
    return { id, status: "ACTIVE" };
  }

  @Post(":id/deactivate")
  @RequirePermissions("business-users.manage")
  @ApiOperation({ summary: "Désactiver définitivement un utilisateur interne (ENT-10)" })
  async deactivate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.manageUserStatusUseCase.deactivate(id, tenantId, actor.userId);
    return { id, status: "DEACTIVATED" };
  }

  @Put(":id/roles")
  @RequirePermissions("business-users.manage")
  @ApiOperation({ summary: "Modifier les rôles d'un utilisateur interne (ENT-10)" })
  async assignRoles(@CurrentTenant() tenantId: string, @Param("id") id: string, @Body() dto: AssignRolesDto) {
    await this.assignRolesUseCase.execute(id, dto.roleIds, tenantId);
    return { id, roleIds: dto.roleIds };
  }
}
