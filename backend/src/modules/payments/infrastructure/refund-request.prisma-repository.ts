import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { RefundEligibility } from "../domain/refund-eligibility";
import type { RefundRequest, RefundRequestStatus } from "../domain/refund-request";
import type { RefundablePayment, RefundRequestRepositoryPort } from "../domain/refund-request.repository.port";

const INCLUDE = {
  payment: {
    select: {
      currency: true,
      createdAt: true,
      enrollmentId: true,
      enrollment: {
        select: {
          userId: true,
          course: { select: { title: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  },
} satisfies Prisma.RefundInclude;

type RefundRecord = Prisma.RefundGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class RefundRequestPrismaRepository implements RefundRequestRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findRefundablePayment(userId: string, enrollmentId: string): Promise<RefundablePayment | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { type: "COURSE_ENROLLMENT", status: "SUCCEEDED", enrollmentId, enrollment: { userId } },
      select: { id: true, tenantId: true, amount: true, currency: true },
    });
    return payment ? { paymentId: payment.id, tenantId: payment.tenantId, amount: payment.amount, currency: payment.currency } : null;
  }

  async hasActiveRequest(paymentId: string): Promise<boolean> {
    const count = await this.prisma.refund.count({ where: { paymentId, status: { not: "REJECTED" } } });
    return count > 0;
  }

  async create(data: { payment: RefundablePayment; reason: string | null }): Promise<RefundRequest> {
    const record = await this.prisma.refund.create({
      data: {
        tenantId: data.payment.tenantId,
        paymentId: data.payment.paymentId,
        amount: data.payment.amount,
        reason: data.reason,
      },
      include: INCLUDE,
    });
    return this.toDomain(record);
  }

  async findById(id: string): Promise<RefundRequest | null> {
    const record = await this.prisma.refund.findUnique({ where: { id }, include: INCLUDE });
    return record ? this.toDomain(record) : null;
  }

  async save(request: {
    id: string;
    status: RefundRequestStatus;
    decisionNote: string | null;
    resolvedAt: Date | null;
    amount?: number;
    eligibility?: RefundEligibility;
    autoAccepted?: boolean;
  }): Promise<void> {
    await this.prisma.refund.update({
      where: { id: request.id },
      data: {
        status: request.status,
        decisionNote: request.decisionNote,
        resolvedAt: request.resolvedAt,
        ...(request.amount !== undefined && { amount: request.amount }),
        ...(request.eligibility !== undefined && { eligibility: request.eligibility as unknown as object }),
        ...(request.autoAccepted !== undefined && { autoAccepted: request.autoAccepted }),
      },
    });
  }

  async listForTenant(tenantId: string): Promise<RefundRequest[]> {
    const records = await this.prisma.refund.findMany({
      where: { tenantId },
      include: INCLUDE,
      orderBy: { requestedAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listForLearner(userId: string): Promise<RefundRequest[]> {
    const records = await this.prisma.refund.findMany({
      where: { payment: { enrollment: { userId } } },
      include: INCLUDE,
      orderBy: { requestedAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByStatus(status: RefundRequestStatus): Promise<RefundRequest[]> {
    const records = await this.prisma.refund.findMany({
      where: { status },
      include: INCLUDE,
      orderBy: { requestedAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: RefundRecord): RefundRequest {
    const learner = record.payment.enrollment?.user;
    return {
      id: record.id,
      paymentId: record.paymentId,
      tenantId: record.tenantId,
      amount: record.amount,
      currency: record.payment.currency,
      reason: record.reason,
      decisionNote: record.decisionNote,
      status: record.status,
      requestedAt: record.requestedAt,
      resolvedAt: record.resolvedAt,
      enrollmentId: record.payment.enrollmentId,
      learnerUserId: record.payment.enrollment?.userId ?? null,
      courseTitle: record.payment.enrollment?.course.title ?? "—",
      learnerName: learner ? `${learner.firstName} ${learner.lastName}` : "—",
      learnerEmail: learner?.email ?? "—",
      paidAt: record.payment.createdAt,
      eligibility: (record.eligibility as RefundEligibility | null) ?? null,
      autoAccepted: record.autoAccepted,
    };
  }
}
