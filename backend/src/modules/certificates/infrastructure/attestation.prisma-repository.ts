import { Injectable } from "@nestjs/common";
import type { Attestation as PrismaAttestation } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { AttestationStatus } from "../domain/attestation-status";
import { Attestation } from "../domain/attestation.entity";
import type { AttestationRepositoryPort, CreateAttestationData } from "../domain/attestation.repository.port";

@Injectable()
export class AttestationPrismaRepository implements AttestationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Attestation | null> {
    const record = await this.prisma.attestation.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByIdInTenant(id: string, tenantId: string): Promise<Attestation | null> {
    const record = await this.prisma.attestation.findFirst({
      where: { id, enrollment: { course: { tenantId } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByEnrollmentId(enrollmentId: string): Promise<Attestation | null> {
    const record = await this.prisma.attestation.findUnique({ where: { enrollmentId } });
    return record ? this.toDomain(record) : null;
  }

  async findByNumber(number: string): Promise<Attestation | null> {
    const record = await this.prisma.attestation.findUnique({ where: { number } });
    return record ? this.toDomain(record) : null;
  }

  async listByTenant(tenantId: string): Promise<Attestation[]> {
    const records = await this.prisma.attestation.findMany({
      where: { enrollment: { course: { tenantId } } },
      orderBy: { issuedAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByUser(userId: string, tenantId: string): Promise<Attestation[]> {
    const records = await this.prisma.attestation.findMany({
      where: { enrollment: { userId, course: { tenantId } } },
      orderBy: { issuedAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateAttestationData): Promise<Attestation> {
    const record = await this.prisma.attestation.create({ data });
    return this.toDomain(record);
  }

  async save(attestation: Attestation): Promise<void> {
    const snapshot = attestation.toSnapshot();
    await this.prisma.attestation.update({
      where: { id: snapshot.id },
      data: {
        status: snapshot.status,
        revocationReason: snapshot.revocationReason,
        revokedAt: snapshot.revokedAt,
      },
    });
  }

  private toDomain(record: PrismaAttestation): Attestation {
    return Attestation.fromPersistence({
      id: record.id,
      enrollmentId: record.enrollmentId,
      number: record.number,
      status: record.status as AttestationStatus,
      learnerNameSnapshot: record.learnerNameSnapshot,
      courseTitleSnapshot: record.courseTitleSnapshot,
      progressPercent: record.progressPercent,
      durationMinutes: record.durationMinutes,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      pdfUrl: record.pdfUrl,
      qrVerificationUrl: record.qrVerificationUrl,
      revocationReason: record.revocationReason,
      issuedAt: record.issuedAt,
      revokedAt: record.revokedAt,
    });
  }
}
