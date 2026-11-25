import { CoursesFacade } from "@modules/courses/courses.facade";
import { PlansFacade } from "@modules/plans/plans.facade";
import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, QuotaExceededError } from "@shared/errors";

import { normalizeEnrollmentReason } from "../domain/enrollment-reason";
import { EnrollmentStatus } from "../domain/enrollment-status";
import type { Enrollment } from "../domain/enrollment.entity";
import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { EnrollmentActivatedEvent } from "../enrollments.events";

import { AlreadyEnrolledError, CourseNotPurchasableError, EnrollmentCreatedEvent } from "./enroll-in-course.use-case";

export class ManualEnrollmentLearnerError extends DomainError {
  readonly code = "APPRENANT_INVALIDE";
}

export interface ManualEnrollInput {
  tenantId: string;
  courseId: string;
  email: string;
  /** Requis uniquement si l'apprenant est inconnu (invitation). */
  firstName?: string;
  lastName?: string;
  /** ENT-62 : motif/note, obligatoire (traçabilité d'une inscription sans paiement). */
  reason: string;
  enrolledByUserId: string;
  locale?: string;
}

export interface ManualEnrollResult {
  enrollment: Enrollment;
  /** true si un compte apprenant a été créé (invitation envoyée). */
  invited: boolean;
}

/**
 * ENT-62 : inscription manuelle par un gestionnaire, sans paiement. Le prix figé est 0 (aucune vente : n'entre ni dans
 * le chiffre d'affaires ni dans le grand livre). Quota « apprenants actifs » du plan respecté. L'apprenant inconnu est
 * invité via le flux d'invitation existant (e-mail d'activation). Notification d'activation via l'événement existant.
 */
@Injectable()
export class ManualEnrollUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly usersFacade: UsersFacade,
    private readonly plansFacade: PlansFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ManualEnrollInput): Promise<ManualEnrollResult> {
    const reason = normalizeEnrollmentReason(input.reason);
    // Anti-IDOR : formation d'un autre tenant = 404, avant tout autre contrôle.
    const course = await this.coursesFacade.findByIdInTenant(input.courseId, input.tenantId);
    if (!course.isPurchasable()) {
      throw new CourseNotPurchasableError("Cette formation n'est pas disponible à l'inscription.");
    }

    const quota = await this.plansFacade.checkQuota(input.tenantId, "maxActiveLearners");
    if (!quota.withinLimit) {
      throw new QuotaExceededError(
        `Le quota "maxActiveLearners" est atteint (${quota.current}/${quota.limit}). Changez de plan pour continuer.`,
        "maxActiveLearners",
      );
    }

    const { userId, invited, locale } = await this.resolveLearner(input);

    const existing = await this.enrollmentRepository.findByUserAndCourse(userId, input.courseId);
    if (existing) {
      throw new AlreadyEnrolledError("Cet apprenant est déjà inscrit à cette formation.");
    }

    const enrollment = await this.enrollmentRepository.create({
      userId,
      courseId: input.courseId,
      status: EnrollmentStatus.PENDING_PAYMENT,
      pricePaid: 0,
      currency: course.currency,
      locale,
    });
    enrollment.activate(course.accessDurationDays ?? null);
    enrollment.recordManualEnrollment(reason, input.enrolledByUserId);
    await this.enrollmentRepository.save(enrollment);

    this.eventEmitter.emit("enrollment.created", new EnrollmentCreatedEvent(enrollment.id, userId, input.courseId, 0));
    this.eventEmitter.emit("enrollment.activated", new EnrollmentActivatedEvent(enrollment.id, userId, input.courseId));

    return { enrollment, invited };
  }

  private async resolveLearner(input: ManualEnrollInput): Promise<{ userId: string; invited: boolean; locale: string }> {
    const known = await this.usersFacade.findByEmailInTenant(input.tenantId, input.email);
    if (known) {
      // Jamais un gestionnaire (la recherche est bornée au tenant : pas de compte d'un autre tenant).
      if (known.type !== "LEARNER") {
        throw new ManualEnrollmentLearnerError("Ce compte n'est pas un compte apprenant.");
      }
      return { userId: known.id, invited: false, locale: known.locale };
    }

    const firstName = input.firstName?.trim();
    const lastName = input.lastName?.trim();
    if (!firstName || !lastName) {
      throw new ManualEnrollmentLearnerError("Apprenant inconnu : renseignez son prénom et son nom pour l'inviter.");
    }
    const locale = input.locale ?? "fr";
    const user = await this.usersFacade.inviteLearner({
      tenantId: input.tenantId,
      email: input.email,
      firstName,
      lastName,
      locale,
    });
    return { userId: user.id, invited: true, locale };
  }
}
