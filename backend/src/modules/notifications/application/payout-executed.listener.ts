import { UsersFacade } from "@modules/users/users.facade";
import { PayoutExecutedEvent } from "@modules/wallets/wallets.events";
import { WalletsFacade } from "@modules/wallets/wallets.facade";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** ENT-69/ADM-23: confirme à l'entreprise l'exécution de son reversement. */
@Injectable()
export class PayoutExecutedListener {
  private readonly logger = new Logger(PayoutExecutedListener.name);

  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly usersFacade: UsersFacade,
    private readonly walletsFacade: WalletsFacade,
  ) {}

  @OnEvent("payout.executed")
  async handle(event: PayoutExecutedEvent): Promise<void> {
    const owner = await this.usersFacade.findTenantOwner(event.tenantId);
    if (!owner) {
      this.logger.warn(`Propriétaire introuvable pour le tenant ${event.tenantId}, reversement exécuté.`);
      return;
    }

    const payout = await this.walletsFacade.findPayoutById(event.payoutId);
    if (!payout) {
      this.logger.warn(`Reversement introuvable: ${event.payoutId}`);
      return;
    }

    await this.notifyUserUseCase.execute({
      userId: owner.id,
      templateKey: "payout.executed",
      payload: { amount: payout.amount, currency: payout.currency },
    });
  }
}
