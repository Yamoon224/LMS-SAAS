import { z } from "zod";

/** Doit rester cohérent avec AttemptStatus (backend, prisma). */
export const attemptStatusSchema = z.enum(["IN_PROGRESS", "SUBMITTED", "PASSED", "FAILED", "EXPIRED"]);
export type AttemptStatus = z.infer<typeof attemptStatusSchema>;

export const ATTEMPT_STATUS_LABELS: Record<AttemptStatus, string> = {
  IN_PROGRESS: "En cours",
  SUBMITTED: "Soumise",
  PASSED: "Réussie",
  FAILED: "Échouée",
  EXPIRED: "Expirée",
};

/** GET /business/courses/:courseId/exam/attempts (ENT-37) : une ligne par tentative, sans les réponses. */
export const examAttemptSchema = z.object({
  id: z.string(),
  enrollmentId: z.string(),
  learnerName: z.string().nullish(),
  email: z.string().nullish(),
  status: attemptStatusSchema,
  scorePercent: z.number().nullish(),
  startedAt: z.coerce.date(),
  submittedAt: z.coerce.date().nullish(),
});
export type ExamAttempt = z.infer<typeof examAttemptSchema>;

/** Note affichée et exportée : « 85 % », ou « — » tant que la tentative n'est pas notée. */
export function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? "—" : `${score} %`;
}

export function formatAttemptDate(date: Date): string {
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

/** GET /business/assessments/:examId/attempts (ENT-37) : page filtrée côté serveur. */
export const attemptsPageSchema = z.object({
  items: examAttemptSchema.array(),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type AttemptsPage = z.infer<typeof attemptsPageSchema>;

export interface AttemptFilters {
  learner: string;
  status: AttemptStatus | "";
  /** Dates au format AAAA-MM-JJ (champs <input type="date">). */
  from: string;
  to: string;
}

export const EMPTY_ATTEMPT_FILTERS: AttemptFilters = { learner: "", status: "", from: "", to: "" };

/** Query string des filtres ; `to` est étendu à la fin de la journée pour inclure la date choisie. */
export function attemptFiltersToQuery(filters: AttemptFilters, page?: number, pageSize?: number): string {
  const params = new URLSearchParams();
  if (filters.learner.trim()) params.set("learner", filters.learner.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) params.set("to", new Date(`${filters.to}T23:59:59.999`).toISOString());
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** GET /business/assessments/:examId/attempts/:attemptId : réponses données, en lecture seule. */
export const attemptDetailSchema = examAttemptSchema.extend({
  durationSeconds: z.number().nullish(),
  questions: z.array(
    z.object({
      questionId: z.string(),
      statementHtml: z.string(),
      points: z.number(),
      correct: z.boolean(),
      options: z.array(z.object({ id: z.string(), label: z.string(), selected: z.boolean(), isCorrect: z.boolean() })),
    }),
  ),
});
export type AttemptDetail = z.infer<typeof attemptDetailSchema>;

/** Durée lisible : « 12 min 05 s », « 45 s » ou « — ». */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes} min ${String(rest).padStart(2, "0")} s` : `${rest} s`;
}
