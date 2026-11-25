import { Inject, Injectable } from "@nestjs/common";

import { CREDIT_WALLET_REPOSITORY } from "../domain/credit-wallet.repository.port";
import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";

@Injectable()
export class GetWalletBalanceUseCase {
  constructor(
    @Inject(CREDIT_WALLET_REPOSITORY) private readonly walletRepository: CreditWalletRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<number> {
    const wallet = await this.walletRepository.findByTenantId(tenantId);
    return wallet?.balance ?? 0;
  }
}
