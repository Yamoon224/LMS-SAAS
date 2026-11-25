import type { UsersFacade } from "@modules/users/users.facade";
import { NotFoundDomainError } from "@shared/errors";

import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";

import { ListExamAttemptsUseCase } from "./list-exam-attempts.use-case";

describe("ListExamAttemptsUseCase (ENT-37)", () => {
  const startedAt = new Date("2026-11-01T10:00:00Z");

  function build(exam: unknown) {
    const exams = { findByCourseId: jest.fn().mockResolvedValue(exam) } as unknown as ExamRepositoryPort;
    const attempts = {
      listForExam: jest.fn().mockResolvedValue([
        { id: "a1", enrollmentId: "e1", userId: "u1", status: "PASSED", scorePercent: 85, startedAt, submittedAt: startedAt },
        { id: "a2", enrollmentId: "e1", userId: "u1", status: "FAILED", scorePercent: 40, startedAt, submittedAt: startedAt },
        { id: "a3", enrollmentId: "e2", userId: "u-gone", status: "IN_PROGRESS", scorePercent: null, startedAt, submittedAt: null },
      ]),
    } as unknown as AttemptRepositoryPort;
    const users = {
      findManyByIds: jest.fn().mockResolvedValue([{ id: "u1", fullName: "Aya Koné", email: "aya@example.com" }]),
    } as unknown as UsersFacade;
    return { useCase: new ListExamAttemptsUseCase(exams, attempts, users), attempts, users };
  }

  it("lists the attempts of the course exam with learner name, score, status and date, without answers", async () => {
    const { useCase, attempts, users } = build({ id: "exam-1" });
    const rows = await useCase.execute("course-1");

    expect(attempts.listForExam).toHaveBeenCalledWith("exam-1");
    expect(users.findManyByIds).toHaveBeenCalledTimes(1); // une seule requête, ids dédoublonnés
    expect(users.findManyByIds).toHaveBeenCalledWith(["u1", "u-gone"]);
    expect(rows[0]).toEqual({
      id: "a1",
      enrollmentId: "e1",
      learnerName: "Aya Koné",
      email: "aya@example.com",
      status: "PASSED",
      scorePercent: 85,
      startedAt,
      submittedAt: startedAt,
    });
    expect(rows[2]).toMatchObject({ learnerName: null, email: null, scorePercent: null });
    expect(Object.keys(rows[0] ?? {})).not.toContain("answers");
  });

  it("raises 404 when the course has no exam", async () => {
    const { useCase, attempts } = build(null);
    await expect(useCase.execute("course-1")).rejects.toThrow(NotFoundDomainError);
    expect(attempts.listForExam).not.toHaveBeenCalled();
  });
});
