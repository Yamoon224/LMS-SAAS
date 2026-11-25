import { Injectable } from "@nestjs/common";

import { GetEnrollmentProgressUseCase } from "./application/get-enrollment-progress.use-case";
import type { EnrollmentProgressSummary } from "./application/get-enrollment-progress.use-case";
import { GetEnrollmentUseCase } from "./application/get-enrollment.use-case";
import { ListEnrollmentsUseCase } from "./application/list-enrollments.use-case";
import type { Enrollment } from "./domain/enrollment.entity";

/**
 * Seule API publique du module enrollments. Utilisée par le futur module
 * certificates (RG-13/RG-14: nom de l'apprenant, date, accès au certificat
 * même après expiration du contenu) et par le futur module live-sessions
 * (ajout des inscrits comme invités Google Meet, ENT-55).
 */
@Injectable()
export class EnrollmentsFacade {
  constructor(
    private readonly getEnrollmentUseCase: GetEnrollmentUseCase,
    private readonly listEnrollmentsUseCase: ListEnrollmentsUseCase,
    private readonly getEnrollmentProgressUseCase: GetEnrollmentProgressUseCase,
  ) {}

  /** Étape 30 (politique de remboursement, section 9.5) : leçons terminées / total de la formation. */
  async getProgressSummary(enrollmentId: string): Promise<EnrollmentProgressSummary> {
    return this.getEnrollmentProgressUseCase.execute(enrollmentId);
  }

  async findById(enrollmentId: string): Promise<Enrollment | null> {
    return this.getEnrollmentUseCase.execute(enrollmentId);
  }

  /** Lève NotFoundDomainError si l'inscription est inconnue OU d'un autre tenant. */
  async findByIdInTenant(enrollmentId: string, tenantId: string): Promise<Enrollment> {
    return this.getEnrollmentUseCase.executeInTenant(enrollmentId, tenantId);
  }

  /** Lève NotFoundDomainError si l'inscription est inconnue, d'un autre apprenant OU d'un autre tenant (anti-IDOR). */
  async findOwnedByUser(enrollmentId: string, userId: string, tenantId: string): Promise<Enrollment> {
    return this.getEnrollmentUseCase.executeOwned(enrollmentId, userId, tenantId);
  }

  /** Vrai si l'utilisateur a un accès actif au contenu de la formation. */
  async hasContentAccess(userId: string, courseId: string): Promise<boolean> {
    return this.getEnrollmentUseCase.hasContentAccess(userId, courseId);
  }

  async listForCourse(courseId: string): Promise<Enrollment[]> {
    return this.listEnrollmentsUseCase.listForCourse(courseId);
  }
}
