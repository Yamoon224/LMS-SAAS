import { NotFoundDomainError } from "@shared/errors";

import { Attempt } from "../domain/attempt.entity";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { Exam } from "../domain/exam.entity";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { Option } from "../domain/option.vo";
import { AttemptStatus, QuestionType, ResultsDisplay } from "../domain/question-type";
import { Question } from "../domain/question.entity";
import { Quiz, type QuizProps } from "../domain/quiz.entity";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { AttemptNotSubmittedError, GetLearnerAttemptUseCase } from "./get-learner-attempt.use-case";

const question = (id: string, explanation: string | null = null) =>
  Question.fromPersistence({
    id,
    type: QuestionType.SINGLE_CHOICE,
    statementHtml: `<p>${id}</p>`,
    explanation,
    points: 2,
    order: 0,
    moduleWeight: null,
    options: [
      Option.fromPersistence({ id: `${id}-b`, label: "B", isCorrect: false, order: 1 }),
      Option.fromPersistence({ id: `${id}-a`, label: "A", isCorrect: true, order: 0 }),
      Option.fromPersistence({ id: `${id}-c`, label: "C", isCorrect: false, order: 2 }),
      Option.fromPersistence({ id: `${id}-d`, label: "D", isCorrect: false, order: 3 }),
    ],
  });

const questions = [question("q1", "Parce que A"), question("q2"), question("q3")];

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
    resultsDisplay: ResultsDisplay.DETAILED,
    requireLiveAttendance: false,
    questions,
    ...overrides,
  });
}

const exam = (timeLimitMinutes = 30) =>
  Exam.fromPersistence({
    id: "exam-1",
    courseId: "c1",
    passingScorePercent: 50,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes,
    questionsPerModule: null,
    allowReentry: true,
    questions,
  });

function attempt(
  o: {
    quizId?: string | null;
    examId?: string | null;
    status?: AttemptStatus;
    startedAt?: Date;
    questionIds?: string[];
  } = {},
): Attempt {
  return Attempt.fromPersistence({
    id: "att-1",
    enrollmentId: "enr-1",
    quizId: o.quizId === undefined ? "quiz-1" : o.quizId,
    examId: o.examId === undefined ? null : o.examId,
    questionIds: o.questionIds ?? ["q1", "q2", "gone"],
    status: o.status ?? AttemptStatus.IN_PROGRESS,
    answers: [{ questionId: "q1", selectedOptionIds: ["q1-a"] }],
    scorePercent: 50,
    startedAt: o.startedAt ?? new Date(),
    submittedAt: null,
  });
}

function build(found: Attempt | null, q: Quiz | null = quiz(), e: Exam | null = exam()) {
  const attemptRepository = { findById: jest.fn().mockResolvedValue(found) };
  const quizRepository = { findById: jest.fn().mockResolvedValue(q) };
  const examRepository = { findById: jest.fn().mockResolvedValue(e) };
  return new GetLearnerAttemptUseCase(
    attemptRepository as unknown as AttemptRepositoryPort,
    quizRepository as unknown as QuizRepositoryPort,
    examRepository as unknown as ExamRepositoryPort,
  );
}

