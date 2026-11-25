import { Inject, Injectable } from "@nestjs/common";

import type { Payout } from "../domain/payout.entity";
import { PAYOUT_REPOSITORY } from "../domain/payout.repository.port";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";

@Injectable()
export class GetPayoutUseCase {
  constructor(@Inject(PAYOUT_REPOSITORY) private readonly payoutRepository: PayoutRepositoryPort) {}

  async execute(payoutId: string): Promise<Payout | null> {
    return this.payoutRepository.findById(payoutId);
  }
}
