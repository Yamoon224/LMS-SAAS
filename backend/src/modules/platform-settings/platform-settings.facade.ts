import { Injectable } from "@nestjs/common";

import { GetFinanceSettingsUseCase } from "./application/finance-settings.use-cases";
import type { FinanceSettings } from "./domain/finance-settings";

export type { FinanceSettings, PayoutFrequency, FeeBearer } from "./domain/finance-settings";

/**
 * Seule API publique du module platform-settings. Utilisée par wallets (rétention, seuil, fréquence de reversement,
 * qui supporte les frais) : lecture à l'usage, jamais copiée au démarrage.
 */
@Injectable()
export class PlatformSettingsFacade {
  constructor(private readonly getFinanceSettingsUseCase: GetFinanceSettingsUseCase) {}

  async getFinanceSettings(): Promise<FinanceSettings> {
    return this.getFinanceSettingsUseCase.execute();
  }
}
