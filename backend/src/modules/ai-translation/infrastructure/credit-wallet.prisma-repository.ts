import { Injectable } from "@nestjs/common";
import type { CreditWallet as PrismaCreditWallet } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { CreditWallet } from "../domain/credit-wallet.entity";
import type {
  CreateLedgerEntryData,
  CreditLedgerEntryRecord,
  CreditWalletRepositoryPort,
} from "../domain/credit-wallet.repository.port";

@Injectable()
export class CreditWalletPrismaRepository implements CreditWalletRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string): Promise<CreditWallet | null> {
    const record = await this.prisma.creditWallet.findUnique({ where: { tenantId } });
    return record ? this.toDomain(record) : null;
  }

  async createForTenant(tenantId: string): Promise<CreditWallet> {
    const record = await this.prisma.creditWallet.create({ data: { tenantId, balance: 0 } });
    return this.toDomain(record);
  }

  async save(wallet: CreditWallet): Promise<void> {
    const snapshot = wallet.toSnapshot();
    await this.prisma.creditWallet.update({
      where: { id: snapshot.id },
      data: { balance: snapshot.balance },
    });
  }

  async recordLedgerEntry(data: CreateLedgerEntryData): Promise<void> {
    await this.prisma.creditLedgerEntry.create({
      data: {
        walletId: data.walletId,
        type: data.type,
        amount: data.amount,
        translationJobId: data.translationJobId,
        creditPackId: data.creditPackId,
        note: data.note,
      },
    });
  }

  async listLedgerForTenant(tenantId: string): Promise<CreditLedgerEntryRecord[]> {
    const records = await this.prisma.creditLedgerEntry.findMany({
      where: { wallet: { tenantId } },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => ({
      id: record.id,
      type: record.type as CreditLedgerEntryRecord["type"],
      amount: record.amount,
      note: record.note,
      createdAt: record.createdAt,
    }));
  }

  private toDomain(record: PrismaCreditWallet): CreditWallet {
    return CreditWallet.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      balance: record.balance,
    });
  }
}
