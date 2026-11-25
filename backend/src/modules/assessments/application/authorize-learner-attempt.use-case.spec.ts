import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import { ForbiddenActionError, NotFoundDomainError } from "@shared/errors";
import type { LearnerAssessmentGateRegistry } from "@shared/ports/learner-assessment-gate";

import type { AttemptRepositoryPort, EnrollmentOwnershipInfo } from "../domain/attempt.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { AuthorizeLearnerAttemptUseCase } from "./authorize-learner-attempt.use-case";

const ownEnrollment: EnrollmentOwnershipInfo = {
  userId: "user-1",
  courseId: "course-1",
  status: "ACTIVE",
  expiresAt: null,
};

function build(options: {
  enrollment?: EnrollmentOwnershipInfo | null;
  attempt?: { enrollmentId: string } | null;
  quiz?: { moduleId: string } | null;
  exam?: { courseId: string } | null;
  moduleCourseId?: string;
  courseInTenant?: boolean;
  gateRegistry?: LearnerAssessmentGateRegistry;
}) {
  const attemptRepository = {
    findEnrollmentOwnership: jest.fn().mockResolvedValue(options.enrollment ?? null),
    findById: jest.fn().mockResolvedValue(options.attempt ?? null),
  } as unknown as AttemptRepositoryPort;
  const quizRepository = { findById: jest.fn().mockResolvedValue(options.quiz ?? null) } as unknown as QuizRepositoryPort;
  const examRepository = { findById: jest.fn().mockResolvedValue(options.exam ?? null) } as unknown as ExamRepositoryPort;
  const coursesFacade = {
    assertCourseInTenant: jest.fn().mockImplementation(async () => {
      if (options.courseInTenant === false) throw new NotFoundDomainError("Formation introuvable");
    }),
  } as unknown as CoursesFacade;
  const courseContentFacade = {
    assertModuleInTenant: jest.fn().mockResolvedValue(options.moduleCourseId ?? "course-1"),
  } as unknown as CourseContentFacade;
  return new AuthorizeLearnerAttemptUseCase(
    attemptRepository,
    quizRepository,
    examRepository,
    coursesFacade,
    courseContentFacade,
    options.gateRegistry,
  );
}

