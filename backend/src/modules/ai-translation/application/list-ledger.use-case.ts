import { Inject, Injectable } from "@nestjs/common";

import { CREDIT_WALLET_REPOSITORY } from "../domain/credit-wallet.repository.port";
import type { CreditLedgerEntryRecord } from "../domain/credit-wallet.repository.port";
import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";

/** ADM-18/ENT: historique des mouvements du portefeuille de crédits IA. */
@Injectable()
export class ListLedgerUseCase {
  constructor(
    @Inject(CREDIT_WALLET_REPOSITORY) private readonly walletRepository: CreditWalletRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<CreditLedgerEntryRecord[]> {
    return this.walletRepository.listLedgerForTenant(tenantId);
  }
}
