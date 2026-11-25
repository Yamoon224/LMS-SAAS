import { CoursesFacade } from "@modules/courses/courses.facade";
import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { attemptDurationSeconds, buildAttemptsCsv, filterAttempts, paginate } from "../domain/attempt-query";
import type { AttemptFilters, AttemptListRow, Page } from "../domain/attempt-query";
import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";

export interface AttemptQuestionDetail {
  questionId: string;
  statementHtml: string;
  points: number;
  correct: boolean;
  options: { id: string; label: string; selected: boolean; isCorrect: boolean }[];
}

export interface AttemptDetail extends AttemptListRow {
  examId: string;
  courseId: string;
  durationSeconds: number | null;
  questions: AttemptQuestionDetail[];
}

/** Plafond d'export CSV (cohérent avec l'export des tableaux du front). */
const EXPORT_LIMIT = 5000;

/**
 * ENT-37 : tentatives d'un examen (par identifiant d'examen) côté entreprise : liste filtrée et paginée, export CSV,
 * détail en lecture seule. Le tenant est contrôlé via la formation de l'examen (404 si étrangère).
 */
@Injectable()
export class ExamAttemptsQueryUseCase {
  constructor(
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
    @Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort,
    private readonly usersFacade: UsersFacade,
    private readonly coursesFacade: CoursesFacade,
  ) {}

  async search(
    examId: string,
    tenantId: string,
    filters: AttemptFilters,
    page?: number,
    pageSize?: number,
  ): Promise<Page<AttemptListRow>> {
    const rows = await this.load(examId, tenantId);
    return paginate(filterAttempts(rows, filters), page, pageSize);
  }

  async exportCsv(examId: string, tenantId: string, filters: AttemptFilters): Promise<string> {
    const rows = await this.load(examId, tenantId);
    return buildAttemptsCsv(filterAttempts(rows, filters).slice(0, EXPORT_LIMIT));
  }

  async detail(examId: string, attemptId: string, tenantId: string): Promise<AttemptDetail> {
    const exam = await this.assertExam(examId, tenantId);
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt || attempt.examId !== examId) {
      throw new NotFoundDomainError(`Tentative introuvable: ${attemptId}`);
    }
    const snapshot = attempt.toSnapshot();
    const ownership = await this.attemptRepository.findEnrollmentOwnership(attempt.enrollmentId);
    const user = ownership ? (await this.usersFacade.findManyByIds([ownership.userId]))[0] : undefined;

    const drawn = new Set(snapshot.questionIds);
    const questions = exam.questions
      .filter((question) => drawn.has(question.id))
      .map((question) => {
        const selected = new Set(snapshot.answers.find((a) => a.questionId === question.id)?.selectedOptionIds ?? []);
        return {
          questionId: question.id,
          statementHtml: question.statementHtml,
          points: question.points,
          correct: question.isAnsweredCorrectly([...selected]),
          options: question.options.map((option) => ({
            id: option.id,
            label: option.label,
            selected: selected.has(option.id),
            isCorrect: option.isCorrect,
          })),
        };
      });

    return {
      id: snapshot.id,
      enrollmentId: snapshot.enrollmentId,
      learnerName: user?.fullName ?? null,
      email: user?.email ?? null,
      status: snapshot.status,
      scorePercent: snapshot.scorePercent,
      startedAt: snapshot.startedAt,
      submittedAt: snapshot.submittedAt,
      examId,
      courseId: exam.courseId,
      durationSeconds: attemptDurationSeconds(snapshot.startedAt, snapshot.submittedAt),
      questions,
    };
  }

  private async assertExam(examId: string, tenantId: string) {
    const exam = await this.examRepository.findById(examId);
    if (!exam) throw new NotFoundDomainError(`Examen introuvable: ${examId}`);
    await this.coursesFacade.assertCourseInTenant(exam.courseId, tenantId);
    return exam;
  }

  private async load(examId: string, tenantId: string): Promise<AttemptListRow[]> {
    await this.assertExam(examId, tenantId);
    const attempts = await this.attemptRepository.listForExam(examId);
    const users = await this.usersFacade.findManyByIds([...new Set(attempts.map((a) => a.userId))]);
    const userById = new Map(users.map((u) => [u.id, u]));
    return attempts.map((attempt) => ({
      id: attempt.id,
      enrollmentId: attempt.enrollmentId,
      learnerName: userById.get(attempt.userId)?.fullName ?? null,
      email: userById.get(attempt.userId)?.email ?? null,
      status: attempt.status,
      scorePercent: attempt.scorePercent,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
    }));
  }
}
