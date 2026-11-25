import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { normalizeEnrollmentReason } from "../domain/enrollment-reason";
import { EnrollmentStatus } from "../domain/enrollment-status";
import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { EnrollmentRefusedEvent } from "../enrollments.events";

import { EnrollmentNotPendingValidationError } from "./validate-offline-payment.use-case";

export interface RejectOfflinePaymentInput {
  enrollmentId: string;
  /** ENT-61 : motif obligatoire, communiqué à l'apprenant. */
  reason: string;
}

/**
 * ENT-61 : refus d'un paiement hors plateforme (PENDING_VALIDATION → REFUSED). Le motif est vérifié AVANT toute
 * lecture ou écriture ; la transition passe par la matrice d'états de l'entité (une inscription déjà active, refusée,
 * etc. lève une transition invalide, 409). L'appelant a déjà vérifié l'appartenance au tenant.
 */
@Injectable()
export class RejectOfflinePaymentUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: RejectOfflinePaymentInput): Promise<void> {
    const reason = normalizeEnrollmentReason(input.reason);

    const enrollment = await this.enrollmentRepository.findById(input.enrollmentId);
    if (!enrollment) {
      throw new NotFoundDomainError(`Inscription introuvable: ${input.enrollmentId}`);
    }

    // Une inscription en attente de paiement EN LIGNE suit le flux du fournisseur de paiement, pas une décision
    // de gestionnaire : seule une validation hors plateforme en attente peut être refusée ici.
    if (enrollment.status === EnrollmentStatus.PENDING_PAYMENT) {
      throw new EnrollmentNotPendingValidationError(
        "Cette inscription n'est pas en attente de validation hors plateforme.",
      );
    }

    enrollment.refuse(reason); // InvalidStateTransitionError (409) si le statut ne le permet pas
    await this.enrollmentRepository.save(enrollment);

    this.eventEmitter.emit(
      "enrollment.refused",
      new EnrollmentRefusedEvent(enrollment.id, enrollment.userId, enrollment.courseId, reason),
    );
  }
}
