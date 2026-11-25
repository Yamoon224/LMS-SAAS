/** PUB-13 : « Rejoindre » n'est actif que de 15 minutes avant le début jusqu'à la fin de la session (miroir du backend). */
export const JOIN_OPENS_MINUTES_BEFORE = 15;

const MINUTE_MS = 60_000;

export interface JoinableSession {
  startAt: string | Date;
  durationMinutes: number;
  status: string;
}

export type JoinState = "later" | "open" | "ended";

/** `later` avant l'ouverture, `open` pendant la fenêtre, `ended` après la fin ou si la session est annulée/terminée. */
export function joinState(session: JoinableSession, now: number): JoinState {
  if (session.status !== "SCHEDULED" && session.status !== "IN_PROGRESS") return "ended";
  const start = new Date(session.startAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(now)) return "ended";
  if (now < start - JOIN_OPENS_MINUTES_BEFORE * MINUTE_MS) return "later";
  if (now >= start + Math.max(0, session.durationMinutes) * MINUTE_MS) return "ended";
  return "open";
}

/** Délai (ms) avant le prochain changement d'état, pour programmer un rafraîchissement ; null si plus rien ne change. */
export function msUntilNextJoinChange(session: JoinableSession, now: number): number | null {
  const start = new Date(session.startAt).getTime();
  if (Number.isNaN(start)) return null;
  const state = joinState(session, now);
  if (state === "later") return start - JOIN_OPENS_MINUTES_BEFORE * MINUTE_MS - now;
  if (state === "open") return start + Math.max(0, session.durationMinutes) * MINUTE_MS - now;
  return null;
}

/** Adresse de téléchargement du fichier .ics (via le proxy authentifié de l'application). */
export function calendarHref(liveSessionId: string): string {
  return `/api/backend/public/live-sessions/${encodeURIComponent(liveSessionId)}/calendar.ics`;
}
