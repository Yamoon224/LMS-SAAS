import { NotFoundDomainError } from "@shared/errors";

import type { AttemptGrantRepositoryPort } from "../domain/attempt-grant.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { GrantExtraAttemptsUseCase } from "./grant-extra-attempts.use-case";
import { ManageExamQuestionsUseCase } from "./manage-exam-questions.use-case";
import { ManageQuizQuestionsUseCase } from "./manage-quiz-questions.use-case";

describe("GrantExtraAttemptsUseCase - enrollment must belong to the verified course", () => {
  function build(enrollmentCourseId: string | null) {
    const repository = {
      grant: jest.fn(),
      findEnrollmentCourseId: jest.fn().mockResolvedValue(enrollmentCourseId),
    } as unknown as AttemptGrantRepositoryPort;
    return { repository, useCase: new GrantExtraAttemptsUseCase(repository) };
  }

  it("grants when the enrollment is on the course", async () => {
    const { repository, useCase } = build("course-1");
    await useCase.forQuiz("enr-1", "quiz-1", 2, "user-1", "course-1");
    expect(repository.grant).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: "enr-1", quizId: "quiz-1", extraAttempts: 2 }),
    );
  });

  it("raises NotFound and grants nothing for an enrollment of another course/tenant (quiz)", async () => {
    const { repository, useCase } = build("course-OTHER");
    await expect(useCase.forQuiz("enr-1", "quiz-1", 1, "user-1", "course-1")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.grant).not.toHaveBeenCalled();
  });

  it("raises NotFound for an unknown enrollment (exam)", async () => {
    const { repository, useCase } = build(null);
    await expect(useCase.forExam("enr-1", "exam-1", 1, "user-1", "course-1")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.grant).not.toHaveBeenCalled();
  });
});

describe("Manage questions - the question must belong to the verified quiz/exam", () => {
  it("removes a question of the quiz", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ questions: [{ id: "q-1" }] }),
      removeQuestion: jest.fn(),
    } as unknown as QuizRepositoryPort;
    await new ManageQuizQuestionsUseCase(repository).removeQuestion("quiz-1", "q-1");
    expect(repository.removeQuestion).toHaveBeenCalledWith("q-1");
  });

  it("refuses to remove a question of another quiz", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ questions: [{ id: "q-1" }] }),
      removeQuestion: jest.fn(),
    } as unknown as QuizRepositoryPort;
    await expect(new ManageQuizQuestionsUseCase(repository).removeQuestion("quiz-1", "q-X")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.removeQuestion).not.toHaveBeenCalled();
  });

  it("refuses to remove a question of another exam", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ questions: [] }),
      removeQuestion: jest.fn(),
    } as unknown as ExamRepositoryPort;
    await expect(new ManageExamQuestionsUseCase(repository).removeQuestion("exam-1", "q-X")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.removeQuestion).not.toHaveBeenCalled();
  });
});
