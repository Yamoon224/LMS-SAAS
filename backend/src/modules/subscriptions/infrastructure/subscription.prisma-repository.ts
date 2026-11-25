import { Injectable } from "@nestjs/common";
import type { Subscription as PrismaSubscription } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { SubscriptionStatus } from "../domain/subscription-status";
import { Subscription } from "../domain/subscription.entity";
import type { RenewalStatus, SubscriptionProps } from "../domain/subscription.entity";
import type {
  CreateSubscriptionData,
  PlanPriceSelection,
  RenewalClaimExpectation,
  SubscriptionRepositoryPort,
  SubscriptionWithPlanDetails,
} from "../domain/subscription.repository.port";

const OPERATIONAL_STATUSES = ["ACTIVE", "TRIALING", "GRACE_PERIOD"] as const;

@Injectable()
export class SubscriptionPrismaRepository implements SubscriptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findLatestForTenant(tenantId: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return record ? this.toDomain(record) : null;
  }

  async findActiveForTenant(tenantId: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: [...OPERATIONAL_STATUSES] } },
      orderBy: { createdAt: "desc" },
    });
    return record ? this.toDomain(record) : null;
  }

  async findPlanPriceSelection(planPriceId: string): Promise<PlanPriceSelection | null> {
    const record = await this.prisma.planPrice.findUnique({
      where: { id: planPriceId },
      include: { plan: true },
    });
    if (!record) return null;
    return {
      id: record.id,
      planIsPublic: record.plan.isPublic,
      planIsArchived: record.plan.isArchived,
      isActive: record.isActive,
      amount: record.amount,
      currency: record.currency,
      period: record.period,
      trialDays: record.trialDays,
      planName: record.plan.name,
    };
  }

  async findLatestForTenantWithPlanDetails(tenantId: string): Promise<SubscriptionWithPlanDetails | null> {
    const record = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { planPrice: { include: { plan: true } } },
    });
    if (!record) return null;

    return {
      id: record.id,
      status: record.status as SubscriptionStatus,
      autoRenew: record.autoRenew,
      startedAt: record.startedAt,
      currentPeriodEnd: record.currentPeriodEnd,
      graceEndsAt: record.graceEndsAt,
      canceledAt: record.canceledAt,
      planPriceId: record.planPriceId,
      planName: record.planPrice.plan.name,
      period: record.planPrice.period,
      currency: record.planPrice.currency,
      amount: record.planPrice.amount,
      discountPercent: record.discountPercent,
      discountAmount: record.discountAmount,
      discountPeriodsRemaining: record.discountPeriodsRemaining,
      isComplimentary: record.isComplimentary,
    };
  }

  async create(data: CreateSubscriptionData): Promise<Subscription> {
    const record = await this.prisma.subscription.create({
      data: {
        tenantId: data.tenantId,
        planPriceId: data.planPriceId,
        status: data.status,
        autoRenew: true,
      },
    });
    return this.toDomain(record);
  }

  async save(subscription: Subscription): Promise<void> {
    const snapshot = subscription.toSnapshot();
    await this.prisma.subscription.update({
      where: { id: snapshot.id },
      data: {
        planPriceId: snapshot.planPriceId,
        status: snapshot.status,
        autoRenew: snapshot.autoRenew,
        startedAt: snapshot.startedAt,
        currentPeriodEnd: snapshot.currentPeriodEnd,
        graceEndsAt: snapshot.graceEndsAt,
        canceledAt: snapshot.canceledAt,
        ...this.renewalColumns(snapshot),
      },
    });
  }

  async claimRenewalRequest(subscription: Subscription, expected: RenewalClaimExpectation): Promise<boolean> {
    const snapshot = subscription.toSnapshot();
    const result = await this.prisma.subscription.updateMany({
      where: {
        id: snapshot.id,
        status: expected.status,
        renewalForPeriodEnd: expected.renewalForPeriodEnd,
        lastRenewalStatus: expected.lastRenewalStatus,
        lastRenewalAt: expected.lastRenewalAt,
      },
      data: {
        renewalForPeriodEnd: snapshot.renewalForPeriodEnd ?? null,
        lastRenewalStatus: snapshot.lastRenewalStatus ?? null,
        lastRenewalAt: snapshot.lastRenewalAt ?? null,
        lastRenewalAmount: snapshot.lastRenewalAmount ?? null,
        lastRenewalPaymentId: null,
        lastRenewalCheckoutUrl: null,
      },
    });
    return result.count === 1;
  }

  async listRenewalCandidates(now: Date): Promise<Subscription[]> {
    const records = await this.prisma.subscription.findMany({
      where: {
        autoRenew: true,
        OR: [
          { status: "ACTIVE", currentPeriodEnd: { lte: now } },
          { status: "GRACE_PERIOD", lastRenewalStatus: "FAILED", graceEndsAt: { gte: now } },
        ],
      },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listNonRenewingEnded(now: Date): Promise<Subscription[]> {
    const records = await this.prisma.subscription.findMany({
      where: { status: "ACTIVE", autoRenew: false, currentPeriodEnd: { lt: now } },
    });
    return records.map((record) => this.toDomain(record));
  }

  private renewalColumns(snapshot: Readonly<SubscriptionProps>) {
    return {
      pendingPlanPriceId: snapshot.pendingPlanPriceId ?? null,
      pendingChangeAt: snapshot.pendingChangeAt ?? null,
      renewalForPeriodEnd: snapshot.renewalForPeriodEnd ?? null,
      lastRenewalStatus: snapshot.lastRenewalStatus ?? null,
      lastRenewalAt: snapshot.lastRenewalAt ?? null,
      lastRenewalPaymentId: snapshot.lastRenewalPaymentId ?? null,
      lastRenewalCheckoutUrl: snapshot.lastRenewalCheckoutUrl ?? null,
      lastRenewalAmount: snapshot.lastRenewalAmount ?? null,
      discountPercent: snapshot.discountPercent ?? null,
      discountAmount: snapshot.discountAmount ?? null,
      discountPeriodsRemaining: snapshot.discountPeriodsRemaining ?? null,
      isComplimentary: snapshot.isComplimentary ?? false,
    };
  }

  async listDueForRenewal(before: Date): Promise<Subscription[]> {
    const records = await this.prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        autoRenew: true,
        currentPeriodEnd: { lte: before },
      },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listGraceElapsed(now: Date): Promise<Subscription[]> {
    const records = await this.prisma.subscription.findMany({
      where: { status: "GRACE_PERIOD", graceEndsAt: { lt: now } },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaSubscription): Subscription {
    return Subscription.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      planPriceId: record.planPriceId,
      status: record.status as SubscriptionStatus,
      autoRenew: record.autoRenew,
      startedAt: record.startedAt,
      currentPeriodEnd: record.currentPeriodEnd,
      graceEndsAt: record.graceEndsAt,
      canceledAt: record.canceledAt,
      pendingPlanPriceId: record.pendingPlanPriceId,
      pendingChangeAt: record.pendingChangeAt,
      renewalForPeriodEnd: record.renewalForPeriodEnd,
      lastRenewalStatus: record.lastRenewalStatus as RenewalStatus | null,
      lastRenewalAt: record.lastRenewalAt,
      lastRenewalPaymentId: record.lastRenewalPaymentId,
      lastRenewalCheckoutUrl: record.lastRenewalCheckoutUrl,
      lastRenewalAmount: record.lastRenewalAmount,
      discountPercent: record.discountPercent,
      discountAmount: record.discountAmount,
      discountPeriodsRemaining: record.discountPeriodsRemaining,
      isComplimentary: record.isComplimentary,
    });
  }
}
