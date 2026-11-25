import { Inject, Injectable } from "@nestjs/common";

import type { Transaction } from "../domain/transaction";
import { TRANSACTION_REPOSITORY } from "../domain/transaction.repository.port";
import type { TransactionRepositoryPort } from "../domain/transaction.repository.port";

/** ENT-68 : historique des ventes en ligne et des paiements hors plateforme validés. */
@Injectable()
export class ListTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: TransactionRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<Transaction[]> {
    return this.transactionRepository.listForTenant(tenantId);
  }
}
