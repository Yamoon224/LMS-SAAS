import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { Attempt } from "../domain/attempt.entity";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { AttemptStatus } from "../domain/question-type";

import { SubmitAnswerUseCase } from "./submit-answer.use-case";

function attempt(status = AttemptStatus.IN_PROGRESS): Attempt {
  return Attempt.fromPersistence({
    id: "att-1",
    enrollmentId: "enr-1",
    quizId: "quiz-1",
    examId: null,
    questionIds: ["q1"],
    status,
    answers: [],
    scorePercent: null,
    startedAt: new Date(),
    submittedAt: null,
  });
}

function build(found: Attempt | null) {
  const repository = {
    findById: jest.fn().mockResolvedValue(found),
    save: jest.fn().mockResolvedValue(undefined),
  };
  return { repository, useCase: new SubmitAnswerUseCase(repository as unknown as AttemptRepositoryPort) };
}

describe("SubmitAnswerUseCase", () => {
  it("records the answer on the attempt and persists it", async () => {
    const a = attempt();
    const { useCase, repository } = build(a);

    await useCase.execute("att-1", { questionId: "q1", selectedOptionIds: ["o1"] });

    expect(a.toSnapshot().answers).toEqual([{ questionId: "q1", selectedOptionIds: ["o1"] }]);
    expect(repository.save).toHaveBeenCalledWith(a);
  });

  it("raises NotFound when the attempt does not exist", async () => {
    const { useCase, repository } = build(null);

    await expect(useCase.execute("x", { questionId: "q1", selectedOptionIds: [] })).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("refuses an answer on an attempt that is no longer in progress", async () => {
    const { useCase, repository } = build(attempt(AttemptStatus.FAILED));

    await expect(useCase.execute("att-1", { questionId: "q1", selectedOptionIds: ["o1"] })).rejects.toThrow(
      InvalidStateTransitionError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
