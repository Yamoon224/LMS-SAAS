import type { QuestionType, ResultsDisplay } from "./question-type";
import type { Quiz } from "./quiz.entity";

export interface CreateQuestionData {
  type: QuestionType;
  statementHtml: string;
  explanation?: string;
  points: number;
  options: { label: string; isCorrect: boolean }[];
}

export interface SetQuizRulesData {
  passingScorePercent: number;
  maxAttempts?: number;
  delayBetweenAttemptsMinutes?: number;
  timeLimitMinutes?: number;
  questionsToDraw?: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  resultsDisplay: ResultsDisplay;
  requireLiveAttendance: boolean;
  weight?: number;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface QuizRepositoryPort {
  findByModuleId(moduleId: string): Promise<Quiz | null>;
  findById(id: string): Promise<Quiz | null>;
  /** Crée le quiz du module s'il n'existe pas encore (relation 1-1 avec Module). */
  upsertForModule(moduleId: string, rules: SetQuizRulesData): Promise<Quiz>;
  addQuestion(quizId: string, data: CreateQuestionData): Promise<void>;
  removeQuestion(questionId: string): Promise<void>;
}

export const QUIZ_REPOSITORY = Symbol("QUIZ_REPOSITORY");
