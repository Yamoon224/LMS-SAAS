import { Inject, Injectable } from "@nestjs/common";

import { LEDGER_REPOSITORY } from "../domain/ledger.repository.port";
import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import type { TenantBalance } from "../domain/tenant-balance";

/** ADM-22/ENT-69: ventes brutes, commissions, frais, solde en attente et disponible. */
@Injectable()
export class GetTenantBalanceUseCase {
  constructor(@Inject(LEDGER_REPOSITORY) private readonly ledgerRepository: LedgerRepositoryPort) {}

  async execute(tenantId: string): Promise<TenantBalance> {
    return this.ledgerRepository.getTenantBalance(tenantId);
  }
}
