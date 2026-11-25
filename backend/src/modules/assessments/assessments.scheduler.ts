import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ExpireOverdueAttemptsUseCase } from "./application/expire-overdue-attempts.use-case";

/** BE-12/ENT-36: expire automatiquement les tentatives abandonnées en cours. */
@Injectable()
export class AssessmentsScheduler {
  constructor(private readonly expireOverdueAttemptsUseCase: ExpireOverdueAttemptsUseCase) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async expireOverdueAttempts(): Promise<void> {
    await this.expireOverdueAttemptsUseCase.execute();
  }
}
