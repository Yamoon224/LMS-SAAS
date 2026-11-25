import { PaymentSucceededEvent } from "@modules/payments/payments.events";
import { PlansFacade } from "@modules/plans/plans.facade";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { CreditLedgerType } from "../domain/credit-ledger-type";
import { CREDIT_WALLET_REPOSITORY } from "../domain/credit-wallet.repository.port";
import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";

/**
 * RG-06 (par analogie): un achat de pack de crédits IA n'est crédité
 * qu'après confirmation ET vérification serveur du paiement — jamais de
 * manière optimiste à l'initiation.
 */
@Injectable()
export class CreditWalletOnPaymentSucceededListener {
  private readonly logger = new Logger(CreditWalletOnPaymentSucceededListener.name);

  constructor(
    @Inject(CREDIT_WALLET_REPOSITORY) private readonly walletRepository: CreditWalletRepositoryPort,
    private readonly plansFacade: PlansFacade,
  ) {}

  @OnEvent("payment.succeeded")
  async handle(event: PaymentSucceededEvent): Promise<void> {
    if (event.payment.type !== "CREDIT_PURCHASE" || !event.payment.creditPackId) {
      return;
    }

    const pack = await this.plansFacade.findCreditPack(event.payment.creditPackId);
    if (!pack) {
      this.logger.error(`Pack de crédits introuvable pour le paiement réussi: ${event.payment.id}`);
      return;
    }

    const wallet =
      (await this.walletRepository.findByTenantId(event.payment.tenantId)) ??
      (await this.walletRepository.createForTenant(event.payment.tenantId));

    wallet.credit(pack.creditsAmount);
    await this.walletRepository.save(wallet);
    await this.walletRepository.recordLedgerEntry({
      walletId: wallet.id,
      type: CreditLedgerType.PURCHASE,
      amount: pack.creditsAmount,
      creditPackId: pack.id,
      note: `Achat du pack "${pack.name}"`,
    });

    this.logger.log(`Crédits IA ajoutés au tenant ${event.payment.tenantId}: +${pack.creditsAmount}`);
  }
}
