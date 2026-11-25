import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { InvalidTenantSettingsError } from "../domain/tenant-settings";
import { TENANT_REPOSITORY } from "../domain/tenant.repository.port";
import type { TenantRepositoryPort } from "../domain/tenant.repository.port";
import { TenantSettingsChangedEvent } from "../tenants.events";

import { toPayoutAccountView } from "./tenant-settings.use-cases";
import type { PayoutAccountView } from "./tenant-settings.use-cases";

export interface AdminPayoutAccountView {
  account: PayoutAccountView | null;
  verified: boolean;
}

/** ENT-11 côté Admin : consultation masquée du compte de reversement d'une entreprise. */
@Injectable()
export class GetTenantPayoutAccountUseCase {
  constructor(@Inject(TENANT_REPOSITORY) private readonly repository: TenantRepositoryPort) {}

  async execute(tenantId: string): Promise<AdminPayoutAccountView> {
    const settings = await this.repository.findSettings(tenantId);
    if (!settings) throw new NotFoundDomainError("Entreprise introuvable.");
    const account = toPayoutAccountView(settings.payoutAccount);
    return { account, verified: account !== null && settings.payoutAccountVerified };
  }
}

/** Vérification du compte par un administrateur : prérequis des reversements (RG-23). */
@Injectable()
export class VerifyTenantPayoutAccountUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly repository: TenantRepositoryPort,
    private readonly events: EventEmitter2,
  ) {}

  async execute(tenantId: string, actorId: string): Promise<AdminPayoutAccountView> {
    const settings = await this.repository.findSettings(tenantId);
    if (!settings) throw new NotFoundDomainError("Entreprise introuvable.");
    const account = toPayoutAccountView(settings.payoutAccount);
    if (!account) throw new InvalidTenantSettingsError("Cette entreprise n'a renseigné aucun compte de reversement.");
    if (!settings.payoutAccountVerified) {
      await this.repository.updateSettings(tenantId, { payoutAccountVerified: true });
      this.events.emit("tenant.settings-changed", new TenantSettingsChangedEvent(tenantId, actorId, ["payoutAccountVerified"]));
    }
    return { account, verified: true };
  }
}
