import { Inject, Injectable } from "@nestjs/common";

import { TENANT_OWNER_ROLE_NAME } from "../domain/default-tenant-roles";
import { ROLE_REPOSITORY } from "../domain/role.repository.port";
import type { RoleRepositoryPort } from "../domain/role.repository.port";
import type { User } from "../domain/user.entity";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";

/**
 * Résout l'utilisateur Propriétaire d'un tenant — destinataire des
 * notifications d'entreprise (rappels d'abonnement, reversements exécutés,
 * paiements échoués) quand aucun utilisateur précis n'est concerné.
 */
@Injectable()
export class FindTenantOwnerUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<User | null> {
    const ownerRole = await this.roleRepository.findByTenantAndName(tenantId, TENANT_OWNER_ROLE_NAME);
    if (!ownerRole) return null;

    const users = await this.userRepository.listByTenant(tenantId);
    return users.find((user) => user.roleIds.includes(ownerRole.id)) ?? null;
  }
}
