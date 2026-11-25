/**
 * Section 8.1: Estimé → Confirmé → En cours → Terminé ; En cours → Échoué.
 */
export enum TranslationJobStatus {
  ESTIMATED = "ESTIMATED",
  CONFIRMED = "CONFIRMED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

const ALLOWED_TRANSITIONS: Record<TranslationJobStatus, TranslationJobStatus[]> = {
  [TranslationJobStatus.ESTIMATED]: [TranslationJobStatus.CONFIRMED],
  [TranslationJobStatus.CONFIRMED]: [TranslationJobStatus.IN_PROGRESS],
  [TranslationJobStatus.IN_PROGRESS]: [TranslationJobStatus.COMPLETED, TranslationJobStatus.FAILED],
  [TranslationJobStatus.COMPLETED]: [],
  [TranslationJobStatus.FAILED]: [],
};

export function canTransitionTranslationJobStatus(
  from: TranslationJobStatus,
  to: TranslationJobStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
