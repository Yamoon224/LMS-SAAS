import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { LEDGER_REPOSITORY } from "../domain/ledger.repository.port";
import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { PAYOUT_REPOSITORY } from "../domain/payout.repository.port";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";
import { buildPayoutLedgerEntries } from "../domain/refund-ledger-entries";
import { PayoutExecutedEvent } from "../wallets.events";

/**
 * ADM-24: "double validation (opérateur puis finance), puis exécution par
 * virement bancaire ou mobile money, manuellement avec preuve jointe ou via
 * l'API de transfert du fournisseur." L'entité Payout porte déjà la règle
 * des "quatre yeux" (approve() refuse le même utilisateur que validate()).
 */
@Injectable()
export class ProcessPayoutUseCase {
  constructor(
    @Inject(PAYOUT_REPOSITORY) private readonly payoutRepository: PayoutRepositoryPort,
    @Inject(LEDGER_REPOSITORY) private readonly ledgerRepository: LedgerRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async validate(payoutId: string, operatorUserId: string): Promise<void> {
    const payout = await this.getPayoutOrThrow(payoutId);
    payout.validate(operatorUserId);
    await this.payoutRepository.save(payout);
  }

  async approve(payoutId: string, financeUserId: string): Promise<void> {
    const payout = await this.getPayoutOrThrow(payoutId);
    payout.approve(financeUserId);
    await this.payoutRepository.save(payout);
  }

  async execute(payoutId: string, proofUrl: string): Promise<void> {
    const payout = await this.getPayoutOrThrow(payoutId);
    payout.execute(proofUrl);
    await this.payoutRepository.save(payout);

    const entries = buildPayoutLedgerEntries({ amount: payout.amount });
    await this.ledgerRepository.record({
      tenantId: payout.tenantId,
      currency: "XOF",
      sourceId: payout.id,
      availableAt: new Date(),
      entries,
    });

    this.eventEmitter.emit("payout.executed", new PayoutExecutedEvent(payout.id, payout.tenantId));
  }

  async reject(payoutId: string, reason: string): Promise<void> {
    const payout = await this.getPayoutOrThrow(payoutId);
    payout.reject(reason);
    await this.payoutRepository.save(payout);
  }

  private async getPayoutOrThrow(payoutId: string) {
    const payout = await this.payoutRepository.findById(payoutId);
    if (!payout) {
      throw new NotFoundDomainError(`Reversement introuvable: ${payoutId}`);
    }
    return payout;
  }
}
