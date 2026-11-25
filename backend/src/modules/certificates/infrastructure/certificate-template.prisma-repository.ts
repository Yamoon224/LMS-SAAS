import { Injectable } from "@nestjs/common";
import type { CertificateTemplate as PrismaCertificateTemplate } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { CertificateDesign } from "../domain/certificate-template.entity";
import { CertificateTemplate } from "../domain/certificate-template.entity";
import type {
  CertificateTemplateRepositoryPort,
  CreateCertificateTemplateData,
} from "../domain/certificate-template.repository.port";

@Injectable()
export class CertificateTemplatePrismaRepository implements CertificateTemplateRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CertificateTemplate | null> {
    const record = await this.prisma.certificateTemplate.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findDefaultForTenant(tenantId: string): Promise<CertificateTemplate | null> {
    const record = await this.prisma.certificateTemplate.findFirst({
      where: { tenantId, isDefault: true },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByTenant(tenantId: string): Promise<CertificateTemplate[]> {
    const records = await this.prisma.certificateTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateCertificateTemplateData): Promise<CertificateTemplate> {
    const record = await this.prisma.certificateTemplate.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        design: data.design as object,
        isDefault: data.isDefault,
      },
    });
    return this.toDomain(record);
  }

  async clearDefaultForTenant(tenantId: string): Promise<void> {
    await this.prisma.certificateTemplate.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private toDomain(record: PrismaCertificateTemplate): CertificateTemplate {
    return CertificateTemplate.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      design: record.design as CertificateDesign,
      isDefault: record.isDefault,
      createdAt: record.createdAt,
    });
  }
}
