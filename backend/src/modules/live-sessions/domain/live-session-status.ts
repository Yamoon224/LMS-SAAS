/** Section 8.1: Planifiée → En cours → Terminée ; Planifiée → Annulée. */
export enum LiveSessionStatus {
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELED = "CANCELED",
}

const ALLOWED_TRANSITIONS: Record<LiveSessionStatus, LiveSessionStatus[]> = {
  [LiveSessionStatus.SCHEDULED]: [LiveSessionStatus.IN_PROGRESS, LiveSessionStatus.CANCELED],
  [LiveSessionStatus.IN_PROGRESS]: [LiveSessionStatus.COMPLETED],
  [LiveSessionStatus.COMPLETED]: [],
  [LiveSessionStatus.CANCELED]: [],
};

export function canTransitionLiveSessionStatus(
  from: LiveSessionStatus,
  to: LiveSessionStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
