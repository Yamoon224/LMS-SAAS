import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { TransitionLiveSessionStatusesUseCase } from "./application/transition-live-session-statuses.use-case";

/** BE: fait avancer les statuts des sessions live selon l'horloge serveur. */
@Injectable()
export class LiveSessionsScheduler {
  constructor(
    private readonly transitionLiveSessionStatusesUseCase: TransitionLiveSessionStatusesUseCase,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async transitionStatuses(): Promise<void> {
    await this.transitionLiveSessionStatusesUseCase.execute();
  }
}
