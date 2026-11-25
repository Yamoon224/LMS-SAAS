import { Injectable } from "@nestjs/common";
import type { Progress as PrismaProgress } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { ProgressState } from "../domain/progress-state";
import { Progress } from "../domain/progress.entity";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

@Injectable()
export class ProgressPrismaRepository implements ProgressRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEnrollmentAndLesson(enrollmentId: string, lessonId: string): Promise<Progress | null> {
    const record = await this.prisma.progress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByEnrollment(enrollmentId: string): Promise<Progress[]> {
    const records = await this.prisma.progress.findMany({ where: { enrollmentId } });
    return records.map((record) => this.toDomain(record));
  }

  async create(enrollmentId: string, lessonId: string): Promise<Progress> {
    const record = await this.prisma.progress.create({
      data: { enrollmentId, lessonId, state: "NOT_STARTED" },
    });
    return this.toDomain(record);
  }

  async save(progress: Progress): Promise<void> {
    const snapshot = progress.toSnapshot();
    await this.prisma.progress.update({
      where: { id: snapshot.id },
      data: {
        state: snapshot.state,
        watchedPercent: snapshot.watchedPercent,
        opened: snapshot.opened,
        startedAt: snapshot.startedAt,
        completedAt: snapshot.completedAt,
      },
    });
  }

  async deleteAllForEnrollment(enrollmentId: string): Promise<void> {
    await this.prisma.progress.deleteMany({ where: { enrollmentId } });
  }

  private toDomain(record: PrismaProgress): Progress {
    return Progress.fromPersistence({
      id: record.id,
      enrollmentId: record.enrollmentId,
      lessonId: record.lessonId,
      state: record.state as ProgressState,
      watchedPercent: record.watchedPercent,
      opened: record.opened,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
    });
  }
}
