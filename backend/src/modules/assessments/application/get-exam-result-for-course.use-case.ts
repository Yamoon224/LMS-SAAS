import { Inject, Injectable } from "@nestjs/common";

import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";

import { GetBestExamScoreUseCase } from "./get-best-exam-score.use-case";

export interface ExamResult {
  examId: string;
  scorePercent: number | null;
}

/**
 * Point d'entrée pratique pour le module certificates (ENT-41), qui ne
 * connaît que courseId/enrollmentId — jamais l'identifiant interne de
 * l'examen. Retourne null si la formation n'a pas d'examen configuré.
 */
@Injectable()
export class GetExamResultForCourseUseCase {
  constructor(
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
    private readonly getBestExamScoreUseCase: GetBestExamScoreUseCase,
  ) {}

  async execute(enrollmentId: string, courseId: string): Promise<ExamResult | null> {
    const exam = await this.examRepository.findByCourseId(courseId);
    if (!exam) return null;

    const scorePercent = await this.getBestExamScoreUseCase.execute(enrollmentId, exam.id);
    return { examId: exam.id, scorePercent };
  }
}
