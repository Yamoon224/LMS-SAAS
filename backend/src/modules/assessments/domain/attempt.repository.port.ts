import type { Attempt } from "./attempt.entity";

export interface CreateAttemptData {
  enrollmentId: string;
  quizId?: string;
  examId?: string;
  /** Questions effectivement tirées pour cette tentative (ENT-28), dans l'ordre présenté. */
  questionIds: string[];
}

/** Vue minimale d'une inscription pour les contrôles de propriété côté apprenant (anti-IDOR). */
export interface EnrollmentOwnershipInfo {
  userId: string;
  courseId: string;
  status: string;
  expiresAt: Date | null;
}

/** ENT-37 : une tentative d'examen telle que la voit le gestionnaire (sans les réponses). */
export interface ExamAttemptRow {
  id: string;
  enrollmentId: string;
  userId: string;
  status: string;
  scorePercent: number | null;
  startedAt: Date;
  submittedAt: Date | null;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface AttemptRepositoryPort {
  findById(id: string): Promise<Attempt | null>;
  /** Propriétaire, formation et état d'une inscription, ou null si elle n'existe pas. */
  findEnrollmentOwnership(enrollmentId: string): Promise<EnrollmentOwnershipInfo | null>;
  create(data: CreateAttemptData): Promise<Attempt>;
  save(attempt: Attempt): Promise<void>;
  countForQuiz(enrollmentId: string, quizId: string): Promise<number>;
  countForExam(enrollmentId: string, examId: string): Promise<number>;
  findLatestForQuiz(enrollmentId: string, quizId: string): Promise<Attempt | null>;
  findLatestForExam(enrollmentId: string, examId: string): Promise<Attempt | null>;
  /** RG-11: toutes les tentatives soumises, pour calculer le meilleur score. */
  listSubmittedForQuiz(enrollmentId: string, quizId: string): Promise<Attempt[]>;
  /** RG-11 (par analogie): toutes les tentatives soumises d'un examen, pour calculer le meilleur score. */
  listSubmittedForExam(enrollmentId: string, examId: string): Promise<Attempt[]>;
  /** ENT-37 : toutes les tentatives d'un examen, tous apprenants confondus, de la plus récente à la plus ancienne. */
  listForExam(examId: string): Promise<ExamAttemptRow[]>;
  /** Étape 30 (politique de remboursement) : nombre de tentatives de quiz ou d'examen SOUMISES pour cette inscription. */
  countSubmittedForEnrollment(enrollmentId: string): Promise<number>;
  /** BE-12/ENT-36: tentatives en cours dont le temps imparti est potentiellement dépassé. */
  listInProgressStartedBefore(cutoff: Date): Promise<Attempt[]>;
}

export const ATTEMPT_REPOSITORY = Symbol("ATTEMPT_REPOSITORY");
