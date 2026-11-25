import { CoursesFacade } from "@modules/courses/courses.facade";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError } from "@shared/errors/domain-error";

import { EnrollmentStatus } from "../domain/enrollment-status";
import type { Enrollment } from "../domain/enrollment.entity";
import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { EnrollmentActivatedEvent } from "../enrollments.events";

export class AlreadyEnrolledError extends DomainError {
  readonly code = "DEJA_INSCRIT";
}

export class CourseNotPurchasableError extends DomainError {
  readonly code = "FORMATION_NON_ACHETABLE";
}

export interface EnrollInCourseInput {
  userId: string;
  /** Tenant de l'appelant: la formation doit lui appartenir (404 sinon). */
  tenantId: string;
  courseId: string;
  locale: string;
  /** true si le paiement se fait hors plateforme (ENT-12/PUB-08) — l'inscription reste PENDING_VALIDATION. */
  isOfflinePayment: boolean;
}

export class EnrollmentCreatedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly userId: string,
    public readonly courseId: string,
    public readonly pricePaid: number,
  ) {}
}

/**
 * PUB-04/ENT-62: création d'une inscription. RG-05: "le prix d'une formation
 * est figé au moment de l'inscription" — pricePaid copie course.price
 * immédiatement, une modification ultérieure du prix n'affecte jamais cette
 * inscription. RG-20: un même utilisateur ne peut avoir qu'une inscription
 * par formation (contrainte @@unique([userId, courseId]) côté persistance,
 * revérifiée ici pour lever une erreur de domaine explicite).
 */
@Injectable()
export class EnrollInCourseUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: EnrollInCourseInput): Promise<Enrollment> {
    // Anti-IDOR: formation d'un autre tenant = même 404 qu'une formation inconnue (avant tout autre contrôle).
    const course = await this.coursesFacade.findByIdInTenant(input.courseId, input.tenantId);

    const existing = await this.enrollmentRepository.findByUserAndCourse(input.userId, input.courseId);
    if (existing) {
      throw new AlreadyEnrolledError("Cet apprenant est déjà inscrit à cette formation.");
    }

    if (!course.isPurchasable()) {
      throw new CourseNotPurchasableError("Cette formation n'est pas disponible à l'inscription.");
    }

    const initialStatus = this.resolveInitialStatus(course.price, input.isOfflinePayment);

    const enrollment = await this.enrollmentRepository.create({
      userId: input.userId,
      courseId: input.courseId,
      status: initialStatus,
      pricePaid: course.price, // RG-05: figé ici, jamais relu depuis Course par la suite.
      currency: course.currency,
      locale: input.locale,
    });

    // Une formation gratuite n'a pas de paiement à attendre : accès immédiat.
    if (initialStatus === EnrollmentStatus.PENDING_PAYMENT && course.price === 0) {
      enrollment.activate(course.accessDurationDays ?? null);
      await this.enrollmentRepository.save(enrollment);
      this.eventEmitter.emit(
        "enrollment.activated",
        new EnrollmentActivatedEvent(enrollment.id, input.userId, input.courseId),
      );
    }

    this.eventEmitter.emit(
      "enrollment.created",
      new EnrollmentCreatedEvent(enrollment.id, input.userId, input.courseId, course.price),
    );

    return enrollment;
  }

  private resolveInitialStatus(price: number, isOfflinePayment: boolean): EnrollmentStatus {
    if (price === 0) return EnrollmentStatus.PENDING_PAYMENT; // activé juste après, voir ci-dessus
    if (isOfflinePayment) return EnrollmentStatus.PENDING_VALIDATION;
    return EnrollmentStatus.PENDING_PAYMENT;
  }
}
