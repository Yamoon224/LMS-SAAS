import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { RawAttempt, RawCourseReport, RawQuestion } from "../domain/course-report";
import type { CourseReportRepositoryPort } from "../domain/course-report.repository.port";

/** Statuts d'inscription ayant donné accès au contenu (donc comptés dans l'entonnoir). */
const ENROLLED_STATUSES = ["ACTIVE", "COMPLETED", "EXPIRED", "SUSPENDED"] as const;

/** Garde-fou : seules les tentatives les plus récentes alimentent le classement des questions. */
const MAX_ATTEMPTS_ANALYZED = 5000;

const QUESTIONS_SELECT = {
  id: true,
  statementHtml: true,
  options: { select: { id: true, isCorrect: true } },
} satisfies Prisma.QuestionSelect;

const COURSE_SELECT = {
  id: true,
  title: true,
  exam: { select: { id: true, questions: { select: QUESTIONS_SELECT } } },
  modules: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      order: true,
      quiz: { select: { id: true, questions: { select: QUESTIONS_SELECT } } },
    },
  },
} satisfies Prisma.CourseSelect;

type QuestionRecord = Prisma.QuestionGetPayload<{ select: typeof QUESTIONS_SELECT }>;
type CourseRecord = Prisma.CourseGetPayload<{ select: typeof COURSE_SELECT }>;

interface FunnelCounts {
  enrolled: number;
  started: number;
  moduleValidated: number;
  examPassed: number;
}

function toRawQuestion(record: QuestionRecord, scope: string): RawQuestion {
  return {
    id: record.id,
    statementHtml: record.statementHtml,
    scope,
    correctOptionIds: record.options.filter((option) => option.isCorrect).map((option) => option.id),
  };
}

function toRawAttempt(attempt: {
  quizId: string | null;
  status: string;
  questionIds: Prisma.JsonValue;
  answers: Prisma.JsonValue;
}): RawAttempt {
  return {
    quizId: attempt.quizId,
    status: attempt.status === "PASSED" ? "PASSED" : "FAILED",
    questionIds: Array.isArray(attempt.questionIds) ? (attempt.questionIds as string[]) : [],
    answers: Array.isArray(attempt.answers) ? (attempt.answers as unknown as RawAttempt["answers"]) : [],
  };
}

function toRawCourseReport(course: CourseRecord, counts: FunnelCounts, attempts: RawAttempt[]): RawCourseReport {
  return {
    courseId: course.id,
    courseTitle: course.title,
    enrolledCount: counts.enrolled,
    startedCount: counts.started,
    moduleValidatedCount: counts.moduleValidated,
    examPassedCount: counts.examPassed,
    modules: course.modules.map((module) => ({
      moduleId: module.id,
      title: module.title,
      order: module.order,
      quizId: module.quiz?.id ?? null,
    })),
    questions: [
      ...course.modules.flatMap((module) => (module.quiz?.questions ?? []).map((q) => toRawQuestion(q, module.title))),
      ...(course.exam?.questions ?? []).map((q) => toRawQuestion(q, "Examen")),
    ],
    attempts,
  };
}

@Injectable()
export class CourseReportPrismaRepository implements CourseReportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getRawCourseReport(tenantId: string, courseId: string): Promise<RawCourseReport | null> {
    // Le filtre tenantId empêche de lire le rapport d'une formation d'une autre entreprise.
    const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId }, select: COURSE_SELECT });
    if (!course) return null;

    const quizIds = course.modules.flatMap((module) => (module.quiz ? [module.quiz.id] : []));
    const examId = course.exam?.id;
    const [counts, attempts] = await Promise.all([
      this.countFunnel(courseId, quizIds, examId),
      this.loadAttempts(courseId, quizIds, examId),
    ]);
    return toRawCourseReport(course, counts, attempts);
  }

  private async countFunnel(courseId: string, quizIds: string[], examId: string | undefined): Promise<FunnelCounts> {
    const [enrolled, started, moduleValidated, examPassed] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId, status: { in: [...ENROLLED_STATUSES] } } }),
      this.prisma.enrollment.count({
        where: {
          courseId,
          status: { in: [...ENROLLED_STATUSES] },
          progress: { some: { OR: [{ state: { not: "NOT_STARTED" } }, { opened: true }] } },
        },
      }),
      quizIds.length === 0
        ? 0
        : this.prisma.enrollment.count({
            where: { courseId, attempts: { some: { status: "PASSED", quizId: { in: quizIds } } } },
          }),
      examId ? this.prisma.enrollment.count({ where: { courseId, attempts: { some: { status: "PASSED", examId } } } }) : 0,
    ]);
    return { enrolled, started, moduleValidated, examPassed };
  }

  private async loadAttempts(courseId: string, quizIds: string[], examId: string | undefined): Promise<RawAttempt[]> {
    const assessmentFilter: Prisma.AttemptWhereInput[] = [
      ...(quizIds.length > 0 ? [{ quizId: { in: quizIds } }] : []),
      ...(examId ? [{ examId }] : []),
    ];
    if (assessmentFilter.length === 0) return [];

    const attempts = await this.prisma.attempt.findMany({
      where: { enrollment: { courseId }, status: { in: ["PASSED", "FAILED"] }, OR: assessmentFilter },
      select: { quizId: true, status: true, questionIds: true, answers: true },
      orderBy: { submittedAt: "desc" },
      take: MAX_ATTEMPTS_ANALYZED,
    });
    return attempts.map(toRawAttempt);
  }
}
