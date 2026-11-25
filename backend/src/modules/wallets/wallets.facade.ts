import { Injectable } from "@nestjs/common";

import { GetPayoutUseCase } from "./application/get-payout.use-case";
import { GetTenantBalanceUseCase } from "./application/get-tenant-balance.use-case";
import { RecordOfflineSaleCommissionUseCase } from "./application/record-offline-sale-commission.use-case";
import type { RecordOfflineSaleInput } from "./application/record-offline-sale-commission.use-case";
import type { Payout } from "./domain/payout.entity";
import type { TenantBalance } from "./domain/tenant-balance";

/**
 * Seule API publique du module wallets. Utilisée par enrollments (ADM-25,
 * ENT-61, recordOfflineSaleCommission lors de la validation d'une
 * inscription hors plateforme) et par notifications (détails d'un
 * reversement exécuté, ENT-69).
 */
@Injectable()
export class WalletsFacade {
  constructor(
    private readonly recordOfflineSaleCommissionUseCase: RecordOfflineSaleCommissionUseCase,
    private readonly getTenantBalanceUseCase: GetTenantBalanceUseCase,
    private readonly getPayoutUseCase: GetPayoutUseCase,
  ) {}

  async recordOfflineSaleCommission(input: RecordOfflineSaleInput): Promise<number> {
    return this.recordOfflineSaleCommissionUseCase.execute(input);
  }

  async getTenantBalance(tenantId: string): Promise<TenantBalance> {
    return this.getTenantBalanceUseCase.execute(tenantId);
  }

  async findPayoutById(payoutId: string): Promise<Payout | null> {
    return this.getPayoutUseCase.execute(payoutId);
  }
}
