import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { TENANT_REPOSITORY } from "../domain/tenant.repository.port";
import type { TenantRepositoryPort } from "../domain/tenant.repository.port";

/**
 * ADM-04/ADM-08: mise en service d'une entreprise (DRAFT -> ACTIVE) ou levée de suspension
 * (SUSPENDED -> ACTIVE). Sans cette étape, une entreprise créée reste DRAFT et aucune de ses surfaces
 * (back-office, espace apprenant) n'est résolue par le TenantGuard. Les autres statuts lèvent
 * TRANSITION_INVALIDE (409). La suspension se règle toujours via POST :id/suspend.
 */
@Injectable()
export class ActivateTenantUseCase {
  constructor(@Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepositoryPort) {}

  async execute(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundDomainError(`Entreprise introuvable: ${tenantId}`);
    }

    const { status } = tenant.reactivate();
    await this.tenantRepository.updateStatus(tenantId, status);
  }
}
