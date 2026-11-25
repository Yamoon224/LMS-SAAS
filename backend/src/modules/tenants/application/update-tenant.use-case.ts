import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { Tenant } from "../domain/tenant.entity";
import { TENANT_REPOSITORY } from "../domain/tenant.repository.port";
import type { TenantRepositoryPort } from "../domain/tenant.repository.port";

export interface UpdateTenantInput {
  name?: string;
  country?: string;
  currency?: string;
  defaultLocale?: string;
  /** Chaîne vide = effacer. */
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * ADM-10 : modification des informations d'une entreprise par l'Admin plateforme. Le sous-domaine (slug) n'est
 * jamais modifiable : il identifie l'entreprise dans toutes ses adresses et ses liens déjà envoyés.
 */
@Injectable()
export class UpdateTenantUseCase {
  constructor(@Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepositoryPort) {}

  async execute(tenantId: string, input: UpdateTenantInput): Promise<Tenant> {
    const existing = await this.tenantRepository.findById(tenantId);
    if (!existing) {
      throw new NotFoundDomainError(`Entreprise introuvable: ${tenantId}`);
    }

    await this.tenantRepository.updateSettings(tenantId, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.country !== undefined ? { country: input.country.toUpperCase() } : {}),
      ...(input.currency !== undefined ? { currency: input.currency.toUpperCase() } : {}),
      ...(input.defaultLocale !== undefined ? { defaultLocale: input.defaultLocale } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail.trim() || null } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone.trim() || null } : {}),
    });

    const updated = await this.tenantRepository.findById(tenantId);
    if (!updated) {
      throw new NotFoundDomainError(`Entreprise introuvable: ${tenantId}`);
    }
    return updated;
  }
}
