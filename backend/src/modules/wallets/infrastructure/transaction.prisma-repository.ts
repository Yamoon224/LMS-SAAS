import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import { breakDownOfflineSale, breakDownOnlineSale } from "../domain/transaction";
import type { Transaction } from "../domain/transaction";
import type { TransactionRepositoryPort } from "../domain/transaction.repository.port";

const SOLD_STATUSES = ["SUCCEEDED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;

@Injectable()
export class TransactionPrismaRepository implements TransactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listForTenant(tenantId: string): Promise<Transaction[]> {
    const [online, offline] = await Promise.all([this.listOnline(tenantId), this.listOffline(tenantId)]);
    return [...online, ...offline].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  private async listOnline(tenantId: string): Promise<Transaction[]> {
    const payments = await this.prisma.payment.findMany({
      where: { tenantId, type: "COURSE_ENROLLMENT", status: { in: [...SOLD_STATUSES] } },
      include: { enrollment: { select: { course: { select: { title: true } } } } },
    });
    const credits = await this.prisma.ledgerEntry.findMany({
      where: {
        tenantId,
        account: "TENANT",
        direction: "CREDIT",
        sourceType: "SALE",
        sourceId: { in: payments.map((payment) => payment.id) },
      },
      select: { sourceId: true, amount: true },
    });
    const netBySale = new Map(credits.map((credit) => [credit.sourceId, credit.amount]));
    const commissionRows = await this.prisma.ledgerEntry.findMany({
      where: {
        tenantId,
        account: "PLATFORM",
        direction: "CREDIT",
        sourceType: "COMMISSION",
        sourceId: { in: payments.map((payment) => payment.id) },
      },
      select: { sourceId: true, amount: true },
    });
    const commissionBySale = new Map(commissionRows.map((row) => [row.sourceId, row.amount]));

    return payments.map((payment) => ({
      id: payment.id,
      channel: "ONLINE",
      status: payment.status,
      courseTitle: payment.enrollment?.course.title ?? "—",
      reference: payment.providerReference,
      currency: payment.currency,
      gross: payment.amount,
      ...breakDownOnlineSale(
        payment.amount,
        payment.providerFee,
        netBySale.get(payment.id) ?? null,
        commissionBySale.get(payment.id) ?? null,
      ),
      occurredAt: payment.createdAt,
    }));
  }

  private async listOffline(tenantId: string): Promise<Transaction[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { course: { tenantId }, offlinePaymentAmount: { not: null } },
      select: {
        id: true,
        currency: true,
        offlinePaymentReference: true,
        offlinePaymentAmount: true,
        startedAt: true,
        updatedAt: true,
        course: { select: { title: true } },
      },
    });
    const commissions = await this.prisma.ledgerEntry.findMany({
      where: {
        tenantId,
        account: "TENANT",
        direction: "DEBIT",
        sourceType: "OFFLINE_COMMISSION",
        sourceId: { in: enrollments.map((enrollment) => enrollment.id) },
      },
      select: { sourceId: true, amount: true },
    });
    const commissionByEnrollment = new Map(commissions.map((entry) => [entry.sourceId, entry.amount]));

    return enrollments.map((enrollment) => {
      const gross = enrollment.offlinePaymentAmount ?? 0;
      return {
        id: enrollment.id,
        channel: "OFFLINE",
        status: null,
        courseTitle: enrollment.course.title,
        reference: enrollment.offlinePaymentReference ?? "—",
        currency: enrollment.currency,
        gross,
        fee: 0,
        ...breakDownOfflineSale(gross, commissionByEnrollment.get(enrollment.id) ?? 0),
        occurredAt: enrollment.startedAt ?? enrollment.updatedAt,
      };
    });
  }
}
