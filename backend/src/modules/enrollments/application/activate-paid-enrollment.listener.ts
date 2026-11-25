import { CoursesFacade } from "@modules/courses/courses.facade";
import { PaymentSucceededEvent } from "@modules/payments/payments.events";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { EnrollmentActivatedEvent } from "../enrollments.events";

/**
 * RG-06: "une inscription payée en ligne n'est activée qu'après confirmation
 * du fournisseur (webhook) ET vérification serveur de la transaction" — la
 * vérification serveur a déjà eu lieu dans payments.ProcessWebhookUseCase
 * avant l'émission de PaymentSucceeded ; ce listener n'a plus qu'à activer
 * l'inscription correspondante.
 */
@Injectable()
export class ActivatePaidEnrollmentListener {
  private readonly logger = new Logger(ActivatePaidEnrollmentListener.name);

  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent("payment.succeeded")
  async handle(event: PaymentSucceededEvent): Promise<void> {
    if (event.payment.type !== "COURSE_ENROLLMENT" || !event.payment.enrollmentId) {
      return;
    }

    const enrollment = await this.enrollmentRepository.findById(event.payment.enrollmentId);
    if (!enrollment) {
      this.logger.warn(`Inscription introuvable pour le paiement réussi: ${event.payment.enrollmentId}`);
      return;
    }

    const course = await this.coursesFacade.findById(enrollment.courseId);
    enrollment.activate(course.accessDurationDays);
    await this.enrollmentRepository.save(enrollment);

    this.eventEmitter.emit(
      "enrollment.activated",
      new EnrollmentActivatedEvent(enrollment.id, enrollment.userId, enrollment.courseId),
    );

    this.logger.log(`Inscription activée suite au paiement réussi: ${enrollment.id}`);
  }
}
