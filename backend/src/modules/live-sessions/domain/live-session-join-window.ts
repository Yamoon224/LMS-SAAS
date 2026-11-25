import { DomainError } from "@shared/errors";

/** PUB-13: le bouton « Rejoindre » s'ouvre 15 minutes avant le début et se ferme à la fin de la session. */
export const JOIN_OPENS_MINUTES_BEFORE = 15;

export class LiveSessionNotJoinableError extends DomainError {
  readonly code = "SESSION_NON_REJOIGNABLE";
}

export interface JoinWindowSession {
  startAt: Date;
  durationMinutes: number;
  status: string;
}

const MINUTE_MS = 60_000;

/** Début (inclus) et fin (exclue) de la fenêtre pendant laquelle la session peut être rejointe. */
export function joinWindow(session: Pick<JoinWindowSession, "startAt" | "durationMinutes">): { opensAt: Date; closesAt: Date } {
  const start = session.startAt.getTime();
  return {
    opensAt: new Date(start - JOIN_OPENS_MINUTES_BEFORE * MINUTE_MS),
    closesAt: new Date(start + Math.max(0, session.durationMinutes) * MINUTE_MS),
  };
}

/**
 * Règle pure : une session annulée ou terminée n'est jamais rejoignable ; sinon on peut la rejoindre de
 * « début − 15 min » (inclus) jusqu'à la fin (exclue). Une date invalide n'ouvre rien.
 */
export function canJoinLiveSession(session: JoinWindowSession, now: Date): boolean {
  if (session.status !== "SCHEDULED" && session.status !== "IN_PROGRESS") return false;
  if (Number.isNaN(session.startAt.getTime()) || Number.isNaN(now.getTime())) return false;
  const { opensAt, closesAt } = joinWindow(session);
  return now.getTime() >= opensAt.getTime() && now.getTime() < closesAt.getTime();
}

export function assertCanJoinLiveSession(session: JoinWindowSession, now: Date): void {
  if (!canJoinLiveSession(session, now)) {
    throw new LiveSessionNotJoinableError(
      `La session n'est rejoignable que de ${JOIN_OPENS_MINUTES_BEFORE} minutes avant son début jusqu'à sa fin.`,
    );
  }
}
