import { Injectable } from "@nestjs/common";
import type { Payout as PrismaPayout } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { PayoutStatus } from "../domain/payout-status";
import { Payout } from "../domain/payout.entity";
import type { PayoutDestination } from "../domain/payout.entity";
import type { CreatePayoutData, PayoutRepositoryPort } from "../domain/payout.repository.port";

@Injectable()
export class PayoutPrismaRepository implements PayoutRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Payout | null> {
    const record = await this.prisma.payout.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async create(data: CreatePayoutData): Promise<Payout> {
    const record = await this.prisma.payout.create({
      data: {
        tenantId: data.tenantId,
        amount: data.amount,
        currency: data.currency,
        destination: data.destination as unknown as object,
      },
    });
    return this.toDomain(record);
  }

  async save(payout: Payout): Promise<void> {
    const snapshot = payout.toSnapshot();
    await this.prisma.payout.update({
      where: { id: snapshot.id },
      data: {
        status: snapshot.status,
        validatedByUserId: snapshot.validatedByUserId,
        approvedByUserId: snapshot.approvedByUserId,
        proofUrl: snapshot.proofUrl,
        rejectionReason: snapshot.rejectionReason,
        executedAt: snapshot.executedAt ?? undefined,
      },
    });
  }

  async listByStatus(status: string): Promise<Payout[]> {
    const records = await this.prisma.payout.findMany({ where: { status: status as never } });
    return records.map((record) => this.toDomain(record));
  }

  async listByTenant(tenantId: string): Promise<Payout[]> {
    const records = await this.prisma.payout.findMany({
      where: { tenantId },
      orderBy: { requestedAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async hasOpenPayout(tenantId: string): Promise<boolean> {
    const count = await this.prisma.payout.count({
      where: { tenantId, status: { in: ["REQUESTED", "VALIDATED", "APPROVED"] } },
    });
    return count > 0;
  }

  private toDomain(record: PrismaPayout): Payout {
    return Payout.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      amount: record.amount,
      currency: record.currency,
      status: record.status as PayoutStatus,
      destination: record.destination as unknown as PayoutDestination,
      validatedByUserId: record.validatedByUserId,
      approvedByUserId: record.approvedByUserId,
      proofUrl: record.proofUrl,
      rejectionReason: record.rejectionReason,
      requestedAt: record.requestedAt,
      executedAt: record.executedAt,
    });
  }
}
