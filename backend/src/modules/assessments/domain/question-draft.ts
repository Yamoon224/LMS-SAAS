import { DomainError } from "@shared/errors/domain-error";

export class InvalidQuestionError extends DomainError {
  readonly code = "QUESTION_INVALIDE";
}

export interface QuestionOptionDraft {
  label: string;
  isCorrect: boolean;
}

/** ENT-27: une question (quiz ou examen) doit avoir au moins une bonne réponse. */
export function assertValidQuestionDraft(options: readonly QuestionOptionDraft[]): void {
  if (!options.some((option) => option.isCorrect)) {
    throw new InvalidQuestionError("Une question doit avoir au moins une bonne réponse.");
  }
}
