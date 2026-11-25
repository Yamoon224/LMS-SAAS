/** ENT-27: QCM à réponse unique ou multiple, vrai/faux. */
export enum QuestionType {
  SINGLE_CHOICE = "SINGLE_CHOICE",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
}

/** ENT-30: score seul, score + bonnes réponses, ou score + corrections détaillées. */
export enum ResultsDisplay {
  SCORE_ONLY = "SCORE_ONLY",
  SCORE_AND_ANSWERS = "SCORE_AND_ANSWERS",
  DETAILED = "DETAILED",
}

export enum AttemptStatus {
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
  PASSED = "PASSED",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
}
