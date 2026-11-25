import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError } from "@shared/errors/domain-error";

import { Slug } from "../domain/slug.vo";
import type { Tenant } from "../domain/tenant.entity";
import { TENANT_REPOSITORY } from "../domain/tenant.repository.port";
import type { TenantRepositoryPort } from "../domain/tenant.repository.port";
import { TenantCreatedEvent } from "../tenants.events";

export class SlugAlreadyTakenError extends DomainError {
  readonly code = "SLUG_DEJA_UTILISE";
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  country: string;
  currency: string;
  defaultLocale: string;
  owner: {
    email: string;
    firstName: string;
    lastName: string;
    /** Optionnel : si fourni, le compte Propriétaire est créé actif (pas d'invitation). */
    password?: string;
  };
}

/**
 * ADM-04 + ADM-05: création d'une entreprise par l'Admin, suivie
 * immédiatement du provisionnement des rôles par défaut et de la création
 * du compte Propriétaire (qui reçoit son lien d'activation). Les deux
 * actions du cahier des charges sont enchaînées dans un seul appel pour
 * qu'une entreprise créée soit toujours immédiatement utilisable.
 */
@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepositoryPort,
    private readonly usersFacade: UsersFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: CreateTenantInput): Promise<Tenant> {
    const slug = Slug.create(input.slug);

    const alreadyExists = await this.tenantRepository.existsBySlug(slug.toString());
    if (alreadyExists) {
      throw new SlugAlreadyTakenError(`Le slug "${slug.toString()}" est déjà utilisé.`);
    }

    const tenant = await this.tenantRepository.create({
      name: input.name,
      slug: slug.toString(),
      country: input.country,
      currency: input.currency,
      defaultLocale: input.defaultLocale,
    });

    await this.usersFacade.setUpTenantOwner({
      tenantId: tenant.id,
      email: input.owner.email,
      firstName: input.owner.firstName,
      lastName: input.owner.lastName,
      password: input.owner.password || undefined,
    });

    this.eventEmitter.emit("tenant.created", new TenantCreatedEvent(tenant.id, tenant.slug));

    return tenant;
  }
}
