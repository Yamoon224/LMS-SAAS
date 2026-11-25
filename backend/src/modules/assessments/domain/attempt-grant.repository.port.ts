export interface GrantAttemptsData {
  enrollmentId: string;
  quizId?: string;
  examId?: string;
  extraAttempts: number;
  grantedByUserId: string;
}

/** ENT-31/RG-10: tentatives bonus par inscription, jamais un changement du plafond global. */
export interface AttemptGrantRepositoryPort {
  grant(data: GrantAttemptsData): Promise<void>;
  /** Formation de l'inscription, ou null si elle n'existe pas (contrôle de propriété avant d'accorder). */
  findEnrollmentCourseId(enrollmentId: string): Promise<string | null>;
  /** Somme des tentatives bonus accordées à cette inscription pour ce quiz. */
  totalGrantedForQuiz(enrollmentId: string, quizId: string): Promise<number>;
  totalGrantedForExam(enrollmentId: string, examId: string): Promise<number>;
}

export const ATTEMPT_GRANT_REPOSITORY = Symbol("ATTEMPT_GRANT_REPOSITORY");
