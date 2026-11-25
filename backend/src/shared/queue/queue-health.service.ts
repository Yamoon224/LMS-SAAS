import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";

import { QUEUE_NAMES } from "./queue.constants";

export interface SharedQueueStats {
  name: string;
  /** null si la file est injoignable (Redis arrêté). */
  counts: { waiting: number; active: number; delayed: number; failed: number; paused: number } | null;
}

/** Lecture des compteurs des files partagées, pour la santé technique (ADM-35). Ne lève jamais. */
@Injectable()
export class QueueHealthService {
  private readonly queues: Queue[];

  constructor(
    @InjectQueue(QUEUE_NAMES.REMINDERS) reminders: Queue,
    @InjectQueue(QUEUE_NAMES.PDF_GENERATION) pdf: Queue,
    @InjectQueue(QUEUE_NAMES.AI_TRANSLATION) translation: Queue,
  ) {
    this.queues = [reminders, pdf, translation];
  }

  async getAllStats(): Promise<SharedQueueStats[]> {
    return Promise.all(
      this.queues.map(async (queue): Promise<SharedQueueStats> => {
        try {
          const c = await queue.getJobCounts("waiting", "active", "delayed", "failed", "paused");
          return {
            name: queue.name,
            counts: {
              waiting: c.waiting ?? 0,
              active: c.active ?? 0,
              delayed: c.delayed ?? 0,
              failed: c.failed ?? 0,
              paused: c.paused ?? 0,
            },
          };
        } catch {
          return { name: queue.name, counts: null };
        }
      }),
    );
  }
}
