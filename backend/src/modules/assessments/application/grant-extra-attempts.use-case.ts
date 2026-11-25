import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { ATTEMPT_GRANT_REPOSITORY } from "../domain/attempt-grant.repository.port";
import type { AttemptGrantRepositoryPort } from "../domain/attempt-grant.repository.port";

/**
 * ENT-31/RG-10: "un gestionnaire peut accorder des tentatives
 * supplémentaires" à un apprenant précis après épuisement, sans jamais
 * modifier le plafond global du quiz/examen ni affecter les autres
 * apprenants (voir AttemptGrant, schema.prisma).
 */
@Injectable()
export class GrantExtraAttemptsUseCase {
  constructor(
    @Inject(ATTEMPT_GRANT_REPOSITORY) private readonly attemptGrantRepository: AttemptGrantRepositoryPort,
  ) {}

  /** `courseId` est la formation déjà vérifiée dans le tenant: l'inscription doit en être une. */
  async forQuiz(
    enrollmentId: string,
    quizId: string,
    extraAttempts: number,
    grantedByUserId: string,
    courseId: string,
  ): Promise<void> {
    await this.assertEnrollmentInCourse(enrollmentId, courseId);
    await this.attemptGrantRepository.grant({ enrollmentId, quizId, extraAttempts, grantedByUserId });
  }

  async forExam(
    enrollmentId: string,
    examId: string,
    extraAttempts: number,
    grantedByUserId: string,
    courseId: string,
  ): Promise<void> {
    await this.assertEnrollmentInCourse(enrollmentId, courseId);
    await this.attemptGrantRepository.grant({ enrollmentId, examId, extraAttempts, grantedByUserId });
  }

  private async assertEnrollmentInCourse(enrollmentId: string, courseId: string): Promise<void> {
    const enrollmentCourseId = await this.attemptGrantRepository.findEnrollmentCourseId(enrollmentId);
    if (enrollmentCourseId !== courseId) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }
  }
}
