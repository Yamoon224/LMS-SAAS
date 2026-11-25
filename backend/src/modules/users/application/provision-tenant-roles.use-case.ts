import { Inject, Injectable } from "@nestjs/common";

import { DEFAULT_TENANT_ROLES, TENANT_OWNER_ROLE_NAME } from "../domain/default-tenant-roles";
import { ROLE_REPOSITORY } from "../domain/role.repository.port";
import type { RoleRecord, RoleRepositoryPort } from "../domain/role.repository.port";

/**
 * ADM-04/ADM-05: provisionne les rôles entreprise par défaut (Propriétaire, Apprenant,
 * Gestionnaire, Formateur) à la création d'un tenant, et retourne
 * l'identifiant du rôle Propriétaire pour l'invitation du premier utilisateur.
 */
@Injectable()
export class ProvisionTenantRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepositoryPort) {}

  async execute(tenantId: string): Promise<{ ownerRoleId: string }> {
    const created: RoleRecord[] = [];
    for (const definition of DEFAULT_TENANT_ROLES) {
      const role = await this.roleRepository.create({
        tenantId,
        name: definition.name,
        isDefault: true,
        permissionCodes: definition.permissionCodes,
      });
      created.push(role);
    }

    const ownerRole = created.find((role) => role.name === TENANT_OWNER_ROLE_NAME);
    if (!ownerRole) {
      // Ne devrait jamais arriver: TENANT_OWNER_ROLE_NAME fait partie de DEFAULT_TENANT_ROLES.
      throw new Error("Le rôle Propriétaire n'a pas pu être provisionné.");
    }

    return { ownerRoleId: ownerRole.id };
  }
}
