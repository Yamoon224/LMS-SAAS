import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { TENANT_REPOSITORY } from "../domain/tenant.repository.port";
import type { TenantRepositoryPort } from "../domain/tenant.repository.port";
import { TenantSuspendedEvent } from "../tenants.events";

@Injectable()
export class SuspendTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(tenantId: string, reason: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundDomainError(`Entreprise introuvable: ${tenantId}`);
    }

    const { status, statusReason } = tenant.suspend(reason);
    await this.tenantRepository.updateStatus(tenantId, status, statusReason);

    this.eventEmitter.emit("tenant.suspended", new TenantSuspendedEvent(tenantId));
  }
}
