import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { PurgeExpiredPersonalDataUseCase } from "./application/purge-expired-personal-data.use-case";

/** Section 11 : purge quotidienne (nuit) selon la politique de conservation. */
@Injectable()
export class PrivacyScheduler {
  private readonly logger = new Logger(PrivacyScheduler.name);

  constructor(private readonly purgeExpiredPersonalData: PurgeExpiredPersonalDataUseCase) {}

  @Cron("30 3 * * *")
  async purge(): Promise<void> {
    try {
      await this.purgeExpiredPersonalData.execute();
    } catch (error) {
      this.logger.error(`Purge de conservation en échec : ${String(error)}`);
    }
  }
}
