import { PlansFacade } from "@modules/plans/plans.facade";
import { SubscriptionActivatedEvent } from "@modules/subscriptions/subscriptions.events";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { CreditLedgerType } from "../domain/credit-ledger-type";
import { CREDIT_WALLET_REPOSITORY } from "../domain/credit-wallet.repository.port";
import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";

/**
 * ADM-14: certains plans incluent un volume de crédits IA
 * (features.aiTranslationCreditsIncluded), accordé à chaque activation
 * d'abonnement (souscription initiale ou renouvellement).
 */
@Injectable()
export class GrantPlanCreditsOnSubscriptionActivatedListener {
  private readonly logger = new Logger(GrantPlanCreditsOnSubscriptionActivatedListener.name);

  constructor(
    @Inject(CREDIT_WALLET_REPOSITORY) private readonly walletRepository: CreditWalletRepositoryPort,
    private readonly plansFacade: PlansFacade,
  ) {}

  @OnEvent("subscription.activated")
  async handle(event: SubscriptionActivatedEvent): Promise<void> {
    const features = await this.plansFacade.getFeatures(event.tenantId);
    const creditsIncluded = features.aiTranslationCreditsIncluded ?? 0;
    if (creditsIncluded <= 0) {
      return;
    }

    const wallet =
      (await this.walletRepository.findByTenantId(event.tenantId)) ??
      (await this.walletRepository.createForTenant(event.tenantId));

    wallet.credit(creditsIncluded);
    await this.walletRepository.save(wallet);
    await this.walletRepository.recordLedgerEntry({
      walletId: wallet.id,
      type: CreditLedgerType.PLAN_GRANT,
      amount: creditsIncluded,
      note: "Crédits inclus au plan, accordés à l'activation de l'abonnement",
    });

    this.logger.log(`Crédits IA accordés par le plan au tenant ${event.tenantId}: +${creditsIncluded}`);
  }
}
