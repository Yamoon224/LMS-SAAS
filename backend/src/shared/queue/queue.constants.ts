import type { JobsOptions } from "bullmq";

/** Noms des files BullMQ de la plateforme (BE-08). Une file par type de traitement, pour isoler pannes et débits. */
export const QUEUE_NAMES = {
  NOTIFICATIONS: "notifications",
  REMINDERS: "reminders",
  PDF_GENERATION: "pdf-generation",
  AI_TRANSLATION: "ai-translation",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Files enregistrées par `QueueModule` (les notifications sont enregistrées par leur propre module). */
export const SHARED_QUEUE_NAMES: readonly QueueName[] = [
  QUEUE_NAMES.REMINDERS,
  QUEUE_NAMES.PDF_GENERATION,
  QUEUE_NAMES.AI_TRANSLATION,
];

const SEVEN_DAYS_S = 7 * 24 * 3600;
const THIRTY_DAYS_S = 30 * 24 * 3600;

/**
 * Options par défaut : 5 tentatives avec attente exponentielle (10 s, 20 s, 40 s...), tâches réussies purgées
 * après 7 jours / 1000 entrées, tâches définitivement échouées CONSERVÉES 30 jours (jusqu'à 5000) : elles forment
 * la « dead-letter queue » consultable et rejouable (voir docs/etapes/33-exploitation.md).
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 10_000 },
  removeOnComplete: { age: SEVEN_DAYS_S, count: 1000 },
  removeOnFail: { age: THIRTY_DAYS_S, count: 5000 },
};

export function jobOptions(overrides: JobsOptions = {}): JobsOptions {
  return { ...DEFAULT_JOB_OPTIONS, ...overrides };
}
