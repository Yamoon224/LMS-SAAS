import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { PlansFacade } from "@modules/plans/plans.facade";
import type { UsersFacade } from "@modules/users/users.facade";
import { InvalidStateTransitionError, NotFoundDomainError, QuotaExceededError } from "@shared/errors";

import { EnrollmentReasonRequiredError } from "../domain/enrollment-reason";
import { EnrollmentStatus } from "../domain/enrollment-status";
import { Enrollment } from "../domain/enrollment.entity";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";

import { AlreadyEnrolledError } from "./enroll-in-course.use-case";
import { ManualEnrollUseCase, ManualEnrollmentLearnerError } from "./manual-enroll.use-case";
import { RejectOfflinePaymentUseCase } from "./reject-offline-payment.use-case";
import { EnrollmentNotPendingValidationError } from "./validate-offline-payment.use-case";

function buildEnrollment(status: EnrollmentStatus, id = "enr-1"): Enrollment {
  return Enrollment.fromPersistence({
    id,
    userId: "user-1",
    courseId: "course-1",
    status,
    pricePaid: 25000,
    currency: "XOF",
    locale: "fr",
    startedAt: null,
    expiresAt: null,
    completedAt: null,
  });
}

function buildRepository(existing: Enrollment | null = null): jest.Mocked<EnrollmentRepositoryPort> {
  return {
    findById: jest.fn().mockResolvedValue(existing),
    findByUserAndCourse: jest.fn().mockResolvedValue(existing),
    listByUser: jest.fn(),
    listByCourse: jest.fn(),
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve(Enrollment.fromPersistence({ id: "enr-new", ...data, startedAt: null, expiresAt: null, completedAt: null })),
    ),
    save: jest.fn(),
    countActiveByCourse: jest.fn(),
    listExpiredButStillActive: jest.fn(),
  } as unknown as jest.Mocked<EnrollmentRepositoryPort>;
}

