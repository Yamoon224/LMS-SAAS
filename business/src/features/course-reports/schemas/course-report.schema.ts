import { z } from "zod";

/** GET /business/analytics/courses/:courseId/report (backend/.../analytics/domain/course-report.ts). */
export const courseReportSchema = z.object({
  courseId: z.string(),
  courseTitle: z.string(),
  funnel: z
    .object({
      key: z.enum(["ENROLLED", "STARTED", "MODULE_VALIDATED", "EXAM_PASSED"]),
      count: z.number(),
      percentOfEnrolled: z.number(),
    })
    .array(),
  blockingModules: z
    .object({
      moduleId: z.string(),
      title: z.string(),
      order: z.number(),
      attempts: z.number(),
      failedAttempts: z.number(),
      failureRatePercent: z.number(),
    })
    .array(),
  failedQuestions: z
    .object({
      questionId: z.string(),
      statement: z.string(),
      scope: z.string(),
      asked: z.number(),
      wrong: z.number(),
      failureRatePercent: z.number(),
    })
    .array(),
});
export type CourseReport = z.infer<typeof courseReportSchema>;

export const FUNNEL_LABELS: Record<CourseReport["funnel"][number]["key"], { label: string; hint: string }> = {
  ENROLLED: { label: "Inscrits", hint: "Apprenants ayant eu accès à la formation" },
  STARTED: { label: "Ont démarré", hint: "Au moins une leçon ouverte ou commencée" },
  MODULE_VALIDATED: { label: "Au moins un module validé", hint: "Au moins un quiz de module réussi" },
  EXAM_PASSED: { label: "Examen réussi", hint: "Examen final réussi" },
};
