import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { ROLE_REPOSITORY } from "../domain/role.repository.port";
import type { RoleRepositoryPort } from "../domain/role.repository.port";

/**
 * Anti-escalade de privilèges: les rôles fournis par le client doivent tous
 * exister ET appartenir à la même portée que le compte visé (`tenantId` du
 * tenant, ou `null` pour la plateforme). Sans cela, un gestionnaire d'entreprise
 * pourrait s'attribuer un rôle plateforme (ou celui d'un autre tenant) en
 * fournissant son identifiant. Rôle inconnu ou hors portée: même 404.
 */
@Injectable()
export class AssertRolesInScopeUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepositoryPort) {}

  async execute(roleIds: string[], tenantId: string | null): Promise<void> {
    const uniqueIds = [...new Set(roleIds)];
    const roles = await this.roleRepository.findByIds(uniqueIds);
    const inScope = roles.filter((role) => role.tenantId === tenantId);
    if (inScope.length !== uniqueIds.length) {
      throw new NotFoundDomainError("Rôle introuvable.");
    }
  }
}
