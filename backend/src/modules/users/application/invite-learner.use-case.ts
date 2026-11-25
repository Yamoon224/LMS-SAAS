import { Inject, Injectable } from "@nestjs/common";

import { LEARNER_PERMISSION_CODES, TENANT_LEARNER_ROLE_NAME } from "../domain/default-tenant-roles";
import { ROLE_REPOSITORY } from "../domain/role.repository.port";
import type { RoleRepositoryPort } from "../domain/role.repository.port";

import { InviteUserUseCase } from "./invite-user.use-case";
import type { InviteUserResult } from "./invite-user.use-case";

export interface InviteLearnerInput {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  locale: string;
}

/**
 * Crée un compte apprenant (type LEARNER, statut INVITED) rattaché au rôle par défaut « Apprenant »
 * du tenant — jamais un autre rôle, donc aucune élévation de privilèges possible par cette voie.
 * Le compte suit le flux d'activation existant (UserInvitedEvent -> e-mail -> POST /auth/activate).
 */
@Injectable()
export class InviteLearnerUseCase {
  constructor(
    private readonly inviteUserUseCase: InviteUserUseCase,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepositoryPort,
  ) {}

  async execute(input: InviteLearnerInput): Promise<InviteUserResult> {
    const learnerRoleId = await this.resolveLearnerRoleId(input.tenantId);
    return this.inviteUserUseCase.execute({
      tenantId: input.tenantId,
      type: "LEARNER",
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      locale: input.locale,
      roleIds: [learnerRoleId],
    });
  }

  /** Auto-réparation : un tenant antérieur au rôle « Apprenant » le reçoit à la première inscription. */
  private async resolveLearnerRoleId(tenantId: string): Promise<string> {
    const existing = await this.roleRepository.findByTenantAndName(tenantId, TENANT_LEARNER_ROLE_NAME);
    if (existing) return existing.id;
    try {
      const created = await this.roleRepository.create({
        tenantId,
        name: TENANT_LEARNER_ROLE_NAME,
        isDefault: true,
        permissionCodes: [...LEARNER_PERMISSION_CODES],
      });
      return created.id;
    } catch (error) {
      // Course concurrente (clé unique tenant+nom): relire le rôle créé par l'autre requête.
      const raced = await this.roleRepository.findByTenantAndName(tenantId, TENANT_LEARNER_ROLE_NAME);
      if (raced) return raced.id;
      throw error;
    }
  }
}
