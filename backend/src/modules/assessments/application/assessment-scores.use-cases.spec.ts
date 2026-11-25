import type { CourseContentFacade } from "@modules/course-content/course-content.facade";

import type { Attempt } from "../domain/attempt.entity";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { Exam } from "../domain/exam.entity";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { ResultsDisplay } from "../domain/question-type";
import { Quiz } from "../domain/quiz.entity";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { CheckModuleQuizPassedUseCase } from "./check-module-quiz-passed.use-case";
import { GetBestExamScoreUseCase } from "./get-best-exam-score.use-case";
import { GetBestQuizScoreUseCase } from "./get-best-quiz-score.use-case";
import { GetExamResultForCourseUseCase } from "./get-exam-result-for-course.use-case";
import { GetWeightedFinalScoreUseCase } from "./get-weighted-final-score.use-case";

const attemptWithScore = (scorePercent: number | null) => ({ scorePercent }) as unknown as Attempt;

const quiz = (id: string, passingScorePercent = 60, weight?: number) =>
  Quiz.fromPersistence({
    id,
    moduleId: `m-${id}`,
    passingScorePercent,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes: null,
    questionsToDraw: null,
    shuffleQuestions: false,
    shuffleAnswers: false,
    resultsDisplay: ResultsDisplay.SCORE_ONLY,
    requireLiveAttendance: false,
    weight,
    questions: [],
  });

const exam = (weight?: number) =>
  Exam.fromPersistence({
    id: "exam-1",
    courseId: "c1",
    passingScorePercent: 60,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes: 60,
    questionsPerModule: null,
    allowReentry: true,
    weight,
    questions: [],
  });

describe("GetBestQuizScoreUseCase (RG-11)", () => {
  const build = (attempts: Attempt[]) => {
    const repository = { listSubmittedForQuiz: jest.fn().mockResolvedValue(attempts) };
    return {
      repository,
      useCase: new GetBestQuizScoreUseCase(repository as unknown as AttemptRepositoryPort),
    };
  };

  it("returns the best score among submitted attempts", async () => {
    const { useCase, repository } = build([attemptWithScore(40), attemptWithScore(85), attemptWithScore(70)]);

    await expect(useCase.execute("enr-1", "quiz-1")).resolves.toBe(85);
    expect(repository.listSubmittedForQuiz).toHaveBeenCalledWith("enr-1", "quiz-1");
  });

  it("ignores attempts without a score", async () => {
    const { useCase } = build([attemptWithScore(null), attemptWithScore(30)]);

    await expect(useCase.execute("enr-1", "quiz-1")).resolves.toBe(30);
  });

  it("returns null when nothing was submitted", async () => {
    const { useCase } = build([]);

    await expect(useCase.execute("enr-1", "quiz-1")).resolves.toBeNull();
  });
});

describe("GetBestExamScoreUseCase", () => {
  const build = (attempts: Attempt[]) => {
    const repository = { listSubmittedForExam: jest.fn().mockResolvedValue(attempts) };
    return {
      repository,
      useCase: new GetBestExamScoreUseCase(repository as unknown as AttemptRepositoryPort),
    };
  };

  it("returns the best score among submitted attempts", async () => {
    const { useCase, repository } = build([attemptWithScore(55), attemptWithScore(90)]);

    await expect(useCase.execute("enr-1", "exam-1")).resolves.toBe(90);
    expect(repository.listSubmittedForExam).toHaveBeenCalledWith("enr-1", "exam-1");
  });

  it("ignores attempts without a score", async () => {
    const { useCase } = build([attemptWithScore(null), attemptWithScore(0)]);

    await expect(useCase.execute("enr-1", "exam-1")).resolves.toBe(0);
  });

  it("returns null when nothing was submitted", async () => {
    const { useCase } = build([]);

    await expect(useCase.execute("enr-1", "exam-1")).resolves.toBeNull();
  });
});

describe("CheckModuleQuizPassedUseCase (RG-08c)", () => {
  const build = (found: Quiz | null, best: number | null) => {
    const quizRepository = { findByModuleId: jest.fn().mockResolvedValue(found) };
    const bestScore = { execute: jest.fn().mockResolvedValue(best) };
    return {
      bestScore,
      useCase: new CheckModuleQuizPassedUseCase(
        quizRepository as unknown as QuizRepositoryPort,
        bestScore as unknown as GetBestQuizScoreUseCase,
      ),
    };
  };

  it("returns null when the module has no quiz", async () => {
    const { useCase, bestScore } = build(null, null);

    await expect(useCase.execute("enr-1", "m1")).resolves.toBeNull();
    expect(bestScore.execute).not.toHaveBeenCalled();
  });

  it("returns false when the quiz was never attempted", async () => {
    const { useCase } = build(quiz("q1"), null);

    await expect(useCase.execute("enr-1", "m1")).resolves.toBe(false);
  });

  it("returns true when the best score reaches the passing score", async () => {
    const { useCase, bestScore } = build(quiz("q1", 60), 60);

    await expect(useCase.execute("enr-1", "m1")).resolves.toBe(true);
    expect(bestScore.execute).toHaveBeenCalledWith("enr-1", "q1");
  });

  it("returns false when the best score is below the passing score", async () => {
    const { useCase } = build(quiz("q1", 60), 59);

    await expect(useCase.execute("enr-1", "m1")).resolves.toBe(false);
  });
});

