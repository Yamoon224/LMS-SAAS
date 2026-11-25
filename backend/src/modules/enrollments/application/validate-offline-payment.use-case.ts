import { CoursesFacade } from "@modules/courses/courses.facade";
import { WalletsFacade } from "@modules/wallets/wallets.facade";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { EnrollmentStatus } from "../domain/enrollment-status";
import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { EnrollmentActivatedEvent } from "../enrollments.events";

export class EnrollmentNotPendingValidationError extends DomainError {
  readonly code = "INSCRIPTION_NON_EN_ATTENTE";
}

export interface ValidateOfflinePaymentInput {
  enrollmentId: string;
  /** RG-07: référence et montant reçu, obligatoires. */
  reference: string;
  declaredAmount: number;
  validatedByUserId: string;
}

export class OfflinePaymentValidatedEvent {
  constructor(public readonly enrollmentId: string) {}
}

/**
 * ENT-61/RG-07: "une inscription hors plateforme reste en attente de
 * validation jusqu'à l'action d'un gestionnaire, qui renseigne
 * obligatoirement la référence et le montant reçu. Aucun flux ne transite
 * par la plateforme." ADM-25: déclenche le calcul de la commission hors
 * plateforme éventuelle (RG-24), via WalletsFacade.
 */
@Injectable()
export class ValidateOfflinePaymentUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly walletsFacade: WalletsFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ValidateOfflinePaymentInput): Promise<void> {
    const enrollment = await this.enrollmentRepository.findById(input.enrollmentId);
    if (!enrollment) {
      throw new NotFoundDomainError(`Inscription introuvable: ${input.enrollmentId}`);
    }

    if (enrollment.status !== EnrollmentStatus.PENDING_VALIDATION) {
      throw new EnrollmentNotPendingValidationError(
        "Cette inscription n'est pas en attente de validation hors plateforme.",
      );
    }

    const course = await this.coursesFacade.findById(enrollment.courseId);
    enrollment.activate(course.accessDurationDays);
    enrollment.recordOfflinePayment(input.reference, input.declaredAmount);
    await this.enrollmentRepository.save(enrollment);

    await this.walletsFacade.recordOfflineSaleCommission({
      tenantId: course.tenantId,
      enrollmentId: enrollment.id,
      declaredAmount: input.declaredAmount,
    });

    this.eventEmitter.emit("enrollment.offline-payment-validated", new OfflinePaymentValidatedEvent(enrollment.id));
    this.eventEmitter.emit(
      "enrollment.activated",
      new EnrollmentActivatedEvent(enrollment.id, enrollment.userId, enrollment.courseId),
    );
  }
}