describe("AuthorizeLearnerAttemptUseCase.assertCanStartQuiz", () => {
  it("accepts the owner of an active enrollment on a quiz of the enrolled course", async () => {
    const useCase = build({ enrollment: ownEnrollment, quiz: { moduleId: "m-1" } });
    await expect(useCase.assertCanStartQuiz("enr-1", "quiz-1", "user-1", "tenant-1")).resolves.toBeUndefined();
  });

  it("raises NotFound for an enrollment of another learner", async () => {
    const useCase = build({ enrollment: { ...ownEnrollment, userId: "user-2" }, quiz: { moduleId: "m-1" } });
    await expect(useCase.assertCanStartQuiz("enr-1", "quiz-1", "user-1", "tenant-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });

  it("raises NotFound when enrollmentId is missing from the body", async () => {
    const useCase = build({ enrollment: ownEnrollment, quiz: { moduleId: "m-1" } });
    await expect(
      useCase.assertCanStartQuiz(undefined as unknown as string, "quiz-1", "user-1", "tenant-1"),
    ).rejects.toThrow(NotFoundDomainError);
  });

  it("raises NotFound when the enrollment course is in another tenant", async () => {
    const useCase = build({ enrollment: ownEnrollment, quiz: { moduleId: "m-1" }, courseInTenant: false });
    await expect(useCase.assertCanStartQuiz("enr-1", "quiz-1", "user-1", "tenant-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });

  it("raises NotFound when the quiz belongs to another course than the enrollment", async () => {
    const useCase = build({ enrollment: ownEnrollment, quiz: { moduleId: "m-1" }, moduleCourseId: "course-OTHER" });
    await expect(useCase.assertCanStartQuiz("enr-1", "quiz-1", "user-1", "tenant-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });

  it("refuses an enrollment that does not grant content access (pending payment)", async () => {
    const useCase = build({ enrollment: { ...ownEnrollment, status: "PENDING_PAYMENT" }, quiz: { moduleId: "m-1" } });
    await expect(useCase.assertCanStartQuiz("enr-1", "quiz-1", "user-1", "tenant-1")).rejects.toThrow(
      ForbiddenActionError,
    );
  });

  it("refuses an expired enrollment", async () => {
    const useCase = build({
      enrollment: { ...ownEnrollment, expiresAt: new Date(Date.now() - 1000) },
      quiz: { moduleId: "m-1" },
    });
    await expect(useCase.assertCanStartQuiz("enr-1", "quiz-1", "user-1", "tenant-1")).rejects.toThrow(
      ForbiddenActionError,
    );
  });
});

describe("AuthorizeLearnerAttemptUseCase.assertCanStartExam", () => {
  it("accepts an exam of the enrolled course", async () => {
    const useCase = build({ enrollment: ownEnrollment, exam: { courseId: "course-1" } });
    await expect(useCase.assertCanStartExam("enr-1", "exam-1", "user-1", "tenant-1")).resolves.toBeUndefined();
  });

  it("raises NotFound for an exam of another course", async () => {
    const useCase = build({ enrollment: ownEnrollment, exam: { courseId: "course-OTHER" } });
    await expect(useCase.assertCanStartExam("enr-1", "exam-1", "user-1", "tenant-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });

  it("raises NotFound for an enrollment of another learner", async () => {
    const useCase = build({ enrollment: { ...ownEnrollment, userId: "user-2" }, exam: { courseId: "course-1" } });
    await expect(useCase.assertCanStartExam("enr-1", "exam-1", "user-1", "tenant-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });
});

describe("AuthorizeLearnerAttemptUseCase.assertAttemptOwned", () => {
  it("accepts the attempt of the owner", async () => {
    const useCase = build({ enrollment: ownEnrollment, attempt: { enrollmentId: "enr-1" } });
    await expect(useCase.assertAttemptOwned("att-1", "user-1", "tenant-1")).resolves.toBeUndefined();
  });

  it("raises NotFound for an unknown attempt", async () => {
    await expect(build({}).assertAttemptOwned("att-1", "user-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("raises NotFound for an attempt of another learner (answers / submit IDOR)", async () => {
    const useCase = build({ enrollment: { ...ownEnrollment, userId: "user-2" }, attempt: { enrollmentId: "enr-1" } });
    await expect(useCase.assertAttemptOwned("att-1", "user-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("raises NotFound for an attempt whose course is in another tenant", async () => {
    const useCase = build({ enrollment: ownEnrollment, attempt: { enrollmentId: "enr-1" }, courseInTenant: false });
    await expect(useCase.assertAttemptOwned("att-1", "user-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });
});

describe("AuthorizeLearnerAttemptUseCase - progression gate (RG-08/RG-09/RG-12)", () => {
  function gateRegistry(gate: { assertCanStartQuiz: jest.Mock; assertCanStartExam: jest.Mock } | null) {
    return { get: jest.fn().mockReturnValue(gate) } as unknown as LearnerAssessmentGateRegistry;
  }

  it("delegates quiz start to the registered gate with the quiz module", async () => {
    const gate = { assertCanStartQuiz: jest.fn().mockResolvedValue(undefined), assertCanStartExam: jest.fn() };
    const useCase = build({ enrollment: ownEnrollment, quiz: { moduleId: "m-1" }, gateRegistry: gateRegistry(gate) });

    await useCase.assertCanStartQuiz("enr-1", "quiz-1", "user-1", "tenant-1");

    expect(gate.assertCanStartQuiz).toHaveBeenCalledWith("enr-1", "m-1", "user-1", "tenant-1");
  });

  it("propagates the gate refusal for a quiz", async () => {
    const gate = {
      assertCanStartQuiz: jest.fn().mockRejectedValue(new ForbiddenActionError("modules non valides")),
      assertCanStartExam: jest.fn(),
    };
    const useCase = build({ enrollment: ownEnrollment, quiz: { moduleId: "m-1" }, gateRegistry: gateRegistry(gate) });

    await expect(useCase.assertCanStartQuiz("enr-1", "quiz-1", "user-1", "tenant-1")).rejects.toThrow(
      ForbiddenActionError,
    );
  });

  it("delegates exam start to the registered gate", async () => {
    const gate = { assertCanStartQuiz: jest.fn(), assertCanStartExam: jest.fn().mockResolvedValue(undefined) };
    const useCase = build({ enrollment: ownEnrollment, exam: { courseId: "course-1" }, gateRegistry: gateRegistry(gate) });

    await useCase.assertCanStartExam("enr-1", "exam-1", "user-1", "tenant-1");

    expect(gate.assertCanStartExam).toHaveBeenCalledWith("enr-1", "user-1", "tenant-1");
  });

  it("does nothing more when no gate is registered yet", async () => {
    const useCase = build({
      enrollment: ownEnrollment,
      exam: { courseId: "course-1" },
      quiz: { moduleId: "m-1" },
      gateRegistry: gateRegistry(null),
    });

    await expect(useCase.assertCanStartExam("enr-1", "exam-1", "user-1", "tenant-1")).resolves.toBeUndefined();
    await expect(useCase.assertCanStartQuiz("enr-1", "quiz-1", "user-1", "tenant-1")).resolves.toBeUndefined();
  });
});