describe("GetExamResultForCourseUseCase", () => {
  const build = (found: Exam | null, best: number | null) => {
    const examRepository = { findByCourseId: jest.fn().mockResolvedValue(found) };
    const bestScore = { execute: jest.fn().mockResolvedValue(best) };
    return {
      bestScore,
      useCase: new GetExamResultForCourseUseCase(
        examRepository as unknown as ExamRepositoryPort,
        bestScore as unknown as GetBestExamScoreUseCase,
      ),
    };
  };

  it("returns null when the course has no exam", async () => {
    const { useCase, bestScore } = build(null, null);

    await expect(useCase.execute("enr-1", "c1")).resolves.toBeNull();
    expect(bestScore.execute).not.toHaveBeenCalled();
  });

  it("returns the exam id with the best score", async () => {
    const { useCase, bestScore } = build(exam(), 77);

    await expect(useCase.execute("enr-1", "c1")).resolves.toEqual({ examId: "exam-1", scorePercent: 77 });
    expect(bestScore.execute).toHaveBeenCalledWith("enr-1", "exam-1");
  });

  it("returns a null score when the exam was never attempted", async () => {
    const { useCase } = build(exam(), null);

    await expect(useCase.execute("enr-1", "c1")).resolves.toEqual({ examId: "exam-1", scorePercent: null });
  });
});

describe("GetWeightedFinalScoreUseCase (ENT-34)", () => {
  function build(options: {
    modules: { id: string }[];
    quizzes: Record<string, Quiz | null>;
    quizScores: Record<string, number | null>;
    exam: Exam | null;
    examScore?: number | null;
  }) {
    const examRepository = { findByCourseId: jest.fn().mockResolvedValue(options.exam) };
    const quizRepository = {
      findByModuleId: jest.fn().mockImplementation(async (moduleId: string) => options.quizzes[moduleId] ?? null),
    };
    const facade = { listModules: jest.fn().mockResolvedValue(options.modules) };
    const bestExam = { execute: jest.fn().mockResolvedValue(options.examScore ?? null) };
    const bestQuiz = {
      execute: jest.fn().mockImplementation(async (_enr: string, quizId: string) => options.quizScores[quizId] ?? null),
    };
    const useCase = new GetWeightedFinalScoreUseCase(
      examRepository as unknown as ExamRepositoryPort,
      quizRepository as unknown as QuizRepositoryPort,
      facade as unknown as CourseContentFacade,
      bestExam as unknown as GetBestExamScoreUseCase,
      bestQuiz as unknown as GetBestQuizScoreUseCase,
    );
    return { useCase, facade, bestExam, bestQuiz };
  }

  it("averages module quizzes and exam according to their weights", async () => {
    const { useCase, facade, bestExam } = build({
      modules: [{ id: "m-a" }, { id: "m-b" }],
      quizzes: { "m-a": quiz("a", 60, 1), "m-b": quiz("b", 60, 1) },
      quizScores: { a: 60, b: 80 },
      exam: exam(2),
      examScore: 100,
    });

    // (60*1 + 80*1 + 100*2) / 4 = 85
    await expect(useCase.execute("enr-1", "c1")).resolves.toBe(85);
    expect(facade.listModules).toHaveBeenCalledWith("c1");
    expect(bestExam.execute).toHaveBeenCalledWith("enr-1", "exam-1");
  });

  it("skips modules without quiz and unattempted assessments", async () => {
    const { useCase, bestQuiz } = build({
      modules: [{ id: "m-a" }, { id: "m-none" }, { id: "m-b" }],
      quizzes: { "m-a": quiz("a"), "m-b": quiz("b") },
      quizScores: { a: 50, b: null },
      exam: null,
    });

    await expect(useCase.execute("enr-1", "c1")).resolves.toBe(50);
    expect(bestQuiz.execute).toHaveBeenCalledTimes(2);
  });

  it("returns null when no assessment weighs in", async () => {
    const { useCase } = build({ modules: [], quizzes: {}, quizScores: {}, exam: exam(), examScore: null });

    await expect(useCase.execute("enr-1", "c1")).resolves.toBeNull();
  });
});
