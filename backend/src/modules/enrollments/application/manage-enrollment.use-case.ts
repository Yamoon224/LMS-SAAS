import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";

/** ENT-64: "suspendre/réactiver un apprenant, prolonger un accès." */
@Injectable()
export class ManageEnrollmentUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
  ) {}

  async suspend(enrollmentId: string): Promise<void> {
    const enrollment = await this.getOrThrow(enrollmentId);
    enrollment.suspend();
    await this.enrollmentRepository.save(enrollment);
  }

  async reactivate(enrollmentId: string): Promise<void> {
    const enrollment = await this.getOrThrow(enrollmentId);
    enrollment.reactivate();
    await this.enrollmentRepository.save(enrollment);
  }

  async extendAccess(enrollmentId: string, additionalDays: number): Promise<void> {
    const enrollment = await this.getOrThrow(enrollmentId);
    enrollment.extendAccess(additionalDays);
    await this.enrollmentRepository.save(enrollment);
  }

  private async getOrThrow(enrollmentId: string) {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }
    return enrollment;
  }
}
