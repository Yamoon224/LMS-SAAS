import { Injectable } from "@nestjs/common";
import type { Attempt as PrismaAttempt } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { Attempt } from "../domain/attempt.entity";
import type { SubmittedAnswer } from "../domain/attempt.entity";
import type {
  AttemptRepositoryPort,
  CreateAttemptData,
  EnrollmentOwnershipInfo,
  ExamAttemptRow,
} from "../domain/attempt.repository.port";
import { AttemptStatus } from "../domain/question-type";

@Injectable()
export class AttemptPrismaRepository implements AttemptRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Attempt | null> {
    const record = await this.prisma.attempt.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findEnrollmentOwnership(enrollmentId: string): Promise<EnrollmentOwnershipInfo | null> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { userId: true, courseId: true, status: true, expiresAt: true },
    });
    return enrollment
      ? {
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          status: enrollment.status,
          expiresAt: enrollment.expiresAt,
        }
      : null;
  }

  async listForExam(examId: string): Promise<ExamAttemptRow[]> {
    const records = await this.prisma.attempt.findMany({
      where: { examId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        enrollmentId: true,
        status: true,
        scorePercent: true,
        startedAt: true,
        submittedAt: true,
        enrollment: { select: { userId: true } },
      },
    });
    return records.map((record) => ({
      id: record.id,
      enrollmentId: record.enrollmentId,
      userId: record.enrollment.userId,
      status: record.status,
      scorePercent: record.scorePercent,
      startedAt: record.startedAt,
      submittedAt: record.submittedAt,
    }));
  }

  async create(data: CreateAttemptData): Promise<Attempt> {
    const record = await this.prisma.attempt.create({
      data: {
        enrollmentId: data.enrollmentId,
        quizId: data.quizId,
        examId: data.examId,
        questionIds: data.questionIds,
        status: "IN_PROGRESS",
      },
    });
    return this.toDomain(record);
  }

  async save(attempt: Attempt): Promise<void> {
    const snapshot = attempt.toSnapshot();
    await this.prisma.attempt.update({
      where: { id: snapshot.id },
      data: {
        status: snapshot.status,
        answers: snapshot.answers as unknown as object,
        scorePercent: snapshot.scorePercent,
        submittedAt: snapshot.submittedAt,
      },
    });
  }

  async countForQuiz(enrollmentId: string, quizId: string): Promise<number> {
    return this.prisma.attempt.count({
      where: { enrollmentId, quizId, status: { not: "IN_PROGRESS" } },
    });
  }

  async countForExam(enrollmentId: string, examId: string): Promise<number> {
    return this.prisma.attempt.count({
      where: { enrollmentId, examId, status: { not: "IN_PROGRESS" } },
    });
  }

  async findLatestForQuiz(enrollmentId: string, quizId: string): Promise<Attempt | null> {
    const record = await this.prisma.attempt.findFirst({
      where: { enrollmentId, quizId },
      orderBy: { startedAt: "desc" },
    });
    return record ? this.toDomain(record) : null;
  }

  async findLatestForExam(enrollmentId: string, examId: string): Promise<Attempt | null> {
    const record = await this.prisma.attempt.findFirst({
      where: { enrollmentId, examId },
      orderBy: { startedAt: "desc" },
    });
    return record ? this.toDomain(record) : null;
  }

  async listSubmittedForQuiz(enrollmentId: string, quizId: string): Promise<Attempt[]> {
    const records = await this.prisma.attempt.findMany({
      where: { enrollmentId, quizId, status: { in: ["PASSED", "FAILED"] } },
    });
    return records.map((record) => this.toDomain(record));
  }

  async countSubmittedForEnrollment(enrollmentId: string): Promise<number> {
    return this.prisma.attempt.count({ where: { enrollmentId, status: { in: ["SUBMITTED", "PASSED", "FAILED"] } } });
  }

  async listSubmittedForExam(enrollmentId: string, examId: string): Promise<Attempt[]> {
    const records = await this.prisma.attempt.findMany({
      where: { enrollmentId, examId, status: { in: ["PASSED", "FAILED"] } },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listInProgressStartedBefore(cutoff: Date): Promise<Attempt[]> {
    const records = await this.prisma.attempt.findMany({
      where: { status: "IN_PROGRESS", startedAt: { lt: cutoff } },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaAttempt): Attempt {
    return Attempt.fromPersistence({
      id: record.id,
      enrollmentId: record.enrollmentId,
      quizId: record.quizId,
      examId: record.examId,
      questionIds: record.questionIds as string[],
      status: record.status as AttemptStatus,
      answers: (record.answers as unknown as SubmittedAnswer[] | null) ?? [],
      scorePercent: record.scorePercent,
      startedAt: record.startedAt,
      submittedAt: record.submittedAt,
    });
  }
}
