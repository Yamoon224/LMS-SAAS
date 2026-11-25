import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { Subscription } from "../domain/subscription.entity";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.port";
import type { SubscriptionRepositoryPort } from "../domain/subscription.repository.port";

/**
 * ENT-07: jauges d'usage du plan courant. Expose l'abonnement actif ; le
 * détail des quotas/usage par nom est calculé par PlansFacade.checkQuota
 * (module plans), appelé séparément par la présentation pour chaque quota
 * à afficher plutôt que dupliqué ici.
 */
@Injectable()
export class GetSubscriptionUsageUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: SubscriptionRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findActiveForTenant(tenantId);
    if (!subscription) {
      throw new NotFoundDomainError(`Aucun abonnement actif pour l'entreprise: ${tenantId}`);
    }
    return subscription;
  }
}
