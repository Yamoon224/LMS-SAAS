import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { WebhookEventLogPort, WebhookEventRecord, WebhookOutcome } from "../domain/webhook-event-log.port";

@Injectable()
export class WebhookEventLogPrismaRepository implements WebhookEventLogPort {
  constructor(private readonly prisma: PrismaService) {}

  async record(providerCode: string, outcome: WebhookOutcome, providerReference?: string): Promise<void> {
    await this.prisma.webhookEvent.create({ data: { providerCode, outcome, providerReference: providerReference ?? null } });
  }

  async findById(id: string): Promise<WebhookEventRecord | null> {
    return this.prisma.webhookEvent.findUnique({ where: { id } });
  }

  async listUnresolvedFailures(limit: number): Promise<WebhookEventRecord[]> {
    return this.prisma.webhookEvent.findMany({
      where: { outcome: { in: ["ERROR", "UNKNOWN_REFERENCE"] }, resolvedAt: null },
      orderBy: { receivedAt: "desc" },
      take: limit,
    });
  }

  async markResolved(id: string): Promise<void> {
    await this.prisma.webhookEvent.updateMany({ where: { id, resolvedAt: null }, data: { resolvedAt: new Date() } });
  }
}
