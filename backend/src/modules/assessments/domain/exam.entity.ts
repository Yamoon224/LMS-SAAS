import { PassingRules } from "./passing-rules.vo";
import type { Question } from "./question.entity";

export interface ExamProps {
  id: string;
  courseId: string;
  passingScorePercent: number;
  maxAttempts: number | null;
  delayBetweenAttemptsMinutes: number | null;
  timeLimitMinutes: number;
  questionsPerModule: number | null;
  allowReentry: boolean;
  /** ENT-34 : poids dans la note finale de la formation (1 si absent). */
  weight?: number;
  questions: Question[];
}

/**
 * Entité pure du domaine Exam (ENT-34 à ENT-37) : aucune dépendance à NestJS
 * ou à l'ORM (section 13.2). RG-12: "l'examen final n'est accessible que si
 * tous les modules sont validés" — cette règle est vérifiée par l'appelant
 * (futur module enrollments, seul capable de connaître la progression),
 * pas ici : Exam ne porte que les règles intrinsèques à l'évaluation elle-même.
 */
export class Exam {
  private constructor(private props: ExamProps) {}

  static fromPersistence(props: ExamProps): Exam {
    return new Exam(props);
  }

  get id(): string {
    return this.props.id;
  }

  get courseId(): string {
    return this.props.courseId;
  }

  get questions(): readonly Question[] {
    return this.props.questions;
  }

  get weight(): number {
    return this.props.weight ?? 1;
  }

  get allowReentry(): boolean {
    return this.props.allowReentry;
  }

  get questionsPerModule(): number | null {
    return this.props.questionsPerModule;
  }

  get passingRules(): PassingRules {
    return PassingRules.create({
      passingScorePercent: this.props.passingScorePercent,
      maxAttempts: this.props.maxAttempts,
      delayBetweenAttemptsMinutes: this.props.delayBetweenAttemptsMinutes,
      timeLimitMinutes: this.props.timeLimitMinutes,
    });
  }
}
