import { Inject, Injectable } from "@nestjs/common";
import type { UserType } from "@shared/domain/user-type";

import { CreateActiveUserUseCase } from "./application/create-active-user.use-case";
import { FindTenantOwnerUseCase } from "./application/find-tenant-owner.use-case";
import { InviteLearnerUseCase } from "./application/invite-learner.use-case";
import type { InviteLearnerInput } from "./application/invite-learner.use-case";
import { InviteUserUseCase } from "./application/invite-user.use-case";
import type { InviteUserResult } from "./application/invite-user.use-case";
import { ProvisionTenantRolesUseCase } from "./application/provision-tenant-roles.use-case";
import { VerifyUserPasswordUseCase } from "./application/verify-user-password.use-case";
import type { User } from "./domain/user.entity";
import { USER_REPOSITORY } from "./domain/user.repository.port";
import type { UserRepositoryPort } from "./domain/user.repository.port";

export interface SetUpTenantOwnerInput {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Optionnel : si fourni, compte créé actif avec ce mot de passe (aucune invitation envoyée). */
  password?: string;
}

/**
 * Seule API publique du module users. Utilisée notamment par TenantsModule
 * pour ADM-04/ADM-05 ("création du compte propriétaire et envoi automatique
 * des accès" juste après la création de l'entreprise).
 */
@Injectable()
export class UsersFacade {
  constructor(
    private readonly inviteUserUseCase: InviteUserUseCase,
    private readonly createActiveUserUseCase: CreateActiveUserUseCase,
    private readonly inviteLearnerUseCase: InviteLearnerUseCase,
    private readonly provisionTenantRolesUseCase: ProvisionTenantRolesUseCase,
    private readonly findTenantOwnerUseCase: FindTenantOwnerUseCase,
    private readonly verifyUserPasswordUseCase: VerifyUserPasswordUseCase,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
  ) {}

  /**
   * ADM-04/ADM-05: provisionne les rôles entreprise par défaut puis crée
   * le premier utilisateur (Propriétaire) avec le rôle correspondant.
   */
  async setUpTenantOwner(input: SetUpTenantOwnerInput): Promise<InviteUserResult | { user: User }> {
    const { ownerRoleId } = await this.provisionTenantRolesUseCase.execute(input.tenantId);

    if (input.password) {
      return this.createActiveUserUseCase.execute({
        tenantId: input.tenantId,
        type: "COMPANY_USER" as UserType,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        locale: "fr",
        roleIds: [ownerRoleId],
        password: input.password,
      });
    }

    return this.inviteUserUseCase.execute({
      tenantId: input.tenantId,
      type: "COMPANY_USER" as UserType,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      locale: "fr",
      roleIds: [ownerRoleId],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  /** Une seule requête pour N utilisateurs (enrichissement de listes) ; ids inconnus absents du résultat. */
  async findManyByIds(ids: string[]): Promise<User[]> {
    return this.userRepository.findManyByIds(ids);
  }

  /** Ré-authentification par mot de passe actuel (actions sensibles) ; `false` si faux ou compte sans mot de passe. */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    return this.verifyUserPasswordUseCase.execute(userId, password);
  }

  /** Destinataire des notifications d'entreprise (rappels, reversements, paiements échoués). */
  async findTenantOwner(tenantId: string): Promise<User | null> {
    return this.findTenantOwnerUseCase.execute(tenantId);
  }

  /** ENT-62: compte apprenant d'un tenant retrouvé par e-mail (null si inconnu). */
  async findByEmailInTenant(tenantId: string, email: string): Promise<User | null> {
    return this.userRepository.findByEmailInTenant(tenantId, email.trim().toLowerCase());
  }

  /** ENT-62: invite un apprenant inconnu (flux d'activation existant : e-mail + lien à durée limitée). */
  async inviteLearner(input: InviteLearnerInput): Promise<User> {
    const { user } = await this.inviteLearnerUseCase.execute(input);
    return user;
  }
}
