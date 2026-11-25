import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";

import { QueueHealthService } from "./queue-health.service";
import { DEFAULT_JOB_OPTIONS, SHARED_QUEUE_NAMES } from "./queue.constants";

/**
 * Infrastructure BullMQ partagée (BE-08) : enregistre les files dédiées avec les options de reprise communes.
 * La connexion Redis vient de `BullModule.forRoot` (app.module). Un module métier qui veut produire ou consommer
 * dans une de ces files n'a rien à importer (module global) : `@InjectQueue(QUEUE_NAMES.X)` et `@Processor(...)`.
 */
@Global()
@Module({
  imports: [
    BullModule.registerQueue(...SHARED_QUEUE_NAMES.map((name) => ({ name, defaultJobOptions: DEFAULT_JOB_OPTIONS }))),
  ],
  providers: [QueueHealthService],
  exports: [BullModule, QueueHealthService],
})
export class QueueModule {}
