import { Injectable } from "@nestjs/common";
import { PaymentProviderCode } from "@prisma/client";
import type { PaymentProvider as PrismaPaymentProvider } from "@prisma/client";
import { encryptSecret } from "@shared/crypto/secrets-cipher";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { PaymentMethod } from "../domain/payment-method";
import type {
  PaymentProviderConfigRecord,
  PaymentProviderConfigRepositoryPort,
  SetProviderConfigData,
} from "../domain/payment-provider-config.repository.port";

@Injectable()
export class PaymentProviderConfigPrismaRepository implements PaymentProviderConfigRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PaymentProviderConfigRecord | null> {
    const record = await this.prisma.paymentProvider.findUnique({ where: { id } });
    return record ? this.toRecord(record) : null;
  }

  async findActiveByMethod(method: PaymentMethod): Promise<PaymentProviderConfigRecord[]> {
    const records = await this.prisma.paymentProvider.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    });
    return records
      .filter((record) => (record.supportedMethods as string[]).includes(method))
      .map((record) => this.toRecord(record));
  }

  async findByCode(code: string): Promise<PaymentProviderConfigRecord | null> {
    const record = await this.prisma.paymentProvider.findUnique({ where: { code: code as never } });
    return record ? this.toRecord(record) : null;
  }

  async listAll(): Promise<PaymentProviderConfigRecord[]> {
    const records = await this.prisma.paymentProvider.findMany({ orderBy: { priority: "asc" } });
    return records.map((record) => this.toRecord(record));
  }

  async upsert(data: SetProviderConfigData): Promise<PaymentProviderConfigRecord> {
    const encryptedCredentials = Object.fromEntries(
      Object.entries(data.credentials).map(([key, value]) => [key, encryptSecret(value)]),
    );

    const record = await this.prisma.paymentProvider.upsert({
      where: { code: data.code as never },
      update: {
        label: data.label,
        isActive: data.isActive,
        isTestMode: data.isTestMode,
        priority: data.priority,
        supportedMethods: data.supportedMethods,
        encryptedCredentials,
      },
      create: {
        code: data.code as never,
        label: data.label,
        isActive: data.isActive,
        isTestMode: data.isTestMode,
        priority: data.priority,
        supportedMethods: data.supportedMethods,
        encryptedCredentials,
      },
    });
    return this.toRecord(record);
  }

  async setActive(code: string, isActive: boolean): Promise<void> {
    await this.prisma.paymentProvider.update({ where: { code: code as never }, data: { isActive } });
  }

  async deleteByCode(code: string): Promise<{ deleted: boolean; paymentCount: number } | null> {
    // Un code hors de l'énumération n'existe pas : on répond « introuvable » plutôt que de laisser Prisma lever une erreur de validation.
    if (!(Object.values(PaymentProviderCode) as string[]).includes(code)) return null;
    const provider = await this.prisma.paymentProvider.findUnique({
      where: { code: code as never },
      select: { id: true, _count: { select: { payments: true } } },
    });
    if (!provider) return null;
    const paymentCount = provider._count.payments;
    if (paymentCount > 0) return { deleted: false, paymentCount };
    await this.prisma.paymentProvider.delete({ where: { id: provider.id } });
    return { deleted: true, paymentCount: 0 };
  }

  private toRecord(record: PrismaPaymentProvider): PaymentProviderConfigRecord {
    return {
      id: record.id,
      code: record.code,
      label: record.label,
      isActive: record.isActive,
      isTestMode: record.isTestMode,
      priority: record.priority,
      supportedMethods: record.supportedMethods as PaymentMethod[],
    };
  }
}
