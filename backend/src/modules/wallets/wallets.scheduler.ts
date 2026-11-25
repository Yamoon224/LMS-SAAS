import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { RunAutomaticPayoutsUseCase } from "./application/run-automatic-payouts.use-case";

/** ADM-23 : passage quotidien à 06:00 ; le cas d'usage décide selon la fréquence configurée s'il génère des demandes. */
@Injectable()
export class WalletsScheduler {
  private readonly logger = new Logger(WalletsScheduler.name);

  constructor(private readonly runAutomaticPayoutsUseCase: RunAutomaticPayoutsUseCase) {}

  @Cron("0 6 * * *")
  async runAutomaticPayouts(): Promise<void> {
    try {
      await this.runAutomaticPayoutsUseCase.execute();
    } catch (error) {
      this.logger.error(`Échec du reversement automatique : ${String(error)}`);
    }
  }
}
