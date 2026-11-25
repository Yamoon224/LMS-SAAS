import { Inject, Injectable } from "@nestjs/common";

import type { Exam } from "../domain/exam.entity";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { SetExamRulesData } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";

/** ENT-34: configurer l'examen final d'une formation certifiante. */
@Injectable()
export class ConfigureExamUseCase {
  constructor(@Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort) {}

  async execute(courseId: string, rules: SetExamRulesData): Promise<Exam> {
    return this.examRepository.upsertForCourse(courseId, rules);
  }
}
