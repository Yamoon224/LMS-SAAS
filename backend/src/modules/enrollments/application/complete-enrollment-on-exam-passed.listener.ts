import { ExamPassedEvent } from "@modules/assessments/assessments.events";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { EnrollmentCompletedEvent } from "../enrollments.events";

/**
 * RG-13: "pour une formation certifiante, le certificat est délivré
 * automatiquement si l'examen est réussi et toutes les conditions remplies."
 * Ce listener marque l'inscription COMPLETED et émet EnrollmentCompleted —
 * le futur module certificates s'y abonne pour délivrer le certificat
 * (ENT-41) sans que ce module ait à en connaître l'existence.
 */
@Injectable()
export class CompleteEnrollmentOnExamPassedListener {
  private readonly logger = new Logger(CompleteEnrollmentOnExamPassedListener.name);

  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent("exam.passed")
  async handle(event: ExamPassedEvent): Promise<void> {
    const enrollment = await this.enrollmentRepository.findById(event.enrollmentId);
    if (!enrollment) {
      this.logger.warn(`Inscription introuvable pour l'examen réussi: ${event.enrollmentId}`);
      return;
    }

    enrollment.complete();
    await this.enrollmentRepository.save(enrollment);

    this.eventEmitter.emit(
      "enrollment.completed",
      new EnrollmentCompletedEvent(enrollment.id, enrollment.userId, enrollment.courseId),
    );
  }
}
