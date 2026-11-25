import { Injectable } from "@nestjs/common";

import { GetWalletBalanceUseCase } from "./application/get-wallet-balance.use-case";

/**
 * Seule API publique du module ai-translation. Aucun module construit à ce
 * stade n'en a encore besoin, mais elle existe par cohérence architecturale
 * (section 13.2) — p. ex. un futur tableau de bord consolidé pourrait vouloir
 * afficher le solde de crédits sans dupliquer la requête.
 */
@Injectable()
export class AiTranslationFacade {
  constructor(private readonly getWalletBalanceUseCase: GetWalletBalanceUseCase) {}

  async getWalletBalance(tenantId: string): Promise<number> {
    return this.getWalletBalanceUseCase.execute(tenantId);
  }
}
