import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Tenant as PrismaTenant } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { TenantStatus } from "../domain/tenant-status";
import { Tenant } from "../domain/tenant.entity";
import type {
  CreateTenantData,
  TenantRepositoryPort,
  TenantSettingsPatch,
  TenantSettingsRecord,
} from "../domain/tenant.repository.port";

@Injectable()
export class TenantPrismaRepository implements TenantRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({ where: { slug } });
    return record ? this.toDomain(record) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.tenant.count({ where: { slug } });
    return count > 0;
  }

  async listAll(): Promise<Tenant[]> {
    const records = await this.prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateTenantData): Promise<Tenant> {
    const record = await this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        country: data.country,
        currency: data.currency,
        defaultLocale: data.defaultLocale,
        status: "DRAFT",
      },
    });
    return this.toDomain(record);
  }

  async updateStatus(id: string, status: TenantStatus, reason?: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id },
      data: {
        status,
        // Une mise en service / levée de suspension efface l'ancien motif.
        statusReason: status === TenantStatus.ACTIVE ? null : reason,
        archivedAt: status === TenantStatus.ARCHIVED ? new Date() : undefined,
      },
    });
  }

  async findSettings(id: string): Promise<TenantSettingsRecord | null> {
    const record = await this.prisma.tenant.findUnique({ where: { id } });
    if (!record) return null;
    return {
      name: record.name,
      branding: record.branding,
      legalInfo: record.legalInfo,
      contactEmail: record.contactEmail,
      contactPhone: record.contactPhone,
      offlinePaymentEnabled: record.offlinePaymentEnabled,
      offlinePaymentInstructions: record.offlinePaymentInstructions,
      payoutAccount: record.payoutAccount,
      payoutAccountVerified: record.payoutAccountVerified,
    };
  }

  async updateSettings(id: string, patch: TenantSettingsPatch): Promise<void> {
    const { branding, legalInfo, payoutAccount, ...scalars } = patch;
    const json = (value: unknown) => (value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue));
    await this.prisma.tenant.update({
      where: { id },
      data: {
        ...scalars,
        ...(branding !== undefined ? { branding: json(branding) } : {}),
        ...(legalInfo !== undefined ? { legalInfo: json(legalInfo) } : {}),
        ...(payoutAccount !== undefined ? { payoutAccount: json(payoutAccount) } : {}),
      },
    });
  }

  private toDomain(record: PrismaTenant): Tenant {
    return Tenant.fromPersistence({
      id: record.id,
      name: record.name,
      slug: record.slug,
      status: record.status as TenantStatus,
      statusReason: record.statusReason,
      country: record.country,
      currency: record.currency,
      defaultLocale: record.defaultLocale,
      branding: record.branding,
      offlinePaymentEnabled: record.offlinePaymentEnabled,
      offlinePaymentInstructions: record.offlinePaymentInstructions,
      createdAt: record.createdAt,
    });
  }
}
