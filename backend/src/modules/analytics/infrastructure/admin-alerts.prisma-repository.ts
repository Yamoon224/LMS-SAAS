import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import {
  AI_ANOMALY_BASELINE_DAYS,
  AI_ANOMALY_MIN_CREDITS,
  AI_ANOMALY_WINDOW_HOURS,
  FAILED_PAYMENTS_WINDOW_DAYS,
  MEDIA_FAILED_WINDOW_DAYS,
  SUBSCRIPTION_EXPIRED_WINDOW_DAYS,
  SUBSCRIPTION_EXPIRY_WINDOW_DAYS,
  WEBHOOK_FAILURES_WINDOW_HOURS,
} from "../domain/admin-alerts";
import type { PendingBucket, RawAdminAlerts, RawAiTenantUsage } from "../domain/admin-alerts";
import type { AdminAlertsRepositoryPort } from "../domain/admin-alerts.repository.port";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Lecture directe des tables Prisma (même précédent documenté que `analytics.prisma-repository.ts`). Uniquement des
 * comptages et agrégats, appuyés par les index existants (`[tenantId, status]`, `[receivedAt]`...) ; aucune écriture.
 */
@Injectable()
export class AdminAlertsPrismaRepository implements AdminAlertsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getRawAlerts(now: Date): Promise<RawAdminAlerts> {
    const [
      failedPayments,
      subscriptionsExpiringSoon,
      subscriptionsInGrace,
      subscriptionsExpiredRecently,
      pendingPayouts,
      pendingRefunds,
      suspendedTenants,
      webhookFailures,
      mediaAnalysisFailed,
      aiUsage,
    ] = await Promise.all([
      this.prisma.payment.count({
        where: { status: "FAILED", createdAt: { gte: new Date(now.getTime() - FAILED_PAYMENTS_WINDOW_DAYS * DAY_MS) } },
      }),
      this.prisma.subscription.count({
        where: {
          status: { in: ["ACTIVE", "TRIALING"] },
          currentPeriodEnd: { gte: now, lte: new Date(now.getTime() + SUBSCRIPTION_EXPIRY_WINDOW_DAYS * DAY_MS) },
        },
      }),
      this.prisma.subscription.count({ where: { status: "GRACE_PERIOD" } }),
      this.prisma.subscription.count({
        where: {
          status: "EXPIRED",
          currentPeriodEnd: { gte: new Date(now.getTime() - SUBSCRIPTION_EXPIRED_WINDOW_DAYS * DAY_MS) },
        },
      }),
      this.pendingPayouts(),
      this.pendingRefunds(),
      this.prisma.tenant.count({ where: { status: "SUSPENDED" } }),
      this.prisma.webhookEvent.count({
        where: {
          outcome: { in: ["ERROR", "UNKNOWN_REFERENCE"] },
          resolvedAt: null,
          receivedAt: { gte: new Date(now.getTime() - WEBHOOK_FAILURES_WINDOW_HOURS * HOUR_MS) },
        },
      }),
      this.prisma.mediaAsset.count({
        where: {
          status: { in: ["FAILED", "REJECTED"] },
          createdAt: { gte: new Date(now.getTime() - MEDIA_FAILED_WINDOW_DAYS * DAY_MS) },
        },
      }),
      this.aiUsage(now),
    ]);

    return {
      failedPayments,
      subscriptionsExpiringSoon,
      subscriptionsInGrace,
      subscriptionsExpiredRecently,
      pendingPayouts,
      pendingRefunds,
      suspendedTenants,
      webhookFailures,
      aiUsage,
      mediaAnalysisFailed,
    };
  }

  private async pendingPayouts(): Promise<PendingBucket> {
    const result = await this.prisma.payout.aggregate({
      where: { status: { in: ["REQUESTED", "VALIDATED"] } },
      _count: { _all: true },
      _min: { requestedAt: true },
    });
    return { count: result._count._all, oldestAt: result._min.requestedAt };
  }

  /** Remboursements acceptés par l'entreprise : reste l'exécution par l'Admin. */
  private async pendingRefunds(): Promise<PendingBucket> {
    const result = await this.prisma.refund.aggregate({
      where: { status: "ACCEPTED" },
      _count: { _all: true },
      _min: { requestedAt: true },
    });
    return { count: result._count._all, oldestAt: result._min.requestedAt };
  }

  /** Débits de crédits IA des dernières 24 h, comparés à la période de référence, pour les seuls gros consommateurs. */
  private async aiUsage(now: Date): Promise<RawAiTenantUsage[]> {
    const recentFrom = new Date(now.getTime() - AI_ANOMALY_WINDOW_HOURS * HOUR_MS);
    const recent = await this.prisma.creditLedgerEntry.groupBy({
      by: ["walletId"],
      where: { type: "DEBIT", createdAt: { gte: recentFrom } },
      _sum: { amount: true },
    });
    const heavy = recent.filter((row) => Math.abs(row._sum.amount ?? 0) >= AI_ANOMALY_MIN_CREDITS);
    if (heavy.length === 0) return [];

    const walletIds = heavy.map((row) => row.walletId);
    const baselineFrom = new Date(recentFrom.getTime() - AI_ANOMALY_BASELINE_DAYS * DAY_MS);
    const [baseline, wallets] = await Promise.all([
      this.prisma.creditLedgerEntry.groupBy({
        by: ["walletId"],
        where: { walletId: { in: walletIds }, type: "DEBIT", createdAt: { gte: baselineFrom, lt: recentFrom } },
        _sum: { amount: true },
      }),
      this.prisma.creditWallet.findMany({
        where: { id: { in: walletIds } },
        select: { id: true, tenant: { select: { id: true, name: true } } },
      }),
    ]);
    const baselineByWallet = new Map(baseline.map((row) => [row.walletId, Math.abs(row._sum.amount ?? 0)]));
    const tenantByWallet = new Map(wallets.map((wallet) => [wallet.id, wallet.tenant]));

    return heavy.flatMap((row) => {
      const tenant = tenantByWallet.get(row.walletId);
      if (!tenant) return [];
      return [
        {
          tenantId: tenant.id,
          tenantName: tenant.name,
          recentCredits: Math.abs(row._sum.amount ?? 0),
          baselineCredits: baselineByWallet.get(row.walletId) ?? 0,
        },
      ];
    });
  }
}
