import { Injectable } from "@nestjs/common";
import type { CreditPack as PrismaCreditPack } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type {
  CreateCreditPackData,
  CreditPackRecord,
  CreditPackRepositoryPort,
} from "../domain/credit-pack.repository.port";

@Injectable()
export class CreditPackPrismaRepository implements CreditPackRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CreditPackRecord | null> {
    const record = await this.prisma.creditPack.findUnique({ where: { id } });
    return record ? this.toRecord(record) : null;
  }

  async listActive(): Promise<CreditPackRecord[]> {
    const records = await this.prisma.creditPack.findMany({
      where: { isArchived: false },
      orderBy: { creditsAmount: "asc" },
    });
    return records.map((record) => this.toRecord(record));
  }

  async listAll(): Promise<CreditPackRecord[]> {
    const records = await this.prisma.creditPack.findMany({ orderBy: { creditsAmount: "asc" } });
    return records.map((record) => this.toRecord(record));
  }

  async create(data: CreateCreditPackData): Promise<CreditPackRecord> {
    const record = await this.prisma.creditPack.create({ data });
    return this.toRecord(record);
  }

  async archive(id: string): Promise<void> {
    await this.prisma.creditPack.update({ where: { id }, data: { isArchived: true } });
  }

  private toRecord(record: PrismaCreditPack): CreditPackRecord {
    return {
      id: record.id,
      name: record.name,
      creditsAmount: record.creditsAmount,
      price: record.price,
      currency: record.currency,
      isArchived: record.isArchived,
    };
  }
}
