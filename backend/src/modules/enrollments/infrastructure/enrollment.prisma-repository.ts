import { Injectable } from "@nestjs/common";
import type { Enrollment as PrismaEnrollment } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { EnrollmentStatus } from "../domain/enrollment-status";
import { Enrollment } from "../domain/enrollment.entity";
import type {
  CreateEnrollmentData,
  EnrollmentRepositoryPort,
} from "../domain/enrollment.repository.port";
import type { InactivityCandidate } from "../domain/inactivity-reminder";

@Injectable()
export class EnrollmentPrismaRepository implements EnrollmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Enrollment | null> {
    const record = await this.prisma.enrollment.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null> {
    const record = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByUser(userId: string): Promise<Enrollment[]> {
    const records = await this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByCourse(courseId: string, status?: EnrollmentStatus): Promise<Enrollment[]> {
    const records = await this.prisma.enrollment.findMany({
      where: { courseId, status },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateEnrollmentData): Promise<Enrollment> {
    const record = await this.prisma.enrollment.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        status: data.status,
        pricePaid: data.pricePaid,
        currency: data.currency,
        locale: data.locale,
      },
    });
    return this.toDomain(record);
  }

  async save(enrollment: Enrollment): Promise<void> {
    const snapshot = enrollment.toSnapshot();
    await this.prisma.enrollment.update({
      where: { id: snapshot.id },
      data: {
        status: snapshot.status,
        startedAt: snapshot.startedAt,
        expiresAt: snapshot.expiresAt,
        completedAt: snapshot.completedAt,
        offlinePaymentReference: snapshot.offlinePaymentReference,
        offlinePaymentAmount: snapshot.offlinePaymentAmount,
        refusalReason: snapshot.refusalReason,
        manualEnrollmentNote: snapshot.manualEnrollmentNote,
        enrolledByUserId: snapshot.enrolledByUserId,
      },
    });
  }

  async countActiveByCourse(courseId: string): Promise<number> {
    return this.prisma.enrollment.count({ where: { courseId, status: "ACTIVE" } });
  }

  async listExpiredButStillActive(now: Date): Promise<Enrollment[]> {
    const records = await this.prisma.enrollment.findMany({
      where: { status: "ACTIVE", expiresAt: { lt: now } },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listInactivityCandidates(
    inactiveSince: Date,
    remindedBefore: Date,
    now: Date,
    limit: number,
  ): Promise<InactivityCandidate[]> {
    const records = await this.prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        createdAt: { lte: inactiveSince },
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          { OR: [{ lastInactivityReminderAt: null }, { lastInactivityReminderAt: { lte: remindedBefore } }] },
          { OR: [{ startedAt: null }, { startedAt: { lte: inactiveSince } }] },
        ],
        progress: { none: { updatedAt: { gt: inactiveSince } } },
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        status: true,
        expiresAt: true,
        startedAt: true,
        createdAt: true,
        lastInactivityReminderAt: true,
        progress: { select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return records.map((record) => ({
      enrollmentId: record.id,
      userId: record.userId,
      courseId: record.courseId,
      status: record.status as EnrollmentStatus,
      expiresAt: record.expiresAt,
      lastActivityAt: record.progress[0]?.updatedAt ?? record.startedAt ?? record.createdAt,
      lastReminderAt: record.lastInactivityReminderAt,
    }));
  }

  async claimInactivityReminder(enrollmentId: string, at: Date, previousReminderAt: Date | null): Promise<boolean> {
    const result = await this.prisma.enrollment.updateMany({
      where: { id: enrollmentId, status: "ACTIVE", lastInactivityReminderAt: previousReminderAt },
      data: { lastInactivityReminderAt: at },
    });
    return result.count === 1;
  }

  private toDomain(record: PrismaEnrollment): Enrollment {
    return Enrollment.fromPersistence({
      id: record.id,
      userId: record.userId,
      courseId: record.courseId,
      status: record.status as EnrollmentStatus,
      pricePaid: record.pricePaid,
      currency: record.currency,
      locale: record.locale,
      startedAt: record.startedAt,
      expiresAt: record.expiresAt,
      completedAt: record.completedAt,
      offlinePaymentReference: record.offlinePaymentReference,
      offlinePaymentAmount: record.offlinePaymentAmount,
      refusalReason: record.refusalReason,
      manualEnrollmentNote: record.manualEnrollmentNote,
      enrolledByUserId: record.enrolledByUserId,
    });
  }
}
