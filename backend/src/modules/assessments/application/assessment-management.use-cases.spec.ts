import { NotFoundDomainError } from "@shared/errors";

import type { AttemptGrantRepositoryPort } from "../domain/attempt-grant.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import type { Exam } from "../domain/exam.entity";
import type { ExamRepositoryPort, SetExamRulesData } from "../domain/exam.repository.port";
import { InvalidQuestionError } from "../domain/question-draft";
import { QuestionType, ResultsDisplay } from "../domain/question-type";
import type { Quiz } from "../domain/quiz.entity";
import type { CreateQuestionData, QuizRepositoryPort, SetQuizRulesData } from "../domain/quiz.repository.port";

import { ConfigureExamUseCase } from "./configure-exam.use-case";
import { ConfigureQuizUseCase } from "./configure-quiz.use-case";
import { CountSubmittedAttemptsUseCase } from "./count-submitted-attempts.use-case";
import { DoesModuleRequireLiveAttendanceUseCase } from "./does-module-require-live-attendance.use-case";
import { GrantExtraAttemptsUseCase } from "./grant-extra-attempts.use-case";
import { ManageExamQuestionsUseCase } from "./manage-exam-questions.use-case";
import { ManageQuizQuestionsUseCase } from "./manage-quiz-questions.use-case";

const question: CreateQuestionData = {
  type: QuestionType.SINGLE_CHOICE,
  statementHtml: "<p>Enonce</p><script>alert(1)</script>",
  points: 1,
  options: [
    { label: "a", isCorrect: true },
    { label: "b", isCorrect: false },
  ],
};

describe("ConfigureQuizUseCase", () => {
  it("upserts the quiz rules of the module and returns the quiz", async () => {
    const quiz = { id: "quiz-1" } as unknown as Quiz;
    const repository = { upsertForModule: jest.fn().mockResolvedValue(quiz) };
    const rules: SetQuizRulesData = {
      passingScorePercent: 70,
      shuffleQuestions: true,
      shuffleAnswers: false,
      resultsDisplay: ResultsDisplay.SCORE_ONLY,
      requireLiveAttendance: false,
    };

    const result = await new ConfigureQuizUseCase(repository as unknown as QuizRepositoryPort).execute("m1", rules);

    expect(result).toBe(quiz);
    expect(repository.upsertForModule).toHaveBeenCalledWith("m1", rules);
  });
});

describe("ConfigureExamUseCase", () => {
  it("upserts the exam rules of the course and returns the exam", async () => {
    const exam = { id: "exam-1" } as unknown as Exam;
    const repository = { upsertForCourse: jest.fn().mockResolvedValue(exam) };
    const rules: SetExamRulesData = { passingScorePercent: 80, timeLimitMinutes: 90, allowReentry: false };

    const result = await new ConfigureExamUseCase(repository as unknown as ExamRepositoryPort).execute("c1", rules);

    expect(result).toBe(exam);
    expect(repository.upsertForCourse).toHaveBeenCalledWith("c1", rules);
  });
});

describe("DoesModuleRequireLiveAttendanceUseCase (RG-08b)", () => {
  const build = (quiz: { requireLiveAttendance: boolean } | null) => {
    const repository = { findByModuleId: jest.fn().mockResolvedValue(quiz) };
    return new DoesModuleRequireLiveAttendanceUseCase(repository as unknown as QuizRepositoryPort);
  };

  it("is true when the quiz requires live attendance", async () => {
    await expect(build({ requireLiveAttendance: true }).execute("m1")).resolves.toBe(true);
  });

  it("is false when the quiz does not require live attendance", async () => {
    await expect(build({ requireLiveAttendance: false }).execute("m1")).resolves.toBe(false);
  });

  it("is false when the module has no quiz", async () => {
    await expect(build(null).execute("m1")).resolves.toBe(false);
  });
});

describe("CountSubmittedAttemptsUseCase", () => {
  it("returns the number of submitted attempts of the enrollment", async () => {
    const repository = { countSubmittedForEnrollment: jest.fn().mockResolvedValue(3) };

    const count = await new CountSubmittedAttemptsUseCase(repository as unknown as AttemptRepositoryPort).execute(
      "enr-1",
    );

    expect(count).toBe(3);
    expect(repository.countSubmittedForEnrollment).toHaveBeenCalledWith("enr-1");
  });
});

