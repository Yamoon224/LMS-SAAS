import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { Inject, Injectable } from "@nestjs/common";

import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";
import { computeWeightedFinalScore } from "../domain/weighted-final-score";
import type { WeightedScoreItem } from "../domain/weighted-final-score";

import { GetBestExamScoreUseCase } from "./get-best-exam-score.use-case";
import { GetBestQuizScoreUseCase } from "./get-best-quiz-score.use-case";

/**
 * ENT-34 : note finale pondérée d'une inscription = moyenne pondérée des meilleures notes (RG-11) des quiz de module
 * et de l'examen final, chacun selon son poids (défaut 1). Les évaluations pas encore passées sont ignorées.
 */
@Injectable()
export class GetWeightedFinalScoreUseCase {
  constructor(
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
    @Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly getBestExamScoreUseCase: GetBestExamScoreUseCase,
    private readonly getBestQuizScoreUseCase: GetBestQuizScoreUseCase,
  ) {}

  async execute(enrollmentId: string, courseId: string): Promise<number | null> {
    const items: WeightedScoreItem[] = [];

    const modules = await this.courseContentFacade.listModules(courseId);
    for (const courseModule of modules) {
      const quiz = await this.quizRepository.findByModuleId(courseModule.id);
      if (!quiz) continue;
      items.push({
        scorePercent: await this.getBestQuizScoreUseCase.execute(enrollmentId, quiz.id),
        weight: quiz.weight,
      });
    }

    const exam = await this.examRepository.findByCourseId(courseId);
    if (exam) {
      items.push({
        scorePercent: await this.getBestExamScoreUseCase.execute(enrollmentId, exam.id),
        weight: exam.weight,
      });
    }

    return computeWeightedFinalScore(items);
  }
}
