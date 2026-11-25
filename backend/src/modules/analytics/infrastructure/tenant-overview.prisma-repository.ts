import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type {
  TenantAuditEntry,
  TenantContact,
  TenantFinances,
  TenantInvitationRecord,
  TenantProfile,
  TenantSubscriptionRow,
  TenantUsageCounts,
  TenantUser,
} from "../domain/tenant-overview";
import type { TenantOverviewRepositoryPort } from "../domain/tenant-overview.repository.port";

/** Doit rester synchronisé avec `TENANT_OWNER_ROLE_NAME` (module users, rôles entreprise par défaut). */
const OWNER_ROLE_NAME = "Propriétaire d'entreprise";

/**
 * Lecture directe des tables Prisma (même précédent documenté que `analytics.prisma-repository.ts`). Aucune écriture ;
 * jamais de hash de mot de passe, de secret 2FA, de coordonnées de reversement ni de charge brute de paiement.
 */
@Injectable()
export class TenantOverviewPrismaRepository implements TenantOverviewRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(tenantId: string): Promise<TenantProfile | null> {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        statusReason: true,
        country: true,
        currency: true,
        defaultLocale: true,
        contactEmail: true,
        contactPhone: true,
        offlinePaymentEnabled: true,
        payoutAccountVerified: true,
        createdAt: true,
        archivedAt: true,
      },
    });
  }

  async findOwners(tenantId: string): Promise<TenantContact[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId, roles: { some: { role: { name: OWNER_ROLE_NAME } } } },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    return users.map((user) => ({
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone,
      status: user.status,
    }));
  }

  async listOwnerInvitations(tenantId: string): Promise<TenantInvitationRecord[]> {
    const owners = await this.findOwners(tenantId);
    const now = new Date();

    return Promise.all(
      owners.map(async (owner): Promise<TenantInvitationRecord> => {
        const [token, notification] = await Promise.all([
          this.prisma.invitationToken.findFirst({ where: { userId: owner.id }, orderBy: { createdAt: "desc" } }),
          this.prisma.notification.findFirst({
            where: { recipientUserId: owner.id, templateKey: "user.invited" },
            orderBy: { createdAt: "desc" },
          }),
        ]);

        const state: TenantInvitationRecord["state"] = !token
          ? "NOT_INVITED"
          : token.consumedAt
            ? "ACTIVATED"
            : token.expiresAt < now
              ? "EXPIRED"
              : "PENDING";

        return {
          recipient: { userId: owner.id, fullName: owner.fullName, email: owner.email },
          state,
          issuedAt: token?.createdAt ?? null,
          expiresAt: token?.expiresAt ?? null,
          consumedAt: token?.consumedAt ?? null,
          message: notification
            ? {
                channel: notification.channel,
                locale: notification.locale,
                payload: (notification.payload as Record<string, unknown> | null) ?? {},
                status: notification.status,
                sentAt: notification.sentAt,
                errorMessage: notification.errorMessage,
              }
            : null,
        };
      }),
    );
  }

  async listSubscriptions(tenantId: string, limit: number): Promise<TenantSubscriptionRow[]> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        status: true,
        autoRenew: true,
        startedAt: true,
        currentPeriodEnd: true,
        graceEndsAt: true,
        canceledAt: true,
        createdAt: true,
        discountPercent: true,
        discountAmount: true,
        discountPeriodsRemaining: true,
        isComplimentary: true,
        planPrice: {
          select: { amount: true, period: true, currency: true, plan: { select: { name: true, quotas: true } } },
        },
      },
    });
    return subscriptions.map((subscription) => ({
      id: subscription.id,
      planName: subscription.planPrice.plan.name,
      period: subscription.planPrice.period,
      amount: subscription.planPrice.amount,
      currency: subscription.planPrice.currency,
      status: subscription.status,
      autoRenew: subscription.autoRenew,
      startedAt: subscription.startedAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      graceEndsAt: subscription.graceEndsAt,
      canceledAt: subscription.canceledAt,
      createdAt: subscription.createdAt,
      discountPercent: subscription.discountPercent,
      discountAmount: subscription.discountAmount,
      discountPeriodsRemaining: subscription.discountPeriodsRemaining,
      isComplimentary: subscription.isComplimentary,
      quotas: subscription.planPrice.plan.quotas,
    }));
  }

  async getUsageCounts(tenantId: string, now: Date): Promise<TenantUsageCounts> {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      courses,
      publishedCourses,
      activeLearners,
      totalLearners,
      managers,
      storage,
      liveSessionsThisMonth,
      wallet,
      lastLogin,
      lastEnrollment,
    ] = await Promise.all([
      this.prisma.course.count({ where: { tenantId, status: { not: "ARCHIVED" } } }),
      this.prisma.course.count({ where: { tenantId, status: "PUBLISHED" } }),
      this.prisma.enrollment.count({ where: { course: { tenantId }, status: "ACTIVE" } }),
      this.prisma.user.count({ where: { tenantId, type: "LEARNER" } }),
      this.prisma.user.count({ where: { tenantId, type: "COMPANY_USER", status: "ACTIVE" } }),
      this.prisma.mediaAsset.aggregate({
        where: { tenantId, status: { notIn: ["REJECTED", "FAILED"] } },
        _sum: { sizeBytes: true },
      }),
      this.prisma.liveSession.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      this.prisma.creditWallet.findUnique({ where: { tenantId }, select: { balance: true } }),
      this.prisma.user.aggregate({ where: { tenantId }, _max: { lastLoginAt: true } }),
      this.prisma.enrollment.aggregate({ where: { course: { tenantId } }, _max: { updatedAt: true } }),
    ]);

    const lastDates = [lastLogin._max.lastLoginAt, lastEnrollment._max.updatedAt].filter(
      (date): date is Date => date !== null,
    );
    return {
      courses,
      publishedCourses,
      activeLearners,
      totalLearners,
      managers,
      storageBytes: storage._sum.sizeBytes ?? 0,
      liveSessionsThisMonth,
      creditsBalance: wallet?.balance ?? 0,
      lastActivityAt: lastDates.length > 0 ? new Date(Math.max(...lastDates.map((date) => date.getTime()))) : null,
    };
  }

  async listUsers(tenantId: string, limit: number): Promise<TenantUser[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId, type: "COMPANY_USER" },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        type: true,
        status: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    return users.map((user) => ({
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      type: user.type,
      status: user.status,
      roles: user.roles.map((row) => row.role.name),
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }));
  }

  async getFinances(tenantId: string, currency: string, limit: number): Promise<TenantFinances> {
    const [payments, payouts, refunds, ledger, succeeded, failedCount, executedPayouts, refunded] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          type: true,
          method: true,
          amount: true,
          currency: true,
          status: true,
          providerReference: true,
          createdAt: true,
        },
      }),
      this.prisma.payout.findMany({
        where: { tenantId },
        orderBy: { requestedAt: "desc" },
        take: limit,
        select: { id: true, amount: true, currency: true, status: true, requestedAt: true, executedAt: true },
      }),
      this.prisma.refund.findMany({
        where: { tenantId },
        orderBy: { requestedAt: "desc" },
        take: limit,
        select: { id: true, amount: true, status: true, reason: true, requestedAt: true, resolvedAt: true },
      }),
      this.prisma.ledgerEntry.groupBy({
        by: ["direction"],
        where: { tenantId, account: "TENANT" },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] } },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({ where: { tenantId, status: "FAILED" } }),
      this.prisma.payout.aggregate({ where: { tenantId, status: "EXECUTED" }, _sum: { amount: true } }),
      this.prisma.refund.aggregate({ where: { tenantId, status: "REFUNDED" }, _sum: { amount: true } }),
    ]);

    const credit = ledger.find((row) => row.direction === "CREDIT")?._sum.amount ?? 0;
    const debit = ledger.find((row) => row.direction === "DEBIT")?._sum.amount ?? 0;

    return {
      summary: {
        currency,
        ledgerBalance: credit - debit,
        succeededPaymentsAmount: succeeded._sum.amount ?? 0,
        failedPaymentsCount: failedCount,
        executedPayoutsAmount: executedPayouts._sum.amount ?? 0,
        refundedAmount: refunded._sum.amount ?? 0,
      },
      payments,
      payouts,
      refunds,
    };
  }

  async listAudit(tenantId: string, limit: number): Promise<TenantAuditEntry[]> {
    const entries = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        objectType: true,
        objectId: true,
        createdAt: true,
        actor: { select: { firstName: true, lastName: true } },
      },
    });
    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      objectType: entry.objectType,
      objectId: entry.objectId,
      actorName: entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}`.trim() : null,
      createdAt: entry.createdAt,
    }));
  }
}
