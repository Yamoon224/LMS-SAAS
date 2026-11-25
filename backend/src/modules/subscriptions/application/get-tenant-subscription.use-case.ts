import { Inject, Injectable } from "@nestjs/common";

import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type {
  SubscriptionRepositoryPort,
  SubscriptionWithPlanDetails,
} from "../domain/subscription.repository.port";

/**
 * ADM-09: lecture admin de l'abonnement courant (le plus récent) d'une
 * entreprise, enrichi du plan et du prix associés. Ne fait qu'exposer en
 * lecture ce que SubscriptionRepositoryPort peut déjà retrouver — aucune
 * règle métier nouvelle.
 */
@Injectable()
export class GetTenantSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<SubscriptionWithPlanDetails | null> {
    return this.subscriptionRepository.findLatestForTenantWithPlanDetails(tenantId);
  }
}
