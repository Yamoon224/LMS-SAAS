import { z } from "zod";

/** GET .../modules/:moduleId/quiz et GET .../exam (pas de .strict() : le backend ajoute des champs). */
export const assessmentInfoSchema = z.object({
  kind: z.string(),
  id: z.string(),
  passingScorePercent: z.number(),
  timeLimitMinutes: z.number().nullish(),
  maxAttempts: z.number().nullish(),
  delayBetweenAttemptsMinutes: z.number().nullish(),
  questionCount: z.number(),
  attemptsUsed: z.number(),
  extraAttemptsGranted: z.number().nullish(),
  attemptsRemaining: z.number().nullish(),
  inProgressAttemptId: z.string().nullish(),
  nextAttemptAt: z.string().nullish(),
  canStartNow: z.boolean(),
  blockedReason: z.string().nullish(),
  liveAttendance: z.object({ required: z.boolean() }).passthrough().nullish(),
});
export type AssessmentInfo = z.infer<typeof assessmentInfoSchema>;

export type AssessmentTarget = { kind: "quiz"; moduleId: string } | { kind: "exam" };

export const startAttemptSchema = z.object({ attemptId: z.string(), startedAt: z.string().optional() });

export const attemptQuestionSchema = z.object({
  id: z.string(),
  type: z.string(),
  statementHtml: z.string(),
  points: z.number(),
  options: z.array(z.object({ id: z.string(), label: z.string() })),
});
export type AttemptQuestion = z.infer<typeof attemptQuestionSchema>;

/** GET /public/attempts/:id */
export const attemptSchema = z.object({
  id: z.string(),
  kind: z.string(),
  status: z.string(),
  startedAt: z.string(),
  deadline: z.string().nullish(),
  serverNow: z.string(),
  timeElapsed: z.boolean().nullish(),
  questions: z.array(attemptQuestionSchema),
  answers: z.array(z.object({ questionId: z.string(), selectedOptionIds: z.array(z.string()) })),
});
export type Attempt = z.infer<typeof attemptSchema>;

/** GET /public/attempts/:id/result */
export const resultSchema = z.object({
  attemptId: z.string(),
  kind: z.string(),
  status: z.string(),
  passed: z.boolean(),
  scorePercent: z.number(),
  passingScorePercent: z.number(),
  submittedAt: z.string().nullish(),
  resultsDisplay: z.string().nullish(),
  review: z
    .array(
      z.object({
        questionId: z.string(),
        selectedOptionIds: z.array(z.string()),
        isCorrect: z.boolean(),
        correctOptionIds: z.array(z.string()),
        explanation: z.string().nullish(),
      }),
    )
    .nullish(),
});
export type AttemptResult = z.infer<typeof resultSchema>;
