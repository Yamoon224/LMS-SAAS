import { Inject, Injectable } from "@nestjs/common";

import { TENANT_INSTRUCTOR_ROLE_NAME } from "../domain/default-tenant-roles";
import { ROLE_REPOSITORY } from "../domain/role.repository.port";
import type { RoleRepositoryPort } from "../domain/role.repository.port";
import { UserStatus } from "../domain/user-status";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";

export interface TrainerSummary {
  id: string;
  fullName: string;
}

/**
 * Formateurs actifs d'un tenant (sélecteur « formateur » d'une formation) : utilisateurs
 * titulaires du rôle par défaut « Formateur / Concepteur » du tenant, identifié par sa constante
 * de nom (jamais par préfixe de chaîne). Ne renvoie que id + nom complet.
 */
@Injectable()
export class ListTrainersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<TrainerSummary[]> {
    const role = await this.roleRepository.findByTenantAndName(tenantId, TENANT_INSTRUCTOR_ROLE_NAME);
    if (!role) return [];
    const users = await this.userRepository.listByTenant(tenantId);
    return users
      .filter((user) => user.type === "COMPANY_USER" && user.status === UserStatus.ACTIVE && user.roleIds.includes(role.id))
      .map((user) => ({ id: user.id, fullName: user.fullName }));
  }
}
