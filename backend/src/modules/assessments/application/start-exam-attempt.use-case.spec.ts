import { NotFoundDomainError } from "@shared/errors";

import type { AttemptGrantRepositoryPort } from "../domain/attempt-grant.repository.port";
import { Attempt } from "../domain/attempt.entity";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { Exam, type ExamProps } from "../domain/exam.entity";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { AttemptStatus, QuestionType } from "../domain/question-type";
import { Question } from "../domain/question.entity";

import {
  ExamAttemptsExhaustedError,
  ExamRetryNotAllowedError,
  StartExamAttemptUseCase,
} from "./start-exam-attempt.use-case";

const questions = [
  ["q1", "A"],
  ["q2", "A"],
  ["q3", "B"],
].map(([id, moduleWeight]) =>
  Question.fromPersistence({
    id,
    type: QuestionType.TRUE_FALSE,
    statementHtml: "<p>Q</p>",
    explanation: null,
    points: 1,
    order: 0,
    moduleWeight,
    options: [],
  }),
);

function exam(overrides: Partial<ExamProps> = {}): Exam {
  return Exam.fromPersistence({
    id: "exam-1",
    courseId: "c1",
    passingScorePercent: 50,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes: 60,
    questionsPerModule: null,
    allowReentry: true,
    questions,
    ...overrides,
  });
}

function attempt(status: AttemptStatus, startedAt: Date): Attempt {
  return Attempt.fromPersistence({
    id: "att-old",
    enrollmentId: "enr-1",
    quizId: null,
    examId: "exam-1",
    questionIds: ["q1"],
    status,
    answers: [],
    scorePercent: null,
    startedAt,
    submittedAt: null,
  });
}

function build(options: { exam?: Exam | null; latest?: Attempt | null; used?: number; granted?: number } = {}) {
  const created = { id: "att-new" } as unknown as Attempt;
  const examRepository = {
    findById: jest.fn().mockResolvedValue(options.exam === undefined ? exam() : options.exam),
  };
  const attemptRepository = {
    findLatestForExam: jest.fn().mockResolvedValue(options.latest ?? null),
    countForExam: jest.fn().mockResolvedValue(options.used ?? 0),
    create: jest.fn().mockResolvedValue(created),
  };
  const grantRepository = { totalGrantedForExam: jest.fn().mockResolvedValue(options.granted ?? 0) };
  const useCase = new StartExamAttemptUseCase(
    examRepository as unknown as ExamRepositoryPort,
    attemptRepository as unknown as AttemptRepositoryPort,
    grantRepository as unknown as AttemptGrantRepositoryPort,
  );
  return { useCase, attemptRepository, grantRepository, created };
}

describe("StartExamAttemptUseCase", () => {
  it("raises NotFound when the exam does not exist", async () => {
    const { useCase, attemptRepository } = build({ exam: null });

    await expect(useCase.execute("enr-1", "exam-1")).rejects.toThrow(NotFoundDomainError);
    expect(attemptRepository.create).not.toHaveBeenCalled();
  });

  it("resumes the in-progress attempt without creating a new one", async () => {
    const latest = attempt(AttemptStatus.IN_PROGRESS, new Date());
    const { useCase, attemptRepository } = build({ latest });

    await expect(useCase.execute("enr-1", "exam-1")).resolves.toBe(latest);
    expect(attemptRepository.create).not.toHaveBeenCalled();
  });

  it("creates an attempt with all questions when no per-module draw is configured", async () => {
    const { useCase, attemptRepository, created } = build();

    await expect(useCase.execute("enr-1", "exam-1")).resolves.toBe(created);
    expect(attemptRepository.create).toHaveBeenCalledWith({
      enrollmentId: "enr-1",
      examId: "exam-1",
      questionIds: ["q1", "q2", "q3"],
    });
  });

  it("draws N questions per module when questionsPerModule is configured (ENT-34)", async () => {
    const { useCase, attemptRepository } = build({ exam: exam({ questionsPerModule: 1 }) });

    await useCase.execute("enr-1", "exam-1");

    const { questionIds } = attemptRepository.create.mock.calls[0][0] as { questionIds: string[] };
    expect(questionIds).toHaveLength(2);
    expect(questionIds).toContain("q3");
    expect(questionIds.filter((id) => id === "q1" || id === "q2")).toHaveLength(1);
  });

  it("blocks when attempts are exhausted (RG-10)", async () => {
    const { useCase, attemptRepository } = build({ exam: exam({ maxAttempts: 1 }), used: 1 });

    await expect(useCase.execute("enr-1", "exam-1")).rejects.toThrow(ExamAttemptsExhaustedError);
    expect(attemptRepository.create).not.toHaveBeenCalled();
  });

  it("takes granted extra attempts into account", async () => {
    const { useCase, attemptRepository, grantRepository } = build({
      exam: exam({ maxAttempts: 1 }),
      used: 1,
      granted: 1,
    });

    await useCase.execute("enr-1", "exam-1");

    expect(grantRepository.totalGrantedForExam).toHaveBeenCalledWith("enr-1", "exam-1");
    expect(attemptRepository.create).toHaveBeenCalledTimes(1);
  });

  it("refuses a new attempt when re-entry is not allowed (ENT-36)", async () => {
    const { useCase, attemptRepository } = build({
      exam: exam({ allowReentry: false }),
      latest: attempt(AttemptStatus.FAILED, new Date()),
      used: 1,
    });

    await expect(useCase.execute("enr-1", "exam-1")).rejects.toThrow(ExamRetryNotAllowedError);
    expect(attemptRepository.create).not.toHaveBeenCalled();
  });

  it("allows the first attempt even when re-entry is not allowed", async () => {
    const { useCase, attemptRepository } = build({ exam: exam({ allowReentry: false }) });

    await useCase.execute("enr-1", "exam-1");

    expect(attemptRepository.create).toHaveBeenCalledTimes(1);
  });

  it("starts a fresh attempt when the in-progress one has run out of time", async () => {
    const latest = attempt(AttemptStatus.IN_PROGRESS, new Date(Date.now() - 5 * 3600_000));
    const { useCase, attemptRepository, created } = build({ latest, used: 1 });

    await expect(useCase.execute("enr-1", "exam-1")).resolves.toBe(created);
    expect(attemptRepository.create).toHaveBeenCalledTimes(1);
  });
});
