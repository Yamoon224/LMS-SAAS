import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type {
  AttemptGrantRepositoryPort,
  GrantAttemptsData,
} from "../domain/attempt-grant.repository.port";

@Injectable()
export class AttemptGrantPrismaRepository implements AttemptGrantRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async grant(data: GrantAttemptsData): Promise<void> {
    await this.prisma.attemptGrant.create({
      data: {
        enrollmentId: data.enrollmentId,
        quizId: data.quizId,
        examId: data.examId,
        extraAttempts: data.extraAttempts,
        grantedByUserId: data.grantedByUserId,
      },
    });
  }

  async findEnrollmentCourseId(enrollmentId: string): Promise<string | null> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { courseId: true },
    });
    return enrollment?.courseId ?? null;
  }

  async totalGrantedForQuiz(enrollmentId: string, quizId: string): Promise<number> {
    const result = await this.prisma.attemptGrant.aggregate({
      where: { enrollmentId, quizId },
      _sum: { extraAttempts: true },
    });
    return result._sum.extraAttempts ?? 0;
  }

  async totalGrantedForExam(enrollmentId: string, examId: string): Promise<number> {
    const result = await this.prisma.attemptGrant.aggregate({
      where: { enrollmentId, examId },
      _sum: { extraAttempts: true },
    });
    return result._sum.extraAttempts ?? 0;
  }
}
