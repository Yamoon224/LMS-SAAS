import { Attempt } from "../domain/attempt.entity";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { Exam } from "../domain/exam.entity";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { AttemptStatus, ResultsDisplay } from "../domain/question-type";
import { Quiz } from "../domain/quiz.entity";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { ExpireOverdueAttemptsUseCase } from "./expire-overdue-attempts.use-case";

const now = new Date("2026-01-01T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

function attempt(id: string, ids: { quizId?: string; examId?: string }, startedAt: Date): Attempt {
  return Attempt.fromPersistence({
    id,
    enrollmentId: "enr-1",
    quizId: ids.quizId ?? null,
    examId: ids.examId ?? null,
    questionIds: [],
    status: AttemptStatus.IN_PROGRESS,
    answers: [],
    scorePercent: null,
    startedAt,
    submittedAt: null,
  });
}

const quiz = (timeLimitMinutes: number | null) =>
  Quiz.fromPersistence({
    id: "quiz-1",
    moduleId: "m1",
    passingScorePercent: 50,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes,
    questionsToDraw: null,
    shuffleQuestions: false,
    shuffleAnswers: false,
    resultsDisplay: ResultsDisplay.SCORE_ONLY,
    requireLiveAttendance: false,
    questions: [],
  });

const exam = (timeLimitMinutes: number) =>
  Exam.fromPersistence({
    id: "exam-1",
    courseId: "c1",
    passingScorePercent: 50,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes,
    questionsPerModule: null,
    allowReentry: true,
    questions: [],
  });

function build(candidates: Attempt[], q: Quiz | null, e: Exam | null) {
  const attemptRepository = {
    listInProgressStartedBefore: jest.fn().mockResolvedValue(candidates),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const quizRepository = { findById: jest.fn().mockResolvedValue(q) };
  const examRepository = { findById: jest.fn().mockResolvedValue(e) };
  const useCase = new ExpireOverdueAttemptsUseCase(
    attemptRepository as unknown as AttemptRepositoryPort,
    quizRepository as unknown as QuizRepositoryPort,
    examRepository as unknown as ExamRepositoryPort,
  );
  return { useCase, attemptRepository, quizRepository, examRepository };
}

describe("ExpireOverdueAttemptsUseCase", () => {
  it("queries in-progress attempts started more than 6 hours before now", async () => {
    const { useCase, attemptRepository } = build([], null, null);

    const count = await useCase.execute(now);

    expect(count).toBe(0);
    expect(attemptRepository.listInProgressStartedBefore).toHaveBeenCalledWith(hoursAgo(6));
  });

  it("expires and saves overdue quiz and exam attempts, returning the count", async () => {
    const qa = attempt("a1", { quizId: "quiz-1" }, hoursAgo(8));
    const ea = attempt("a2", { examId: "exam-1" }, hoursAgo(8));
    const { useCase, attemptRepository } = build([qa, ea], quiz(30), exam(60));

    const count = await useCase.execute(now);

    expect(count).toBe(2);
    expect(qa.status).toBe(AttemptStatus.EXPIRED);
    expect(ea.status).toBe(AttemptStatus.EXPIRED);
    expect(attemptRepository.save).toHaveBeenCalledTimes(2);
    expect(attemptRepository.save).toHaveBeenCalledWith(qa);
    expect(attemptRepository.save).toHaveBeenCalledWith(ea);
  });

  it("leaves attempts whose time limit has not elapsed", async () => {
    const stillOpen = attempt("a1", { examId: "exam-1" }, hoursAgo(7));
    const { useCase, attemptRepository } = build([stillOpen], null, exam(24 * 60));

    expect(await useCase.execute(now)).toBe(0);
    expect(stillOpen.status).toBe(AttemptStatus.IN_PROGRESS);
    expect(attemptRepository.save).not.toHaveBeenCalled();
  });

  it("leaves attempts of an assessment without time limit", async () => {
    const noLimit = attempt("a1", { quizId: "quiz-1" }, hoursAgo(8));
    const { useCase, attemptRepository } = build([noLimit], quiz(null), null);

    expect(await useCase.execute(now)).toBe(0);
    expect(noLimit.status).toBe(AttemptStatus.IN_PROGRESS);
    expect(attemptRepository.save).not.toHaveBeenCalled();
  });

  it("skips attempts whose assessment is gone or that reference neither quiz nor exam", async () => {
    const orphanQuiz = attempt("a1", { quizId: "quiz-1" }, hoursAgo(8));
    const orphanExam = attempt("a2", { examId: "exam-1" }, hoursAgo(8));
    const none = attempt("a3", {}, hoursAgo(8));
    const { useCase, attemptRepository } = build([orphanQuiz, orphanExam, none], null, null);

    expect(await useCase.execute(now)).toBe(0);
    expect(attemptRepository.save).not.toHaveBeenCalled();
  });

  it("defaults to the current time", async () => {
    const { useCase, attemptRepository } = build([], null, null);

    await useCase.execute();

    expect(attemptRepository.listInProgressStartedBefore).toHaveBeenCalledWith(expect.any(Date));
  });
});
