import { PassingRules } from "./passing-rules.vo";
import type { ResultsDisplay } from "./question-type";
import type { Question } from "./question.entity";

export interface QuizProps {
  id: string;
  moduleId: string;
  passingScorePercent: number;
  maxAttempts: number | null;
  delayBetweenAttemptsMinutes: number | null;
  timeLimitMinutes: number | null;
  questionsToDraw: number | null;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  resultsDisplay: ResultsDisplay;
  requireLiveAttendance: boolean;
  /** ENT-34 : poids dans la note finale de la formation (1 si absent). */
  weight?: number;
  questions: Question[];
}

/**
 * Entité pure du domaine Quiz (ENT-27 à ENT-31) : aucune dépendance à NestJS
 * ou à l'ORM (section 13.2).
 */
export class Quiz {
  private constructor(private props: QuizProps) {}

  static fromPersistence(props: QuizProps): Quiz {
    return new Quiz(props);
  }

  get id(): string {
    return this.props.id;
  }

  get moduleId(): string {
    return this.props.moduleId;
  }

  get questions(): readonly Question[] {
    return this.props.questions;
  }

  get questionsToDraw(): number | null {
    return this.props.questionsToDraw;
  }

  get weight(): number {
    return this.props.weight ?? 1;
  }

  get requireLiveAttendance(): boolean {
    return this.props.requireLiveAttendance;
  }

  get resultsDisplay(): ResultsDisplay {
    return this.props.resultsDisplay;
  }

  get passingRules(): PassingRules {
    return PassingRules.create({
      passingScorePercent: this.props.passingScorePercent,
      maxAttempts: this.props.maxAttempts,
      delayBetweenAttemptsMinutes: this.props.delayBetweenAttemptsMinutes,
      timeLimitMinutes: this.props.timeLimitMinutes,
    });
  }

  /** ENT-28: "nombre de questions tirées aléatoirement" — ou toutes si non configuré. */
  get questionCountForAttempt(): number {
    return this.props.questionsToDraw ?? this.props.questions.length;
  }

  get shuffleQuestions(): boolean {
    return this.props.shuffleQuestions;
  }

  get shuffleAnswers(): boolean {
    return this.props.shuffleAnswers;
  }
}
