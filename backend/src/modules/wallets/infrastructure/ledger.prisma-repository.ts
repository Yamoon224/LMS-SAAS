import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { LedgerRepositoryPort, RecordLedgerEntriesInput } from "../domain/ledger.repository.port";
import type { BreakdownLedgerRow } from "../domain/sales-breakdown";
import type { TenantBalance } from "../domain/tenant-balance";

@Injectable()
export class LedgerPrismaRepository implements LedgerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordLedgerEntriesInput): Promise<void> {
    await this.prisma.ledgerEntry.createMany({
      data: input.entries.map((entry) => ({
        tenantId: input.tenantId,
        account: entry.account,
        direction: entry.direction,
        amount: entry.amount,
        currency: input.currency,
        sourceType: entry.sourceType,
        sourceId: input.sourceId,
        availableAt: input.availableAt,
      })),
    });
  }

  /**
   * ADM-22: solde TENANT = somme des CREDIT − somme des DEBIT, scindée entre
   * en attente (availableAt futur) et disponible (availableAt passé).
   * BE-06: dérivé du grand livre, jamais stocké directement.
   */
  async getTenantBalance(tenantId: string, now: Date = new Date()): Promise<TenantBalance> {
    const [pendingCredits, pendingDebits, availableCredits, availableDebits, payouts] = await Promise.all([
      this.sumTenantEntries(tenantId, "CREDIT", { availableAt: { gt: now } }),
      this.sumTenantEntries(tenantId, "DEBIT", { availableAt: { gt: now } }),
      this.sumTenantEntries(tenantId, "CREDIT", { availableAt: { lte: now } }),
      this.sumTenantEntries(tenantId, "DEBIT", { availableAt: { lte: now }, sourceType: { not: "PAYOUT" } }),
      this.sumTenantEntries(tenantId, "DEBIT", { sourceType: "PAYOUT" }),
    ]);

    return {
      tenantId,
      currency: "XOF",
      pendingAmount: pendingCredits - pendingDebits,
      availableAmount: availableCredits - availableDebits,
      payoutsExecutedAmount: payouts,
    };
  }

  async getProviderNetPosition(providerAccount: "PROVIDER", since: Date, until: Date): Promise<number> {
    const [debits, credits] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { account: providerAccount, direction: "DEBIT", createdAt: { gte: since, lt: until } },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { account: providerAccount, direction: "CREDIT", createdAt: { gte: since, lt: until } },
        _sum: { amount: true },
      }),
    ]);

    return (debits._sum.amount ?? 0) - (credits._sum.amount ?? 0);
  }

  async getTenantNetForSale(sourceId: string): Promise<number | null> {
    const entry = await this.prisma.ledgerEntry.findFirst({
      where: { account: "TENANT", direction: "CREDIT", sourceType: "SALE", sourceId },
    });
    return entry?.amount ?? null;
  }

  async listBreakdownRows(tenantId: string, from: Date | null, to: Date): Promise<BreakdownLedgerRow[]> {
    return this.prisma.ledgerEntry.findMany({
      where: {
        tenantId,
        sourceType: { in: ["SALE", "COMMISSION", "FEE", "REFUND", "OFFLINE_COMMISSION"] },
        availableAt: { ...(from ? { gt: from } : {}), lte: to },
      },
      select: { sourceId: true, account: true, direction: true, sourceType: true, amount: true },
    });
  }

  private async sumTenantEntries(
    tenantId: string,
    direction: "DEBIT" | "CREDIT",
    extraWhere: Record<string, unknown>,
  ): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: { tenantId, account: "TENANT", direction, ...extraWhere },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }
}
