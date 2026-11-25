import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { WalletsFacade } from "@modules/wallets/wallets.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { EnrollmentStatus } from "../domain/enrollment-status";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { EnrollmentActivatedEvent } from "../enrollments.events";

import { buildEnrollment } from "./enrollment-test-helpers";
import {
  EnrollmentNotPendingValidationError,
  OfflinePaymentValidatedEvent,
  ValidateOfflinePaymentUseCase,
} from "./validate-offline-payment.use-case";

describe("ValidateOfflinePaymentUseCase (ENT-61 / RG-07)", () => {
  const input = { enrollmentId: "enr-1", reference: "VIR-42", declaredAmount: 25000, validatedByUserId: "admin-1" };

  function build(enrollment: ReturnType<typeof buildEnrollment> | null) {
    const repo = {
      findById: jest.fn().mockResolvedValue(enrollment),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as EnrollmentRepositoryPort;
    const courses = {
      findById: jest.fn().mockResolvedValue({ tenantId: "t1", accessDurationDays: 30 }),
    } as unknown as CoursesFacade;
    const wallets = { recordOfflineSaleCommission: jest.fn().mockResolvedValue(undefined) } as unknown as WalletsFacade;
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    return { useCase: new ValidateOfflinePaymentUseCase(repo, courses, wallets, emitter), repo, wallets, emitter };
  }

  it("lève NotFound pour une inscription inconnue", async () => {
    const { useCase, repo } = build(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it.each([EnrollmentStatus.PENDING_PAYMENT, EnrollmentStatus.ACTIVE, EnrollmentStatus.REFUSED])(
    "refuse une inscription au statut %s",
    async (status) => {
      const { useCase, repo, wallets } = build(buildEnrollment({ status }));
      await expect(useCase.execute(input)).rejects.toBeInstanceOf(EnrollmentNotPendingValidationError);
      expect(repo.save).not.toHaveBeenCalled();
      expect(wallets.recordOfflineSaleCommission).not.toHaveBeenCalled();
    },
  );

  it("active l'inscription, enregistre la preuve, calcule la commission et publie les deux événements", async () => {
    const enrollment = buildEnrollment({ status: EnrollmentStatus.PENDING_VALIDATION, startedAt: null });
    const { useCase, repo, wallets, emitter } = build(enrollment);

    await useCase.execute(input);

    expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(enrollment.expiresAt).toBeInstanceOf(Date);
    expect(repo.save).toHaveBeenCalledWith(enrollment);
    expect(wallets.recordOfflineSaleCommission).toHaveBeenCalledWith({
      tenantId: "t1",
      enrollmentId: "enr-1",
      declaredAmount: 25000,
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      "enrollment.offline-payment-validated",
      new OfflinePaymentValidatedEvent("enr-1"),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      "enrollment.activated",
      new EnrollmentActivatedEvent("enr-1", "user-1", "course-1"),
    );
  });
});
