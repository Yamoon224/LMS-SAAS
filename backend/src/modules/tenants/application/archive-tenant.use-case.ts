import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { TENANT_REPOSITORY } from "../domain/tenant.repository.port";
import type { TenantRepositoryPort } from "../domain/tenant.repository.port";
import { TenantArchivedEvent } from "../tenants.events";

/**
 * ADM-08 : archivage d'une entreprise (ACTIVE ou SUSPENDED -> ARCHIVED, état terminal : aucune sortie). Depuis les
 * autres statuts, l'entité lève TRANSITION_INVALIDE (409). Les données sont conservées (rien n'est supprimé).
 */
@Injectable()
export class ArchiveTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(tenantId: string, actorId: string | null): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundDomainError(`Entreprise introuvable: ${tenantId}`);
    }

    const { status } = tenant.archive();
    await this.tenantRepository.updateStatus(tenantId, status);

    this.eventEmitter.emit("tenant.archived", new TenantArchivedEvent(tenantId, actorId));
  }
}
