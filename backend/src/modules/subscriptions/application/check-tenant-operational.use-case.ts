import { Inject, Injectable } from "@nestjs/common";

import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";

/** BE-02 / RG-01: utilisé par le subscription guard sur chaque requête métier entreprise/apprenant. */
@Injectable()
export class CheckTenantOperationalUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveForTenant(tenantId);
    return subscription?.isOperational() ?? false;
  }
}
