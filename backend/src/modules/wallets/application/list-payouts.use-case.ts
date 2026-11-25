import { Inject, Injectable } from "@nestjs/common";

import type { Payout } from "../domain/payout.entity";
import { PAYOUT_REPOSITORY } from "../domain/payout.repository.port";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";

/** ADM-24: file des reversements par statut. */
@Injectable()
export class ListPayoutsUseCase {
  constructor(@Inject(PAYOUT_REPOSITORY) private readonly payoutRepository: PayoutRepositoryPort) {}

  async execute(status: string): Promise<Payout[]> {
    return this.payoutRepository.listByStatus(status);
  }

  /** ENT-69: historique des reversements du tenant appelant uniquement. */
  async listForTenant(tenantId: string): Promise<Payout[]> {
    return this.payoutRepository.listByTenant(tenantId);
  }
}