describe("GetLearnerAttemptUseCase.getState", () => {
  it("presents the drawn questions in stored order without any correction data", async () => {
    const state = await build(attempt()).getState("att-1");

    expect(state.id).toBe("att-1");
    expect(state.kind).toBe("QUIZ");
    expect(state.quizId).toBe("quiz-1");
    expect(state.examId).toBeNull();
    expect(state.status).toBe(AttemptStatus.IN_PROGRESS);
    expect(state.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(state.questions[0]).toEqual({
      id: "q1",
      type: QuestionType.SINGLE_CHOICE,
      statementHtml: "<p>q1</p>",
      points: 2,
      options: [
        { id: "q1-a", label: "A" },
        { id: "q1-b", label: "B" },
        { id: "q1-c", label: "C" },
        { id: "q1-d", label: "D" },
      ],
    });
    expect(JSON.stringify(state.questions)).not.toContain("isCorrect");
    expect(JSON.stringify(state.questions)).not.toContain("Parce que A");
  });

  it("returns the recorded answers as copies for resuming", async () => {
    const state = await build(attempt()).getState("att-1");

    expect(state.answers).toEqual([{ questionId: "q1", selectedOptionIds: ["q1-a"] }]);
  });

  it("has no deadline when the quiz has no time limit", async () => {
    const state = await build(attempt()).getState("att-1");

    expect(state.deadline).toBeNull();
    expect(state.timeElapsed).toBe(false);
  });

  it("computes the server-side deadline from the start time and time limit", async () => {
    const startedAt = new Date(Date.now() - 60_000);
    const state = await build(attempt({ startedAt }), quiz({ timeLimitMinutes: 10 })).getState("att-1");

    expect(state.deadline).toEqual(new Date(startedAt.getTime() + 10 * 60_000));
    expect(state.timeElapsed).toBe(false);
    expect(state.serverNow).toBeInstanceOf(Date);
  });

  it("flags the time as elapsed once the deadline has passed (RG-12)", async () => {
    const startedAt = new Date(Date.now() - 3 * 3600_000);
    const state = await build(attempt({ startedAt }), quiz({ timeLimitMinutes: 10 })).getState("att-1");

    expect(state.timeElapsed).toBe(true);
  });

  it("shuffles answers deterministically per attempt when shuffleAnswers is on", async () => {
    const useCase = build(attempt(), quiz({ shuffleAnswers: true }));

    const first = await useCase.getState("att-1");
    const second = await useCase.getState("att-1");

    expect(first.questions[0].options).toEqual(second.questions[0].options);
    expect(first.questions[0].options.map((o) => o.id).sort()).toEqual(["q1-a", "q1-b", "q1-c", "q1-d"]);
  });

  it("builds an exam state with its own deadline", async () => {
    const startedAt = new Date();
    const state = await build(attempt({ quizId: null, examId: "exam-1", startedAt }), quiz(), exam(30)).getState(
      "att-1",
    );

    expect(state.kind).toBe("EXAM");
    expect(state.examId).toBe("exam-1");
    expect(state.deadline).toEqual(new Date(startedAt.getTime() + 30 * 60_000));
  });

  it("raises NotFound when the attempt, the quiz or the exam is missing", async () => {
    await expect(build(null).getState("att-1")).rejects.toThrow(NotFoundDomainError);
    await expect(build(attempt(), null).getState("att-1")).rejects.toThrow(NotFoundDomainError);
    await expect(build(attempt({ quizId: null, examId: "exam-1" }), quiz(), null).getState("att-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });

  it("raises NotFound for an attempt linked to neither quiz nor exam", async () => {
    await expect(build(attempt({ quizId: null, examId: null })).getState("att-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });
});

describe("GetLearnerAttemptUseCase.getResult", () => {
  it("refuses the result of an attempt still in progress", async () => {
    await expect(build(attempt()).getResult("att-1")).rejects.toThrow(AttemptNotSubmittedError);
  });

  it("returns the detailed review of a quiz according to its display setting (ENT-30)", async () => {
    const result = await build(attempt({ status: AttemptStatus.PASSED })).getResult("att-1");

    expect(result).toMatchObject({
      attemptId: "att-1",
      kind: "QUIZ",
      status: AttemptStatus.PASSED,
      passed: true,
      scorePercent: 50,
      passingScorePercent: 50,
      resultsDisplay: ResultsDisplay.DETAILED,
    });
    expect(result.review).toEqual([
      {
        questionId: "q1",
        selectedOptionIds: ["q1-a"],
        isCorrect: true,
        correctOptionIds: ["q1-a"],
        explanation: "Parce que A",
      },
      { questionId: "q2", selectedOptionIds: [], isCorrect: false, correctOptionIds: ["q2-a"], explanation: null },
    ]);
  });

  it("only reveals score and success for an exam", async () => {
    const result = await build(attempt({ quizId: null, examId: "exam-1", status: AttemptStatus.FAILED })).getResult(
      "att-1",
    );

    expect(result.kind).toBe("EXAM");
    expect(result.passed).toBe(false);
    expect(result.resultsDisplay).toBe(ResultsDisplay.SCORE_ONLY);
    expect(result.review).toBeUndefined();
  });
});
