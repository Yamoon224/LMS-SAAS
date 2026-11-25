import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { ExamPassedEvent, QuizPassedEvent } from "../assessments.events";
import { Attempt } from "../domain/attempt.entity";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { Exam } from "../domain/exam.entity";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { Option } from "../domain/option.vo";
import { AttemptStatus, QuestionType, ResultsDisplay } from "../domain/question-type";
import { Question } from "../domain/question.entity";
import { Quiz } from "../domain/quiz.entity";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { AttemptAlreadySubmittedError, SubmitAttemptUseCase } from "./submit-attempt.use-case";

const question = Question.fromPersistence({
  id: "q1",
  type: QuestionType.SINGLE_CHOICE,
  statementHtml: "<p>Q</p>",
  explanation: null,
  points: 1,
  order: 0,
  moduleWeight: null,
  options: [
    Option.fromPersistence({ id: "ok", label: "ok", isCorrect: true, order: 0 }),
    Option.fromPersistence({ id: "ko", label: "ko", isCorrect: false, order: 1 }),
  ],
});

function quiz(timeLimitMinutes: number | null = null): Quiz {
  return Quiz.fromPersistence({
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
    questions: [question],
  });
}

function exam(timeLimitMinutes = 60): Exam {
  return Exam.fromPersistence({
    id: "exam-1",
    courseId: "c1",
    passingScorePercent: 50,
    maxAttempts: null,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes,
    questionsPerModule: null,
    allowReentry: true,
    questions: [question],
  });
}

function attempt(
  overrides: { quizId?: string; examId?: string; status?: AttemptStatus; startedAt?: Date; selected?: string } = {},
) {
  return Attempt.fromPersistence({
    id: "att-1",
    enrollmentId: "enr-1",
    quizId: overrides.quizId ?? null,
    examId: overrides.examId ?? null,
    questionIds: ["q1"],
    status: overrides.status ?? AttemptStatus.IN_PROGRESS,
    answers: [{ questionId: "q1", selectedOptionIds: [overrides.selected ?? "ok"] }],
    scorePercent: null,
    startedAt: overrides.startedAt ?? new Date(),
    submittedAt: null,
  });
}

function build(found: Attempt | null, q: Quiz | null = quiz(), e: Exam | null = exam()) {
  const attemptRepository = {
    findById: jest.fn().mockResolvedValue(found),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const quizRepository = { findById: jest.fn().mockResolvedValue(q) };
  const examRepository = { findById: jest.fn().mockResolvedValue(e) };
  const eventEmitter = { emit: jest.fn() };
  const useCase = new SubmitAttemptUseCase(
    attemptRepository as unknown as AttemptRepositoryPort,
    quizRepository as unknown as QuizRepositoryPort,
    examRepository as unknown as ExamRepositoryPort,
    eventEmitter as unknown as EventEmitter2,
  );
  return { useCase, attemptRepository, quizRepository, examRepository, eventEmitter };
}

const longAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

describe("SubmitAttemptUseCase", () => {
  it("raises NotFound when the attempt does not exist", async () => {
    const { useCase, attemptRepository } = build(null);

    await expect(useCase.execute("nope")).rejects.toThrow(NotFoundDomainError);
    expect(attemptRepository.save).not.toHaveBeenCalled();
  });

  it("rejects an attempt that is no longer in progress", async () => {
    const { useCase, attemptRepository } = build(attempt({ quizId: "quiz-1", status: AttemptStatus.PASSED }));

    await expect(useCase.execute("att-1")).rejects.toThrow(AttemptAlreadySubmittedError);
    expect(attemptRepository.save).not.toHaveBeenCalled();
  });

  it("does nothing for an attempt linked to neither a quiz nor an exam", async () => {
    const { useCase, attemptRepository, eventEmitter } = build(attempt());

    await useCase.execute("att-1");

    expect(attemptRepository.save).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  describe("quiz attempts", () => {
    it("passes, persists and emits quiz.passed when the score is sufficient", async () => {
      const a = attempt({ quizId: "quiz-1" });
      const { useCase, attemptRepository, eventEmitter } = build(a);

      await useCase.execute("att-1");

      expect(a.status).toBe(AttemptStatus.PASSED);
      expect(a.scorePercent).toBe(100);
      expect(attemptRepository.save).toHaveBeenCalledWith(a);
      expect(eventEmitter.emit).toHaveBeenCalledWith("quiz.passed", new QuizPassedEvent("enr-1", "quiz-1"));
    });

    it("fails without emitting an event when the score is insufficient", async () => {
      const a = attempt({ quizId: "quiz-1", selected: "ko" });
      const { useCase, attemptRepository, eventEmitter } = build(a);

      await useCase.execute("att-1");

      expect(a.status).toBe(AttemptStatus.FAILED);
      expect(attemptRepository.save).toHaveBeenCalledWith(a);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("expires the attempt when the server-side time limit has elapsed (RG-12)", async () => {
      const a = attempt({ quizId: "quiz-1", startedAt: longAgo });
      const { useCase, attemptRepository, eventEmitter } = build(a, quiz(10));

      await useCase.execute("att-1");

      expect(a.status).toBe(AttemptStatus.EXPIRED);
      expect(attemptRepository.save).toHaveBeenCalledWith(a);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("raises NotFound when the quiz no longer exists", async () => {
      const { useCase, attemptRepository } = build(attempt({ quizId: "quiz-1" }), null);

      await expect(useCase.execute("att-1")).rejects.toThrow(NotFoundDomainError);
      expect(attemptRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("exam attempts", () => {
    it("passes, persists and emits exam.passed when the score is sufficient", async () => {
      const a = attempt({ examId: "exam-1" });
      const { useCase, attemptRepository, eventEmitter } = build(a);

      await useCase.execute("att-1");

      expect(a.status).toBe(AttemptStatus.PASSED);
      expect(attemptRepository.save).toHaveBeenCalledWith(a);
      expect(eventEmitter.emit).toHaveBeenCalledWith("exam.passed", new ExamPassedEvent("enr-1", "exam-1"));
    });

    it("fails without emitting an event when the score is insufficient", async () => {
      const a = attempt({ examId: "exam-1", selected: "ko" });
      const { useCase, eventEmitter } = build(a);

      await useCase.execute("att-1");

      expect(a.status).toBe(AttemptStatus.FAILED);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("expires the attempt when the time limit has elapsed", async () => {
      const a = attempt({ examId: "exam-1", startedAt: longAgo });
      const { useCase, attemptRepository, eventEmitter } = build(a, quiz(), exam(10));

      await useCase.execute("att-1");

      expect(a.status).toBe(AttemptStatus.EXPIRED);
      expect(attemptRepository.save).toHaveBeenCalledWith(a);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("raises NotFound when the exam no longer exists", async () => {
      const { useCase } = build(attempt({ examId: "exam-1" }), quiz(), null);

      await expect(useCase.execute("att-1")).rejects.toThrow(NotFoundDomainError);
    });
  });
});