describe("RejectOfflinePaymentUseCase (ENT-61)", () => {
  it("refuses a pending offline payment, records the reason and notifies through an event", async () => {
    const enrollment = buildEnrollment(EnrollmentStatus.PENDING_VALIDATION);
    const repository = buildRepository(enrollment);
    const emitter = { emit: jest.fn() };
    const useCase = new RejectOfflinePaymentUseCase(repository, emitter as never);

    await useCase.execute({ enrollmentId: "enr-1", reason: "  Virement non reçu  " });

    expect(enrollment.status).toBe(EnrollmentStatus.REFUSED);
    expect(enrollment.refusalReason).toBe("Virement non reçu");
    expect(repository.save).toHaveBeenCalledWith(enrollment);
    expect(emitter.emit).toHaveBeenCalledWith(
      "enrollment.refused",
      expect.objectContaining({ enrollmentId: "enr-1", userId: "user-1", courseId: "course-1", reason: "Virement non reçu" }),
    );
  });

  it.each(["", "   ", "\u0000\u0007"])("refuses to reject without a reason (%j) and touches nothing", async (reason) => {
    const repository = buildRepository(buildEnrollment(EnrollmentStatus.PENDING_VALIDATION));
    const emitter = { emit: jest.fn() };
    const useCase = new RejectOfflinePaymentUseCase(repository, emitter as never);

    await expect(useCase.execute({ enrollmentId: "enr-1", reason })).rejects.toThrow(EnrollmentReasonRequiredError);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("rejects a reason longer than 500 characters", async () => {
    const useCase = new RejectOfflinePaymentUseCase(buildRepository(), { emit: jest.fn() } as never);
    await expect(useCase.execute({ enrollmentId: "enr-1", reason: "x".repeat(501) })).rejects.toThrow(
      EnrollmentReasonRequiredError,
    );
  });

  it.each([EnrollmentStatus.ACTIVE, EnrollmentStatus.REFUSED, EnrollmentStatus.COMPLETED, EnrollmentStatus.EXPIRED])(
    "answers an invalid state transition (409) for a %s enrollment, without saving or notifying",
    async (status) => {
      const repository = buildRepository(buildEnrollment(status));
      const emitter = { emit: jest.fn() };
      const useCase = new RejectOfflinePaymentUseCase(repository, emitter as never);

      await expect(useCase.execute({ enrollmentId: "enr-1", reason: "Motif" })).rejects.toThrow(InvalidStateTransitionError);
      expect(repository.save).not.toHaveBeenCalled();
      expect(emitter.emit).not.toHaveBeenCalled();
    },
  );

  it("does not let a manager refuse an online payment awaiting the provider", async () => {
    const repository = buildRepository(buildEnrollment(EnrollmentStatus.PENDING_PAYMENT));
    const useCase = new RejectOfflinePaymentUseCase(repository, { emit: jest.fn() } as never);
    await expect(useCase.execute({ enrollmentId: "enr-1", reason: "Motif" })).rejects.toThrow(
      EnrollmentNotPendingValidationError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("raises 404 for an unknown enrollment", async () => {
    const useCase = new RejectOfflinePaymentUseCase(buildRepository(null), { emit: jest.fn() } as never);
    await expect(useCase.execute({ enrollmentId: "nope", reason: "Motif" })).rejects.toThrow(NotFoundDomainError);
  });
});

const course = { currency: "XOF", accessDurationDays: 30, isPurchasable: () => true };

function build(overrides: { course?: unknown; quota?: { withinLimit: boolean; current: number; limit: number | null }; user?: unknown; existing?: Enrollment | null } = {}) {
  const repository = buildRepository(overrides.existing ?? null);
  const emitter = { emit: jest.fn() };
  const courses = {
    findByIdInTenant: jest.fn().mockResolvedValue(overrides.course ?? course),
  } as unknown as CoursesFacade;
  const learner = overrides.user === undefined ? null : overrides.user;
  const users = {
    findByEmailInTenant: jest.fn().mockResolvedValue(learner),
    inviteLearner: jest.fn().mockResolvedValue({ id: "user-new" }),
  } as unknown as UsersFacade;
  const plans = {
    checkQuota: jest.fn().mockResolvedValue(overrides.quota ?? { withinLimit: true, current: 1, limit: 10 }),
  } as unknown as PlansFacade;
  const useCase = new ManualEnrollUseCase(repository, courses, users, plans, emitter as never);
  return { useCase, repository, emitter, courses, users, plans };
}

const input = {
  tenantId: "tenant-1",
  courseId: "course-1",
  email: "aya@example.com",
  reason: "Partenariat",
  enrolledByUserId: "manager-1",
};


describe("ManualEnrollUseCase (ENT-62)", () => {
  it("enrolls an existing learner as ACTIVE without payment, traced, and emits the activation event", async () => {
    const { useCase, repository, emitter } = build({ user: { id: "user-1", type: "LEARNER", locale: "en" } });

    const { enrollment, invited } = await useCase.execute({ ...input, reason: "  Partenariat  " });

    expect(invited).toBe(false);
    expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(enrollment.pricePaid).toBe(0);
    expect(enrollment.manualEnrollmentNote).toBe("Partenariat");
    expect(enrollment.expiresAt).not.toBeNull(); // durée d'accès de la formation appliquée
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", pricePaid: 0, locale: "en" }));
    expect(repository.save).toHaveBeenCalled();
    expect(emitter.emit).toHaveBeenCalledWith("enrollment.activated", expect.objectContaining({ userId: "user-1" }));
  });

  it("invites an unknown learner through the existing invitation flow", async () => {
    const { useCase, users } = build();
    const { invited, enrollment } = await useCase.execute({ ...input, firstName: " Aya ", lastName: "Koné" });

    expect(invited).toBe(true);
    expect(users.inviteLearner).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1", email: "aya@example.com", firstName: "Aya", lastName: "Koné" }),
    );
    expect(enrollment.userId).toBe("user-new");
  });

  it("asks for a name when the learner is unknown, and invites nobody", async () => {
    const { useCase, users, repository } = build();
    await expect(useCase.execute(input)).rejects.toThrow(ManualEnrollmentLearnerError);
    expect(users.inviteLearner).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

});

describe("ManualEnrollUseCase (abus et limites)", () => {
  it("refuses to enroll a company account (manager) as a learner", async () => {
    const { useCase, repository } = build({ user: { id: "boss", type: "COMPANY_USER", locale: "fr" } });
    await expect(useCase.execute(input)).rejects.toThrow(ManualEnrollmentLearnerError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("is refused when the plan active-learner quota is reached, before inviting or creating anything", async () => {
    const { useCase, users, repository, emitter } = build({ quota: { withinLimit: false, current: 10, limit: 10 } });
    await expect(useCase.execute({ ...input, firstName: "Aya", lastName: "Koné" })).rejects.toThrow(QuotaExceededError);
    expect(users.inviteLearner).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("requires a reason (checked before anything else)", async () => {
    const { useCase, courses } = build({ user: { id: "user-1", type: "LEARNER", locale: "fr" } });
    await expect(useCase.execute({ ...input, reason: "  " })).rejects.toThrow(EnrollmentReasonRequiredError);
    expect(courses.findByIdInTenant).not.toHaveBeenCalled();
  });

  it("does not enroll twice (RG-20)", async () => {
    const { useCase } = build({
      user: { id: "user-1", type: "LEARNER", locale: "fr" },
      existing: buildEnrollment(EnrollmentStatus.REFUSED),
    });
    await expect(useCase.execute(input)).rejects.toThrow(AlreadyEnrolledError);
  });

  it("raises 404 for a course of another tenant and does nothing else", async () => {
    const { useCase, courses, users, plans } = build();
    (courses.findByIdInTenant as jest.Mock).mockRejectedValue(new NotFoundDomainError("Formation introuvable"));
    await expect(useCase.execute(input)).rejects.toThrow(NotFoundDomainError);
    expect(courses.findByIdInTenant).toHaveBeenCalledWith("course-1", "tenant-1");
    expect(plans.checkQuota).not.toHaveBeenCalled();
    expect(users.findByEmailInTenant).not.toHaveBeenCalled();
  });

  it("refuses an unpublished course", async () => {
    const { useCase, repository } = build({ course: { ...course, isPurchasable: () => false }, user: { id: "u", type: "LEARNER", locale: "fr" } });
    await expect(useCase.execute(input)).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
