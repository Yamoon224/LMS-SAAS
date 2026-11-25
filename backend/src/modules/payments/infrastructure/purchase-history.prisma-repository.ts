import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import { sortPurchasesNewestFirst } from "../domain/purchase-history";
import type { PurchaseHistoryItem } from "../domain/purchase-history";
import type { PurchaseHistoryRepositoryPort } from "../domain/purchase-history.repository.port";

@Injectable()
export class PurchaseHistoryPrismaRepository implements PurchaseHistoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listForLearner(userId: string): Promise<PurchaseHistoryItem[]> {
    // Filtré par l'identifiant de l'utilisateur authentifié : un apprenant ne voit jamais les achats d'un autre.
    const [online, offline] = await Promise.all([this.listOnline(userId), this.listOffline(userId)]);
    return sortPurchasesNewestFirst([...online, ...offline]);
  }

  private async listOnline(userId: string): Promise<PurchaseHistoryItem[]> {
    const payments = await this.prisma.payment.findMany({
      where: { type: "COURSE_ENROLLMENT", enrollment: { userId } },
      select: {
        id: true,
        enrollmentId: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        createdAt: true,
        enrollment: { select: { course: { select: { title: true } } } },
        refunds: { select: { status: true }, orderBy: { requestedAt: "desc" }, take: 1 },
      },
    });

    return payments.flatMap((payment): PurchaseHistoryItem[] =>
      payment.enrollmentId
        ? [
            {
              id: payment.id,
              kind: "ONLINE",
              enrollmentId: payment.enrollmentId,
              courseTitle: payment.enrollment?.course.title ?? "—",
              amount: payment.amount,
              currency: payment.currency,
              method: payment.method,
              status: payment.status,
              refundStatus: payment.refunds[0]?.status ?? null,
              purchasedAt: payment.createdAt,
            },
          ]
        : [],
    );
  }

  private async listOffline(userId: string): Promise<PurchaseHistoryItem[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, offlinePaymentAmount: { not: null } },
      select: {
        id: true,
        currency: true,
        offlinePaymentAmount: true,
        startedAt: true,
        updatedAt: true,
        course: { select: { title: true } },
      },
    });

    return enrollments.map(
      (enrollment): PurchaseHistoryItem => ({
        id: enrollment.id,
        kind: "OFFLINE",
        enrollmentId: enrollment.id,
        courseTitle: enrollment.course.title,
        amount: enrollment.offlinePaymentAmount ?? 0,
        currency: enrollment.currency,
        method: null,
        status: null,
        refundStatus: null,
        purchasedAt: enrollment.startedAt ?? enrollment.updatedAt,
      }),
    );
  }
}
