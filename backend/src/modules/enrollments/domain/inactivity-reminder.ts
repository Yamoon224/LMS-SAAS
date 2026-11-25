import { EnrollmentStatus } from "./enrollment-status";

/** PUB-18 : rappel d'inactivité. Règles pures de sélection (aucune dépendance NestJS ni ORM). */
export const INACTIVITY_THRESHOLD_DAYS = 7;
export const INACTIVITY_REMINDER_MIN_GAP_DAYS = 14;

const DAY_MS = 86_400_000;

export interface InactivityCandidate {
  enrollmentId: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  expiresAt: Date | null;
  /** Dernière activité connue : dernière progression de leçon, à défaut début ou création de l'inscription. */
  lastActivityAt: Date;
  lastReminderAt: Date | null;
}

export interface InactivityReminder {
  enrollmentId: string;
  userId: string;
  courseId: string;
  /** Jours entiers écoulés depuis la dernière activité. */
  daysInactive: number;
  /** Valeur précédente de `lastReminderAt`, pour la réservation atomique côté base. */
  previousReminderAt: Date | null;
}

export interface InactivityOptions {
  thresholdDays?: number;
  minGapDays?: number;
}

/** Dates limites à utiliser pour pré-filtrer côté base (mêmes règles que `selectInactivityReminders`). */
export function inactivityCutoffs(now: Date, options: InactivityOptions = {}): { inactiveSince: Date; remindedBefore: Date } {
  return {
    inactiveSince: new Date(now.getTime() - (options.thresholdDays ?? INACTIVITY_THRESHOLD_DAYS) * DAY_MS),
    remindedBefore: new Date(now.getTime() - (options.minGapDays ?? INACTIVITY_REMINDER_MIN_GAP_DAYS) * DAY_MS),
  };
}

/**
 * Sélectionne les inscriptions à relancer :
 * - statut ACTIVE uniquement (jamais terminée, suspendue, expirée, en attente ou refusée) et accès non expiré ;
 * - aucune activité depuis au moins 7 jours ;
 * - jamais plus d'un rappel par 14 jours et par inscription.
 */
export function selectInactivityReminders(
  candidates: readonly InactivityCandidate[],
  now: Date,
  options: InactivityOptions = {},
): InactivityReminder[] {
  const { inactiveSince, remindedBefore } = inactivityCutoffs(now, options);
  const reminders: InactivityReminder[] = [];

  for (const candidate of candidates) {
    if (candidate.status !== EnrollmentStatus.ACTIVE) continue;
    if (candidate.expiresAt && candidate.expiresAt.getTime() <= now.getTime()) continue;
    if (Number.isNaN(candidate.lastActivityAt.getTime())) continue;
    if (candidate.lastActivityAt.getTime() > inactiveSince.getTime()) continue;
    if (candidate.lastReminderAt && candidate.lastReminderAt.getTime() > remindedBefore.getTime()) continue;

    reminders.push({
      enrollmentId: candidate.enrollmentId,
      userId: candidate.userId,
      courseId: candidate.courseId,
      daysInactive: Math.floor((now.getTime() - candidate.lastActivityAt.getTime()) / DAY_MS),
      previousReminderAt: candidate.lastReminderAt,
    });
  }
  return reminders;
}