describe("GrantExtraAttemptsUseCase (ENT-31)", () => {
  const build = (enrollmentCourseId: string | null) => {
    const repository = {
      findEnrollmentCourseId: jest.fn().mockResolvedValue(enrollmentCourseId),
      grant: jest.fn().mockResolvedValue(undefined),
    };
    return { repository, useCase: new GrantExtraAttemptsUseCase(repository as unknown as AttemptGrantRepositoryPort) };
  };

  it("grants extra quiz attempts when the enrollment belongs to the course", async () => {
    const { useCase, repository } = build("c1");

    await useCase.forQuiz("enr-1", "quiz-1", 2, "manager-1", "c1");

    expect(repository.grant).toHaveBeenCalledWith({
      enrollmentId: "enr-1",
      quizId: "quiz-1",
      extraAttempts: 2,
      grantedByUserId: "manager-1",
    });
  });

  it("grants extra exam attempts when the enrollment belongs to the course", async () => {
    const { useCase, repository } = build("c1");

    await useCase.forExam("enr-1", "exam-1", 1, "manager-1", "c1");

    expect(repository.grant).toHaveBeenCalledWith({
      enrollmentId: "enr-1",
      examId: "exam-1",
      extraAttempts: 1,
      grantedByUserId: "manager-1",
    });
  });

  it("raises NotFound without granting when the enrollment is in another course", async () => {
    const { useCase, repository } = build("other-course");

    await expect(useCase.forQuiz("enr-1", "quiz-1", 1, "m", "c1")).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.forExam("enr-1", "exam-1", 1, "m", "c1")).rejects.toThrow(NotFoundDomainError);
    expect(repository.grant).not.toHaveBeenCalled();
  });

  it("raises NotFound when the enrollment does not exist", async () => {
    const { useCase, repository } = build(null);

    await expect(useCase.forQuiz("nope", "quiz-1", 1, "m", "c1")).rejects.toThrow(NotFoundDomainError);
    expect(repository.grant).not.toHaveBeenCalled();
  });
});

describe("ManageQuizQuestionsUseCase", () => {
  const build = (quiz: { questions: { id: string }[] } | null) => {
    const repository = {
      addQuestion: jest.fn().mockResolvedValue(undefined),
      removeQuestion: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(quiz),
    };
    return { repository, useCase: new ManageQuizQuestionsUseCase(repository as unknown as QuizRepositoryPort) };
  };

  it("adds a question with a sanitized statement", async () => {
    const { useCase, repository } = build(null);

    await useCase.addQuestion("quiz-1", question);

    const [quizId, data] = repository.addQuestion.mock.calls[0] as [string, CreateQuestionData];
    expect(quizId).toBe("quiz-1");
    expect(data.statementHtml).toContain("Enonce");
    expect(data.statementHtml).not.toContain("script");
    expect(data.options).toEqual(question.options);
  });

  it("refuses a question without any correct option", async () => {
    const { useCase, repository } = build(null);

    await expect(
      useCase.addQuestion("quiz-1", { ...question, options: [{ label: "a", isCorrect: false }] }),
    ).rejects.toThrow(InvalidQuestionError);
    expect(repository.addQuestion).not.toHaveBeenCalled();
  });

  it("removes a question that belongs to the quiz", async () => {
    const { useCase, repository } = build({ questions: [{ id: "q1" }] });

    await useCase.removeQuestion("quiz-1", "q1");

    expect(repository.removeQuestion).toHaveBeenCalledWith("q1");
  });

  it("raises NotFound for a question of another quiz or an unknown quiz", async () => {
    const other = build({ questions: [{ id: "q1" }] });
    const missing = build(null);

    await expect(other.useCase.removeQuestion("quiz-1", "q-foreign")).rejects.toThrow(NotFoundDomainError);
    await expect(missing.useCase.removeQuestion("quiz-1", "q1")).rejects.toThrow(NotFoundDomainError);
    expect(other.repository.removeQuestion).not.toHaveBeenCalled();
    expect(missing.repository.removeQuestion).not.toHaveBeenCalled();
  });
});

describe("ManageExamQuestionsUseCase", () => {
  const build = (exam: { questions: { id: string }[] } | null) => {
    const repository = {
      addQuestion: jest.fn().mockResolvedValue(undefined),
      removeQuestion: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(exam),
    };
    return { repository, useCase: new ManageExamQuestionsUseCase(repository as unknown as ExamRepositoryPort) };
  };

  it("adds a question with a sanitized statement", async () => {
    const { useCase, repository } = build(null);

    await useCase.addQuestion("exam-1", question);

    const [examId, data] = repository.addQuestion.mock.calls[0] as [string, CreateQuestionData];
    expect(examId).toBe("exam-1");
    expect(data.statementHtml).toContain("Enonce");
    expect(data.statementHtml).not.toContain("script");
  });

  it("refuses a question without any correct option", async () => {
    const { useCase, repository } = build(null);

    await expect(useCase.addQuestion("exam-1", { ...question, options: [] })).rejects.toThrow(InvalidQuestionError);
    expect(repository.addQuestion).not.toHaveBeenCalled();
  });

  it("removes a question that belongs to the exam", async () => {
    const { useCase, repository } = build({ questions: [{ id: "q1" }] });

    await useCase.removeQuestion("exam-1", "q1");

    expect(repository.removeQuestion).toHaveBeenCalledWith("q1");
  });

  it("raises NotFound for a question of another exam or an unknown exam", async () => {
    const other = build({ questions: [{ id: "q1" }] });
    const missing = build(null);

    await expect(other.useCase.removeQuestion("exam-1", "q-foreign")).rejects.toThrow(NotFoundDomainError);
    await expect(missing.useCase.removeQuestion("exam-1", "q1")).rejects.toThrow(NotFoundDomainError);
    expect(other.repository.removeQuestion).not.toHaveBeenCalled();
    expect(missing.repository.removeQuestion).not.toHaveBeenCalled();
  });
});
