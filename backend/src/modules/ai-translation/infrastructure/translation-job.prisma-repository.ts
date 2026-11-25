import { Injectable } from "@nestjs/common";
import type { TranslationJob as PrismaTranslationJob } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { TranslationJobStatus } from "../domain/translation-job-status";
import { TranslationJob } from "../domain/translation-job.entity";
import type {
  CreateTranslationJobData,
  TranslationJobRepositoryPort,
} from "../domain/translation-job.repository.port";

@Injectable()
export class TranslationJobPrismaRepository implements TranslationJobRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TranslationJob | null> {
    const record = await this.prisma.translationJob.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async listByCourse(courseId: string): Promise<TranslationJob[]> {
    const records = await this.prisma.translationJob.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByTenant(tenantId: string): Promise<TranslationJob[]> {
    const records = await this.prisma.translationJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateTranslationJobData): Promise<TranslationJob> {
    const record = await this.prisma.translationJob.create({
      data: {
        tenantId: data.tenantId,
        courseId: data.courseId,
        targetLocale: data.targetLocale,
        wordCount: data.wordCount,
        estimatedCredits: data.estimatedCredits,
        status: "ESTIMATED",
      },
    });
    return this.toDomain(record);
  }

  async save(job: TranslationJob): Promise<void> {
    const snapshot = job.toSnapshot();
    await this.prisma.translationJob.update({
      where: { id: snapshot.id },
      data: {
        status: snapshot.status,
        debitedCredits: snapshot.debitedCredits,
        errorMessage: snapshot.errorMessage,
        completedAt: snapshot.completedAt,
      },
    });
  }

  private toDomain(record: PrismaTranslationJob): TranslationJob {
    return TranslationJob.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      courseId: record.courseId,
      targetLocale: record.targetLocale,
      wordCount: record.wordCount,
      estimatedCredits: record.estimatedCredits,
      debitedCredits: record.debitedCredits,
      status: record.status as TranslationJobStatus,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
    });
  }
}
