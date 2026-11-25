/** PUB-05 : règles pures du tableau de bord apprenant. */

/** Pourcentage entier de leçons terminées, borné à 0-100 ; 0 si la formation n'a aucune leçon. */
export function computeProgressPercent(completedLessons: number, totalLessons: number): number {
  if (!Number.isFinite(totalLessons) || totalLessons <= 0) return 0;
  const ratio = Math.max(0, completedLessons) / totalLessons;
  return Math.min(100, Math.round(ratio * 100));
}

export interface DatedSession {
  startAt: Date;
}

/** Sessions à venir triées par début, limitées à `limit`. */
export function upcomingSessionsSorted<T extends DatedSession>(sessions: readonly T[], limit: number): T[] {
  return [...sessions].sort((a, b) => a.startAt.getTime() - b.startAt.getTime()).slice(0, Math.max(0, limit));
}
