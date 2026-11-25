import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";

import { AssertRolesInScopeUseCase } from "./assert-roles-in-scope.use-case";

/** ENT-10: attribution des rôles à un utilisateur interne (Gestionnaire, Formateur...). */
@Injectable()
export class AssignRolesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    private readonly assertRolesInScopeUseCase: AssertRolesInScopeUseCase,
  ) {}

  /**
   * `scopeTenantId`: tenant de l'appelant (routes entreprise) — le compte visé doit en être
   * membre (404 sinon). Omis uniquement par les routes opérateur plateforme.
   * Dans tous les cas, les rôles doivent appartenir à la portée du compte visé.
   */
  async execute(userId: string, roleIds: string[], scopeTenantId?: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || (scopeTenantId !== undefined && user.tenantId !== scopeTenantId)) {
      throw new NotFoundDomainError(`Utilisateur introuvable: ${userId}`);
    }

    await this.assertRolesInScopeUseCase.execute(roleIds, user.tenantId);
    await this.userRepository.assignRoles(userId, roleIds);
  }
}
