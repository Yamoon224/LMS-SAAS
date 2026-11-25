import { LanguagesModule } from "@modules/languages/languages.module";
import { Module } from "@nestjs/common";

import { ActivateAccountUseCase } from "./application/activate-account.use-case";
import { AdminTenantUsersUseCase } from "./application/admin-tenant-users.use-cases";
import { AssertRolesInScopeUseCase } from "./application/assert-roles-in-scope.use-case";
import { AssignRolesUseCase } from "./application/assign-roles.use-case";
import { CreateActiveUserUseCase } from "./application/create-active-user.use-case";
import { FindTenantOwnerUseCase } from "./application/find-tenant-owner.use-case";
import { GetOwnProfileUseCase } from "./application/get-own-profile.use-case";
import { InviteLearnerUseCase } from "./application/invite-learner.use-case";
import { InviteUserUseCase } from "./application/invite-user.use-case";
import { ListTrainersUseCase } from "./application/list-trainers.use-case";
import { ListUsersUseCase } from "./application/list-users.use-case";
import { ManageUserStatusUseCase } from "./application/manage-user-status.use-case";
import { RequestPasswordResetUseCase, ResetPasswordUseCase } from "./application/password-reset.use-cases";
import { ProvisionTenantRolesUseCase } from "./application/provision-tenant-roles.use-case";
import { RegisterLearnerUseCase } from "./application/register-learner.use-case";
import { ResendInvitationUseCase } from "./application/resend-invitation.use-case";
import { UpdateOwnProfileUseCase } from "./application/update-own-profile.use-case";
import { UpdateUserProfileUseCase } from "./application/update-user-profile.use-case";
import { VerifyUserPasswordUseCase } from "./application/verify-user-password.use-case";
import { INVITATION_TOKEN_REPOSITORY } from "./domain/invitation-token.repository.port";
import { PASSWORD_HASH_READER } from "./domain/password-hash-reader.port";
import { ROLE_REPOSITORY } from "./domain/role.repository.port";
import { USER_REPOSITORY } from "./domain/user.repository.port";
import { InvitationTokenPrismaRepository } from "./infrastructure/invitation-token.prisma-repository";
import { PasswordHashPrismaReader } from "./infrastructure/password-hash.prisma-reader";
import { RolePrismaRepository } from "./infrastructure/role.prisma-repository";
import { UserPrismaRepository } from "./infrastructure/user.prisma-repository";
import { AdminTenantUsersController } from "./presentation/admin-tenant-users.controller";
import {
  AccountActivationController,
  AdminUsersController,
} from "./presentation/admin-users.controller";
import { BusinessUsersController } from "./presentation/business-users.controller";
import { PasswordResetController } from "./presentation/password-reset.controller";
import { PublicAccountController } from "./presentation/public-account.controller";
import { PublicAuthController } from "./presentation/public-auth.controller";
import { UsersFacade } from "./users.facade";

@Module({
  imports: [LanguagesModule],
  controllers: [
    AdminUsersController,
    AdminTenantUsersController,
    BusinessUsersController,
    AccountActivationController,
    PublicAuthController,
    PublicAccountController,
    PasswordResetController,
  ],
  providers: [
    InviteUserUseCase,
    CreateActiveUserUseCase,
    InviteLearnerUseCase,
    RegisterLearnerUseCase,
    ListTrainersUseCase,
    ActivateAccountUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    ResendInvitationUseCase,
    ManageUserStatusUseCase,
    AdminTenantUsersUseCase,
    AssertRolesInScopeUseCase,
    AssignRolesUseCase,
    UpdateUserProfileUseCase,
    UpdateOwnProfileUseCase,
    GetOwnProfileUseCase,
    ListUsersUseCase,
    ProvisionTenantRolesUseCase,
    FindTenantOwnerUseCase,
    VerifyUserPasswordUseCase,
    UsersFacade,
    { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
    { provide: PASSWORD_HASH_READER, useClass: PasswordHashPrismaReader },
    { provide: INVITATION_TOKEN_REPOSITORY, useClass: InvitationTokenPrismaRepository },
    { provide: ROLE_REPOSITORY, useClass: RolePrismaRepository },
  ],
  exports: [UsersFacade],
})
export class UsersModule {}
