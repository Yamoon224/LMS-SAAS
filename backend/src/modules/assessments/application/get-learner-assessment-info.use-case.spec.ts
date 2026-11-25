import type { AttemptGrantRepositoryPort } from "../domain/attempt-grant.repository.port";
import { Attempt } from "../domain/attempt.entity";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { Exam, type ExamProps } from "../domain/exam.entity";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { Option } from "../domain/option.vo";
import { AttemptStatus, QuestionType, ResultsDisplay } from "../domain/question-type";
import { Question } from "../domain/question.entity";
import { Quiz, type QuizProps } from "../domain/quiz.entity";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { GetLearnerAssessmentInfoUseCase } from "./get-learner-assessment-info.use-case";

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

const quiz = (overrides: Partial<QuizProps> = {}) =>
  Quiz.fromPersistence({
    id: "quiz-1",
    moduleId: "m1",
    passingScorePercent: 70,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes: 20,
    questionsToDraw: null,
    shuffleQuestions: false,
    shuffleAnswers: false,
    resultsDisplay: ResultsDisplay.SCORE_ONLY,
    requireLiveAttendance: false,
    questions,
    ...overrides,
  });

const exam = (overrides: Partial<ExamProps> = {}) =>
  Exam.fromPersistence({
    id: "exam-1",
    courseId: "c1",
    passingScorePercent: 80,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes: 60,
    questionsPerModule: null,
    allowReentry: true,
    questions,
    ...overrides,
  });

const attempt = (status: AttemptStatus, startedAt: Date, id = "att-1") =>
  Attempt.fromPersistence({
    id,
    enrollmentId: "enr-1",
    quizId: "quiz-1",
    examId: null,
    questionIds: [],
    status,
    answers: [],
    scorePercent: null,
    startedAt,
    submittedAt: null,
  });

function build(
  o: {
    quiz?: Quiz | null;
    exam?: Exam | null;
    used?: number;
    granted?: number;
    latest?: Attempt | null;
  } = {},
) {
  const quizRepository = { findByModuleId: jest.fn().mockResolvedValue(o.quiz === undefined ? null : o.quiz) };
  const examRepository = { findByCourseId: jest.fn().mockResolvedValue(o.exam === undefined ? null : o.exam) };
  const attemptRepository = {
    countForQuiz: jest.fn().mockResolvedValue(o.used ?? 0),
    countForExam: jest.fn().mockResolvedValue(o.used ?? 0),
    findLatestForQuiz: jest.fn().mockResolvedValue(o.latest ?? null),
    findLatestForExam: jest.fn().mockResolvedValue(o.latest ?? null),
  };
  const grantRepository = {
    totalGrantedForQuiz: jest.fn().mockResolvedValue(o.granted ?? 0),
    totalGrantedForExam: jest.fn().mockResolvedValue(o.granted ?? 0),
  };
  return new GetLearnerAssessmentInfoUseCase(
    quizRepository as unknown as QuizRepositoryPort,
    examRepository as unknown as ExamRepositoryPort,
    attemptRepository as unknown as AttemptRepositoryPort,
    grantRepository as unknown as AttemptGrantRepositoryPort,
  );
}

