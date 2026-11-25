import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { UsersFacade } from "@modules/users/users.facade";
import { NotFoundDomainError } from "@shared/errors";

import { Attempt } from "../domain/attempt.entity";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { Exam } from "../domain/exam.entity";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { Option } from "../domain/option.vo";
import { AttemptStatus, QuestionType } from "../domain/question-type";
import { Question } from "../domain/question.entity";

import { ExamAttemptsQueryUseCase } from "./exam-attempts-query.use-case";

describe("ExamAttemptsQueryUseCase (ENT-37)", () => {
  const t0 = new Date("2026-11-01T10:00:00Z");
  const question = Question.fromPersistence({
    id: "q1",
    type: QuestionType.SINGLE_CHOICE,
    statementHtml: "<p>2+2 ?</p>",
    explanation: null,
    points: 2,
    order: 0,
    moduleWeight: null,
    options: [
      Option.fromPersistence({ id: "o1", label: "4", isCorrect: true, order: 0 }),
      Option.fromPersistence({ id: "o2", label: "5", isCorrect: false, order: 1 }),
    ],
  });
  const exam = Exam.fromPersistence({
    id: "exam-1",
    courseId: "course-1",
    passingScorePercent: 60,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes: 60,
    questionsPerModule: null,
    allowReentry: false,
    questions: [question],
  });
  const attempt = Attempt.fromPersistence({
    id: "a1",
    enrollmentId: "e1",
    quizId: null,
    examId: "exam-1",
    questionIds: ["q1"],
    status: AttemptStatus.FAILED,
    answers: [{ questionId: "q1", selectedOptionIds: ["o2"] }],
    scorePercent: 0,
    startedAt: t0,
    submittedAt: new Date(t0.getTime() + 600_000),
  });

  function build(opts: { examFound?: boolean; foreignTenant?: boolean } = {}) {
    const exams = {
      findById: jest.fn().mockResolvedValue(opts.examFound === false ? null : exam),
    } as unknown as ExamRepositoryPort;
    const attempts = {
      listForExam: jest.fn().mockResolvedValue([
        { id: "a1", enrollmentId: "e1", userId: "u1", status: "FAILED", scorePercent: 0, startedAt: t0, submittedAt: t0 },
        { id: "a2", enrollmentId: "e2", userId: "u2", status: "PASSED", scorePercent: 90, startedAt: t0, submittedAt: t0 },
      ]),
      findById: jest.fn().mockImplementation((id: string) => Promise.resolve(id === "a1" ? attempt : null)),
      findEnrollmentOwnership: jest.fn().mockResolvedValue({ userId: "u1" }),
    } as unknown as AttemptRepositoryPort;
    const users = {
      findManyByIds: jest.fn().mockResolvedValue([
        { id: "u1", fullName: "Aya", email: "aya@ex.com" },
        { id: "u2", fullName: "Paul", email: "paul@ex.com" },
      ]),
    } as unknown as UsersFacade;
    const courses = {
      assertCourseInTenant: jest
        .fn()
        .mockImplementation(() => (opts.foreignTenant ? Promise.reject(new NotFoundDomainError("x")) : Promise.resolve())),
    } as unknown as CoursesFacade;
    return { useCase: new ExamAttemptsQueryUseCase(exams, attempts, users, courses), courses };
  }

  it("filters and paginates server-side", async () => {
    const { useCase } = build();
    const page = await useCase.search("exam-1", "t1", { status: "PASSED" }, 1, 10);
    expect(page.total).toBe(1);
    expect(page.items[0]?.learnerName).toBe("Paul");
    const all = await useCase.search("exam-1", "t1", {}, 2, 1);
    expect(all).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(all.items).toHaveLength(1);
  });

  it("exports the filtered rows as CSV", async () => {
    const { useCase } = build();
    const csv = await useCase.exportCsv("exam-1", "t1", { learner: "aya" });
    expect(csv.trim().split("\r\n")).toHaveLength(2);
    expect(csv).toContain("aya@ex.com");
    expect(csv).not.toContain("paul@ex.com");
  });

  it("refuses an exam of another tenant", async () => {
    const { useCase } = build({ foreignTenant: true });
    await expect(useCase.search("exam-1", "other", {})).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.detail("exam-1", "a1", "other")).rejects.toThrow(NotFoundDomainError);
  });

  it("404s for an unknown exam", async () => {
    const { useCase } = build({ examFound: false });
    await expect(useCase.search("nope", "t1", {})).rejects.toThrow(NotFoundDomainError);
  });

  it("returns a read-only detail with given answers, score and duration", async () => {
    const { useCase } = build();
    const detail = await useCase.detail("exam-1", "a1", "t1");
    expect(detail.durationSeconds).toBe(600);
    expect(detail.learnerName).toBe("Aya");
    expect(detail.questions).toHaveLength(1);
    expect(detail.questions[0]).toMatchObject({ correct: false, points: 2 });
    expect(detail.questions[0]?.options.find((o) => o.id === "o2")).toMatchObject({ selected: true, isCorrect: false });
  });

  it("404s when the attempt does not belong to this exam", async () => {
    const { useCase } = build();
    await expect(useCase.detail("exam-1", "unknown", "t1")).rejects.toThrow(NotFoundDomainError);
  });
});
