import { InvalidStateTransitionError } from "@shared/errors";

import { AttemptStatus } from "./question-type";
import type { Question } from "./question.entity";

export interface SubmittedAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface AttemptProps {
  id: string;
  enrollmentId: string;
  quizId: string | null;
  examId: string | null;
  /** Identifiants des questions effectivement tirées pour cette tentative (ENT-28), figés au démarrage. */
  questionIds: string[];
  status: AttemptStatus;
  answers: SubmittedAnswer[];
  scorePercent: number | null;
  startedAt: Date;
  submittedAt: Date | null;
}

const ALLOWED_TRANSITIONS: Record<AttemptStatus, AttemptStatus[]> = {
  [AttemptStatus.IN_PROGRESS]: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED],
  [AttemptStatus.SUBMITTED]: [AttemptStatus.PASSED, AttemptStatus.FAILED],
  [AttemptStatus.PASSED]: [],
  [AttemptStatus.FAILED]: [],
  [AttemptStatus.EXPIRED]: [],
}; // Section 8.1: En cours → Soumise → Réussie/Échouée ; En cours → Expirée.

/**
 * Entité pure du domaine Attempt : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). `enrollmentId` reste une simple référence opaque — ce
 * module ne dépend jamais du futur module Enrollments (section 13.2,
 * "communication entre modules").
 */
export class Attempt {
  private constructor(private props: AttemptProps) {}

  static fromPersistence(props: AttemptProps): Attempt {
    return new Attempt(props);
  }

  get id(): string {
    return this.props.id;
  }

  get enrollmentId(): string {
    return this.props.enrollmentId;
  }

  get questionIds(): readonly string[] {
    return this.props.questionIds;
  }

  get quizId(): string | null {
    return this.props.quizId;
  }

  get examId(): string | null {
    return this.props.examId;
  }

  get status(): AttemptStatus {
    return this.props.status;
  }

  get scorePercent(): number | null {
    return this.props.scorePercent;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  private transitionTo(status: AttemptStatus): void {
    if (!ALLOWED_TRANSITIONS[this.props.status].includes(status)) {
      throw new InvalidStateTransitionError(
        `Transition de tentative invalide: ${this.props.status} → ${status}.`,
      );
    }
    this.props.status = status;
  }

  recordAnswer(answer: SubmittedAnswer): void {
    if (this.props.status !== AttemptStatus.IN_PROGRESS) {
      throw new InvalidStateTransitionError(
        "Impossible d'enregistrer une réponse sur une tentative qui n'est plus en cours.",
      );
    }
    const existingIndex = this.props.answers.findIndex((a) => a.questionId === answer.questionId);
    if (existingIndex >= 0) {
      this.props.answers[existingIndex] = answer;
    } else {
      this.props.answers.push(answer);
    }
  }

  /**
   * RG-12/ENT-36: soumission — calcule le score à partir des questions
   * effectivement tirées pour cette tentative (ENT-28), jamais la banque
   * entière du quiz, et applique la règle de passage. `allQuestions` peut
   * contenir plus de questions que celles tirées (ex. toute la banque du
   * quiz) — seules celles dont l'id figure dans questionIds comptent.
   */
  submit(allQuestions: readonly Question[], passingScorePercent: number): void {
    this.transitionTo(AttemptStatus.SUBMITTED);
    this.props.submittedAt = new Date();
    this.props.scorePercent = this.computeScore(allQuestions);

    this.transitionTo(
      this.props.scorePercent >= passingScorePercent ? AttemptStatus.PASSED : AttemptStatus.FAILED,
    );
  }

  /**
   * ENT-36/RG-12: soumission automatique à l'expiration du temps imparti
   * (chronomètre serveur). Le score est calculé sur les réponses déjà
   * enregistrées pour information, mais une tentative expirée ne devient
   * jamais PASSED même si ce score dépasse le seuil — l'apprenant doit
   * soumettre dans les temps pour que sa réussite soit retenue.
   */
  expire(allQuestions: readonly Question[]): void {
    this.transitionTo(AttemptStatus.EXPIRED);
    this.props.submittedAt = new Date();
    this.props.scorePercent = this.computeScore(allQuestions);
  }

  private computeScore(allQuestions: readonly Question[]): number {
    const drawnIds = new Set(this.props.questionIds);
    const questions = allQuestions.filter((question) => drawnIds.has(question.id));
    if (questions.length === 0) return 0;

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    if (totalPoints === 0) return 0;

    const earnedPoints = questions.reduce((sum, question) => {
      const answer = this.props.answers.find((a) => a.questionId === question.id);
      const isCorrect = answer ? question.isAnsweredCorrectly(answer.selectedOptionIds) : false;
      return sum + (isCorrect ? question.points : 0);
    }, 0);

    return Math.round((earnedPoints / totalPoints) * 100);
  }

  /** Réservé à l'infrastructure (repository) pour persister l'état courant après mutation. */
  toSnapshot(): Readonly<AttemptProps> {
    return { ...this.props };
  }
}
