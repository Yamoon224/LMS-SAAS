import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { ATTEMPT_REPOSITORY } from "../domain/attempt.repository.port";
import type { AttemptRepositoryPort } from "../domain/attempt.repository.port";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";

export interface ExamAttemptListItem {
  id: string;
  enrollmentId: string;
  learnerName: string | null;
  email: string | null;
  status: string;
  scorePercent: number | null;
  startedAt: Date;
  submittedAt: Date | null;
}

/**
 * ENT-37 : tentatives d'examen d'une formation, par apprenant (note, statut, date). L'appelant a déjà vérifié que la
 * formation appartient au tenant ; seules les tentatives de l'examen de CETTE formation sont lues. Aucune réponse
 * n'est exposée (seulement la note).
 */
@Injectable()
export class ListExamAttemptsUseCase {
  constructor(
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
    @Inject(ATTEMPT_REPOSITORY) private readonly attemptRepository: AttemptRepositoryPort,
    private readonly usersFacade: UsersFacade,
  ) {}

  async execute(courseId: string): Promise<ExamAttemptListItem[]> {
    const exam = await this.examRepository.findByCourseId(courseId);
    if (!exam) {
      throw new NotFoundDomainError(`Aucun examen configuré pour cette formation: ${courseId}.`);
    }

    const attempts = await this.attemptRepository.listForExam(exam.id);
    // Une seule requête pour les apprenants (pas de N appels).
    const users = await this.usersFacade.findManyByIds([...new Set(attempts.map((a) => a.userId))]);
    const userById = new Map(users.map((u) => [u.id, u]));

    return attempts.map((attempt) => ({
      id: attempt.id,
      enrollmentId: attempt.enrollmentId,
      learnerName: userById.get(attempt.userId)?.fullName ?? null,
      email: userById.get(attempt.userId)?.email ?? null,
      status: attempt.status,
      scorePercent: attempt.scorePercent,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
    }));
  }
}
