import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { ForbiddenActionError, NotFoundDomainError } from "@shared/errors";
import { LearnerAssessmentGateRegistry } from "@shared/ports/learner-assessment-gate";

import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort, EnrollmentOwnershipInfo } from "../domain/attempt.repository.port";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

/** Statuts d'inscription donnant accès au contenu (miroir de enrollments `isAccessGranting`, RG-17). */
const ACCESS_GRANTING_STATUSES = new Set(["ACTIVE", "COMPLETED"]);

/**
 * Anti-IDOR côté apprenant (PUB-10/PUB-11). Avant toute action sur une
 * tentative, vérifie que l'inscription (ou la tentative) appartient bien à
 * l'utilisateur authentifié, que la formation est dans son tenant, et que le
 * quiz / l'examen visé appartient à la formation de l'inscription. Toute
 * incohérence produit le même 404 qu'une ressource inexistante (jamais 403).
 */
@Injectable()
export class AuthorizeLearnerAttemptUseCase {
  constructor(
    @Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort,
    @Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort,
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
    // Conditions de progression (RG-09/RG-08b/RG-12) portees par enrollments, via le port partage.
    @Optional() private readonly gateRegistry?: LearnerAssessmentGateRegistry,
  ) {}

  async assertCanStartQuiz(enrollmentId: string, quizId: string, userId: string, tenantId: string): Promise<void> {
    const enrollment = await this.loadOwnedEnrollment(enrollmentId, userId, tenantId);
    this.assertContentAccess(enrollment);

    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundDomainError(`Quiz introuvable: ${quizId}`);
    }
    const quizCourseId = await this.courseContentFacade.assertModuleInTenant(quiz.moduleId, tenantId);
    if (quizCourseId !== enrollment.courseId) {
      throw new NotFoundDomainError(`Quiz introuvable: ${quizId}`);
    }
    await this.gateRegistry?.get()?.assertCanStartQuiz(enrollmentId, quiz.moduleId, userId, tenantId);
  }

  async assertCanStartExam(enrollmentId: string, examId: string, userId: string, tenantId: string): Promise<void> {
    const enrollment = await this.loadOwnedEnrollment(enrollmentId, userId, tenantId);
    this.assertContentAccess(enrollment);

    const exam = await this.examRepository.findById(examId);
    if (!exam || exam.courseId !== enrollment.courseId) {
      throw new NotFoundDomainError(`Examen introuvable: ${examId}`);
    }
    await this.gateRegistry?.get()?.assertCanStartExam(enrollmentId, userId, tenantId);
  }

  async assertAttemptOwned(attemptId: string, userId: string, tenantId: string): Promise<void> {
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt) {
      throw new NotFoundDomainError(`Tentative introuvable: ${attemptId}`);
    }
    try {
      await this.loadOwnedEnrollment(attempt.enrollmentId, userId, tenantId);
    } catch (error) {
      if (error instanceof NotFoundDomainError) {
        throw new NotFoundDomainError(`Tentative introuvable: ${attemptId}`);
      }
      throw error;
    }
  }

  private async loadOwnedEnrollment(
    enrollmentId: string,
    userId: string,
    tenantId: string,
  ): Promise<EnrollmentOwnershipInfo> {
    // `enrollmentId` vient d'un corps non typé: un id absent doit donner la même 404, pas une erreur Prisma.
    const enrollment = enrollmentId ? await this.attemptRepository.findEnrollmentOwnership(enrollmentId) : null;
    if (!enrollment || enrollment.userId !== userId) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }
    // Lève la même NotFound si la formation de l'inscription est hors du tenant courant.
    await this.coursesFacade.assertCourseInTenant(enrollment.courseId, tenantId);
    return enrollment;
  }

  private assertContentAccess(enrollment: EnrollmentOwnershipInfo): void {
    const expired = enrollment.expiresAt !== null && new Date() > enrollment.expiresAt;
    if (!ACCESS_GRANTING_STATUSES.has(enrollment.status) || expired) {
      throw new ForbiddenActionError("L'accès au contenu de cette formation n'est pas actif.");
    }
  }
}