describe("GetLearnerAssessmentInfoUseCase.forModuleQuiz", () => {
  it("returns null when the module has no quiz", async () => {
    await expect(build().forModuleQuiz("enr-1", "m1")).resolves.toBeNull();
  });

  it("describes an untouched quiz with unlimited attempts", async () => {
    const info = await build({ quiz: quiz({ requireLiveAttendance: true }) }).forModuleQuiz("enr-1", "m1");

    expect(info).toEqual({
      kind: "QUIZ",
      id: "quiz-1",
      passingScorePercent: 70,
      timeLimitMinutes: 20,
      maxAttempts: null,
      delayBetweenAttemptsMinutes: null,
      questionCount: 3,
      attemptsUsed: 0,
      extraAttemptsGranted: 0,
      attemptsRemaining: null,
      inProgressAttemptId: null,
      nextAttemptAt: null,
      canStartByRules: true,
      ruleBlock: null,
      requireLiveAttendance: true,
    });
  });

  it("caps the question count to the question bank size", async () => {
    const info = await build({ quiz: quiz({ questionsToDraw: 10 }) }).forModuleQuiz("enr-1", "m1");
    const limited = await build({ quiz: quiz({ questionsToDraw: 2 }) }).forModuleQuiz("enr-1", "m1");

    expect(info?.questionCount).toBe(3);
    expect(limited?.questionCount).toBe(2);
  });

  it("computes remaining attempts including granted extras", async () => {
    const info = await build({ quiz: quiz({ maxAttempts: 3 }), used: 2, granted: 2 }).forModuleQuiz("enr-1", "m1");

    expect(info).toMatchObject({ attemptsUsed: 2, extraAttemptsGranted: 2, attemptsRemaining: 3, ruleBlock: null });
  });

  it("blocks with ATTEMPTS_EXHAUSTED when no attempt remains (RG-10)", async () => {
    const info = await build({
      quiz: quiz({ maxAttempts: 2 }),
      used: 2,
      latest: attempt(AttemptStatus.FAILED, new Date(Date.now() - 3600_000)),
    }).forModuleQuiz("enr-1", "m1");

    expect(info).toMatchObject({
      attemptsRemaining: 0,
      ruleBlock: "ATTEMPTS_EXHAUSTED",
      canStartByRules: false,
      inProgressAttemptId: null,
    });
  });

  it("blocks with RETRY_TOO_SOON and exposes the next attempt date (ENT-28)", async () => {
    const startedAt = new Date();
    const info = await build({
      quiz: quiz({ delayBetweenAttemptsMinutes: 30 }),
      used: 1,
      latest: attempt(AttemptStatus.FAILED, startedAt),
    }).forModuleQuiz("enr-1", "m1");

    expect(info).toMatchObject({ ruleBlock: "RETRY_TOO_SOON", canStartByRules: false });
    expect(info?.nextAttemptAt).toEqual(new Date(startedAt.getTime() + 30 * 60_000));
  });

  it("allows a retry once the delay has elapsed and hides the next attempt date", async () => {
    const info = await build({
      quiz: quiz({ delayBetweenAttemptsMinutes: 30 }),
      used: 1,
      latest: attempt(AttemptStatus.FAILED, new Date(Date.now() - 2 * 3600_000)),
    }).forModuleQuiz("enr-1", "m1");

    expect(info).toMatchObject({ ruleBlock: null, canStartByRules: true, nextAttemptAt: null });
  });

  it("reports the in-progress attempt and never blocks its resumption", async () => {
    const info = await build({
      quiz: quiz({ maxAttempts: 1, delayBetweenAttemptsMinutes: 60 }),
      used: 1,
      latest: attempt(AttemptStatus.IN_PROGRESS, new Date(), "att-live"),
    }).forModuleQuiz("enr-1", "m1");

    expect(info).toMatchObject({ inProgressAttemptId: "att-live", ruleBlock: null, canStartByRules: true });
  });
});

describe("GetLearnerAssessmentInfoUseCase.forCourseExam", () => {
  it("returns null when the course has no exam", async () => {
    await expect(build().forCourseExam("enr-1", "c1")).resolves.toBeNull();
  });

  it("describes an exam with a known question count and no quiz-only field", async () => {
    const info = await build({ exam: exam({ maxAttempts: 2 }), used: 1 }).forCourseExam("enr-1", "c1");

    expect(info).toEqual({
      kind: "EXAM",
      id: "exam-1",
      passingScorePercent: 80,
      timeLimitMinutes: 60,
      maxAttempts: 2,
      delayBetweenAttemptsMinutes: null,
      questionCount: 3,
      attemptsUsed: 1,
      extraAttemptsGranted: 0,
      attemptsRemaining: 1,
      inProgressAttemptId: null,
      nextAttemptAt: null,
      canStartByRules: true,
      ruleBlock: null,
    });
    expect(info).not.toHaveProperty("requireLiveAttendance");
  });

  it("has an unknown question count with a per-module draw", async () => {
    const info = await build({ exam: exam({ questionsPerModule: 2 }) }).forCourseExam("enr-1", "c1");

    expect(info?.questionCount).toBeNull();
  });

  it("blocks with ATTEMPTS_EXHAUSTED before checking re-entry", async () => {
    const info = await build({ exam: exam({ maxAttempts: 1, allowReentry: false }), used: 1 }).forCourseExam(
      "enr-1",
      "c1",
    );

    expect(info?.ruleBlock).toBe("ATTEMPTS_EXHAUSTED");
  });

  it("blocks with REENTRY_NOT_ALLOWED after a first attempt when re-entry is forbidden (ENT-36)", async () => {
    const info = await build({
      exam: exam({ allowReentry: false }),
      used: 1,
      latest: attempt(AttemptStatus.FAILED, new Date()),
    }).forCourseExam("enr-1", "c1");

    expect(info).toMatchObject({ ruleBlock: "REENTRY_NOT_ALLOWED", canStartByRules: false });
  });

  it("does not apply the quiz retry delay to exams", async () => {
    const info = await build({
      exam: exam({ delayBetweenAttemptsMinutes: 60 }),
      used: 1,
      latest: attempt(AttemptStatus.FAILED, new Date()),
    }).forCourseExam("enr-1", "c1");

    expect(info).toMatchObject({ ruleBlock: null, canStartByRules: true, nextAttemptAt: null });
  });
});
