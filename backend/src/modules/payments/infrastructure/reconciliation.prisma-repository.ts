import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { DuplicateCandidate } from "../domain/payment-reconciliation";
import type { PendingPaymentRow, ReconciliationRepositoryPort } from "../domain/reconciliation.repository.port";

@Injectable()
export class ReconciliationPrismaRepository implements ReconciliationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listPendingCreatedBefore(cutoff: Date, limit: number): Promise<PendingPaymentRow[]> {
    const records = await this.prisma.payment.findMany({
      where: { status: "PENDING", createdAt: { lte: cutoff } },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        tenantId: true,
        providerReference: true,
        method: true,
        amount: true,
        currency: true,
        createdAt: true,
        provider: { select: { code: true } },
      },
    });
    return records.map((record) => ({
      id: record.id,
      tenantId: record.tenantId,
      providerCode: record.provider.code,
      providerReference: record.providerReference,
      method: record.method,
      amount: record.amount,
      currency: record.currency,
      createdAt: record.createdAt,
    }));
  }

  async listCollectedEnrollmentPaymentsSince(since: Date): Promise<DuplicateCandidate[]> {
    const records = await this.prisma.payment.findMany({
      where: { type: "COURSE_ENROLLMENT", status: "SUCCEEDED", createdAt: { gte: since }, enrollmentId: { not: null } },
      select: {
        id: true,
        tenantId: true,
        amount: true,
        currency: true,
        createdAt: true,
        enrollment: { select: { userId: true, courseId: true } },
      },
    });
    return records.flatMap((record) =>
      record.enrollment
        ? [
            {
              paymentId: record.id,
              tenantId: record.tenantId,
              amount: record.amount,
              currency: record.currency,
              userId: record.enrollment.userId,
              courseId: record.enrollment.courseId,
              createdAt: record.createdAt,
            },
          ]
        : [],
    );
  }
}
