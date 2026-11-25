import { NotFoundDomainError } from "@shared/errors";

import type { AttemptGrantRepositoryPort } from "../domain/attempt-grant.repository.port";
import { Attempt } from "../domain/attempt.entity";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { Option } from "../domain/option.vo";
import { AttemptStatus, QuestionType, ResultsDisplay } from "../domain/question-type";
import { Question } from "../domain/question.entity";
import { Quiz, type QuizProps } from "../domain/quiz.entity";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { AttemptsExhaustedError, RetryTooSoonError, StartQuizAttemptUseCase } from "./start-quiz-attempt.use-case";

const questions = ["q1", "q2", "q3"].map((id) =>
  Question.fromPersistence({
    id,
    type: QuestionType.SINGLE_CHOICE,
    statementHtml: "<p>Q</p>",
    explanation: null,
    points: 1,
    order: 0,
    moduleWeight: null,
    options: [Option.fromPersistence({ id: "a", label: "a", isCorrect: true, order: 0 })],
  }),
);

function quiz(overrides: Partial<QuizProps> = {}): Quiz {
  return Quiz.fromPersistence({
    id: "quiz-1",
    moduleId: "m1",
    passingScorePercent: 50,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes: null,
    questionsToDraw: null,
    shuffleQuestions: false,
    shuffleAnswers: false,
    resultsDisplay: ResultsDisplay.SCORE_ONLY,
    requireLiveAttendance: false,
    questions,
    ...overrides,
  });
}

function attempt(status: AttemptStatus, startedAt: Date): Attempt {
  return Attempt.fromPersistence({
    id: "att-old",
    enrollmentId: "enr-1",
    quizId: "quiz-1",
    examId: null,
    questionIds: ["q1"],
    status,
    answers: [],
    scorePercent: null,
    startedAt,
    submittedAt: null,
  });
}

function build(options: { quiz?: Quiz | null; latest?: Attempt | null; used?: number; granted?: number } = {}) {
  const created = { id: "att-new" } as unknown as Attempt;
  const quizRepository = {
    findById: jest.fn().mockResolvedValue(options.quiz === undefined ? quiz() : options.quiz),
  };
  const attemptRepository = {
    findLatestForQuiz: jest.fn().mockResolvedValue(options.latest ?? null),
    countForQuiz: jest.fn().mockResolvedValue(options.used ?? 0),
    create: jest.fn().mockResolvedValue(created),
  };
  const grantRepository = { totalGrantedForQuiz: jest.fn().mockResolvedValue(options.granted ?? 0) };
  const useCase = new StartQuizAttemptUseCase(
    quizRepository as unknown as QuizRepositoryPort,
    attemptRepository as unknown as AttemptRepositoryPort,
    grantRepository as unknown as AttemptGrantRepositoryPort,
  );
  return { useCase, attemptRepository, grantRepository, created };
}

describe("StartQuizAttemptUseCase", () => {
  it("raises NotFound when the quiz does not exist", async () => {
    const { useCase, attemptRepository } = build({ quiz: null });

    await expect(useCase.execute("enr-1", "quiz-1")).rejects.toThrow(NotFoundDomainError);
    expect(attemptRepository.create).not.toHaveBeenCalled();
  });

  it("resumes the in-progress attempt instead of creating a new one", async () => {
    const latest = attempt(AttemptStatus.IN_PROGRESS, new Date());
    const { useCase, attemptRepository } = build({ latest });

    await expect(useCase.execute("enr-1", "quiz-1")).resolves.toBe(latest);
    expect(attemptRepository.create).not.toHaveBeenCalled();
  });

  it("creates an attempt with all questions when nothing restricts the draw", async () => {
    const { useCase, attemptRepository, created } = build();

    await expect(useCase.execute("enr-1", "quiz-1")).resolves.toBe(created);
    expect(attemptRepository.create).toHaveBeenCalledWith({
      enrollmentId: "enr-1",
      quizId: "quiz-1",
      questionIds: ["q1", "q2", "q3"],
    });
  });

  it("draws only the configured number of questions (ENT-28)", async () => {
    const { useCase, attemptRepository } = build({ quiz: quiz({ questionsToDraw: 2 }) });

    await useCase.execute("enr-1", "quiz-1");

    const { questionIds } = attemptRepository.create.mock.calls[0][0] as { questionIds: string[] };
    expect(questionIds).toHaveLength(2);
    expect(questions.map((q) => q.id)).toEqual(expect.arrayContaining(questionIds));
  });

  it("blocks when attempts are exhausted (RG-10)", async () => {
    const { useCase, attemptRepository } = build({ quiz: quiz({ maxAttempts: 2 }), used: 2 });

    await expect(useCase.execute("enr-1", "quiz-1")).rejects.toThrow(AttemptsExhaustedError);
    expect(attemptRepository.create).not.toHaveBeenCalled();
  });

  it("allows another attempt when extra attempts were granted (ENT-31)", async () => {
    const { useCase, attemptRepository, grantRepository } = build({
      quiz: quiz({ maxAttempts: 2 }),
      used: 2,
      granted: 1,
    });

    await useCase.execute("enr-1", "quiz-1");

    expect(grantRepository.totalGrantedForQuiz).toHaveBeenCalledWith("enr-1", "quiz-1");
    expect(attemptRepository.create).toHaveBeenCalledTimes(1);
  });

  it("refuses a retry before the minimum delay has elapsed (ENT-28)", async () => {
    const latest = attempt(AttemptStatus.FAILED, new Date());
    const { useCase, attemptRepository } = build({
      quiz: quiz({ delayBetweenAttemptsMinutes: 60 }),
      latest,
      used: 1,
    });

    await expect(useCase.execute("enr-1", "quiz-1")).rejects.toThrow(RetryTooSoonError);
    expect(attemptRepository.create).not.toHaveBeenCalled();
  });

  it("allows a retry once the delay has elapsed", async () => {
    const latest = attempt(AttemptStatus.FAILED, new Date(Date.now() - 2 * 3600_000));
    const { useCase, attemptRepository } = build({
      quiz: quiz({ delayBetweenAttemptsMinutes: 60 }),
      latest,
      used: 1,
    });

    await useCase.execute("enr-1", "quiz-1");

    expect(attemptRepository.create).toHaveBeenCalledTimes(1);
  });

  it("starts a fresh attempt when the in-progress one has run out of time", async () => {
    const latest = attempt(AttemptStatus.IN_PROGRESS, new Date(Date.now() - 3 * 3600_000));
    const { useCase, attemptRepository, created } = build({
      quiz: quiz({ timeLimitMinutes: 10 }),
      latest,
      used: 1,
    });

    await expect(useCase.execute("enr-1", "quiz-1")).resolves.toBe(created);
    expect(attemptRepository.create).toHaveBeenCalledTimes(1);
  });
});
