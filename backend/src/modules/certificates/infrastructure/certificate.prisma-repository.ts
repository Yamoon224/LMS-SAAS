import { Injectable } from "@nestjs/common";
import type { Certificate as PrismaCertificate } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { CertificateStatus } from "../domain/certificate-status";
import { Certificate } from "../domain/certificate.entity";
import type {
  CertificateRepositoryPort,
  CreateCertificateData,
} from "../domain/certificate.repository.port";

@Injectable()
export class CertificatePrismaRepository implements CertificateRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Certificate | null> {
    const record = await this.prisma.certificate.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByIdInTenant(id: string, tenantId: string): Promise<Certificate | null> {
    const record = await this.prisma.certificate.findFirst({
      where: { id, enrollment: { course: { tenantId } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByEnrollmentId(enrollmentId: string): Promise<Certificate | null> {
    const record = await this.prisma.certificate.findUnique({ where: { enrollmentId } });
    return record ? this.toDomain(record) : null;
  }

  async findByNumber(number: string): Promise<Certificate | null> {
    const record = await this.prisma.certificate.findUnique({ where: { number } });
    return record ? this.toDomain(record) : null;
  }

  async listByTenant(tenantId: string): Promise<Certificate[]> {
    const records = await this.prisma.certificate.findMany({
      where: { enrollment: { course: { tenantId } } },
      orderBy: { issuedAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateCertificateData): Promise<Certificate> {
    const record = await this.prisma.certificate.create({
      data: {
        enrollmentId: data.enrollmentId,
        templateId: data.templateId,
        number: data.number,
        learnerNameSnapshot: data.learnerNameSnapshot,
        courseTitleSnapshot: data.courseTitleSnapshot,
        scorePercent: data.scorePercent,
        pdfUrl: data.pdfUrl,
        qrVerificationUrl: data.qrVerificationUrl,
      },
    });
    return this.toDomain(record);
  }

  async save(certificate: Certificate): Promise<void> {
    const snapshot = certificate.toSnapshot();
    await this.prisma.certificate.update({
      where: { id: snapshot.id },
      data: {
        status: snapshot.status,
        revocationReason: snapshot.revocationReason,
        revokedAt: snapshot.revokedAt,
      },
    });
  }

  private toDomain(record: PrismaCertificate): Certificate {
    return Certificate.fromPersistence({
      id: record.id,
      enrollmentId: record.enrollmentId,
      templateId: record.templateId,
      number: record.number,
      status: record.status as CertificateStatus,
      learnerNameSnapshot: record.learnerNameSnapshot,
      courseTitleSnapshot: record.courseTitleSnapshot,
      scorePercent: record.scorePercent,
      pdfUrl: record.pdfUrl,
      qrVerificationUrl: record.qrVerificationUrl,
      revocationReason: record.revocationReason,
      issuedAt: record.issuedAt,
      revokedAt: record.revokedAt,
    });
  }
}
