import { Inject, Injectable } from "@nestjs/common";

import type { EnrollmentStatus } from "../domain/enrollment-status";
import type { Enrollment } from "../domain/enrollment.entity";
import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";

/** ENT-60 (liste entreprise) / PUB-05 (tableau de bord apprenant). */
@Injectable()
export class ListEnrollmentsUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
  ) {}

  async listForUser(userId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.listByUser(userId);
  }

  async listForCourse(courseId: string, status?: EnrollmentStatus): Promise<Enrollment[]> {
    return this.enrollmentRepository.listByCourse(courseId, status);
  }
}
