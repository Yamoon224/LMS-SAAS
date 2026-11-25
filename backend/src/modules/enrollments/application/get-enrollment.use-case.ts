import { CoursesFacade } from "@modules/courses/courses.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { Enrollment } from "../domain/enrollment.entity";
import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";

@Injectable()
export class GetEnrollmentUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
  ) {}

  async execute(enrollmentId: string): Promise<Enrollment | null> {
    return this.enrollmentRepository.findById(enrollmentId);
  }

  /**
   * Vue entreprise: l'inscription doit porter sur une formation du tenant
   * de l'appelant. Inconnue ou d'un autre tenant: même 404 (jamais 403).
   */
  async executeInTenant(enrollmentId: string, tenantId: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }

    try {
      await this.coursesFacade.assertCourseInTenant(enrollment.courseId, tenantId);
    } catch (error) {
      if (error instanceof NotFoundDomainError) {
        throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
      }
      throw error;
    }
    return enrollment;
  }

  /**
   * Vue apprenant (anti-IDOR): l'inscription doit appartenir à l'utilisateur
   * authentifié ET porter sur une formation de son tenant. Toute autre
   * situation (inconnue, d'un autre apprenant, d'un autre tenant) renvoie le
   * même 404 que pour une ressource inexistante, jamais un 403.
   */
  async executeOwned(enrollmentId: string, userId: string, tenantId: string): Promise<Enrollment> {
    const enrollment = await this.executeInTenant(enrollmentId, tenantId);
    if (enrollment.userId !== userId) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }
    return enrollment;
  }

  /** Vrai si l'utilisateur a une inscription qui donne actuellement accès au contenu de la formation (RG-17). */
  async hasContentAccess(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
    return enrollment !== null && enrollment.hasContentAccess();
  }
}
