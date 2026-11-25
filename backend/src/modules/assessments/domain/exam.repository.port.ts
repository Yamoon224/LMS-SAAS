import type { Exam } from "./exam.entity";
import type { CreateQuestionData } from "./quiz.repository.port";

export interface SetExamRulesData {
  passingScorePercent: number;
  maxAttempts?: number;
  delayBetweenAttemptsMinutes?: number;
  timeLimitMinutes: number;
  questionsPerModule?: number;
  allowReentry: boolean;
  weight?: number;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface ExamRepositoryPort {
  findByCourseId(courseId: string): Promise<Exam | null>;
  findById(id: string): Promise<Exam | null>;
  /** Crée l'examen de la formation s'il n'existe pas encore (relation 1-1 avec Course). */
  upsertForCourse(courseId: string, rules: SetExamRulesData): Promise<Exam>;
  addQuestion(examId: string, data: CreateQuestionData): Promise<void>;
  removeQuestion(questionId: string): Promise<void>;
}

export const EXAM_REPOSITORY = Symbol("EXAM_REPOSITORY");
