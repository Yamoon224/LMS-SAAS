import { z } from "zod";

export const enrollmentStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PENDING_VALIDATION",
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "SUSPENDED",
  "REFUSED",
]);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>;

/** GET /public/enrollments/my */
export const enrollmentSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  status: enrollmentStatusSchema,
  pricePaid: z.number().nullish(),
  currency: z.string().nullish(),
  expiresAt: z.string().nullish(),
  completedAt: z.string().nullish(),
  courseTitle: z.string().nullish(),
  courseCoverImageUrl: z.string().nullish(),
});
export type Enrollment = z.infer<typeof enrollmentSchema>;

/** POST /public/enrollments */
export const enrollResultSchema = z.object({
  id: z.string(),
  status: enrollmentStatusSchema,
  pricePaid: z.number().optional(),
});
export type EnrollResult = z.infer<typeof enrollResultSchema>;

/** GET /public/enrollments/:id/courses/:courseId/modules-access (RG-09) */
export const moduleAccessSchema = z.object({
  moduleId: z.string(),
  validated: z.boolean(),
  accessible: z.boolean(),
  title: z.string().nullish(),
  order: z.number().nullish(),
});
export type ModuleAccess = z.infer<typeof moduleAccessSchema>;

export const examAccessSchema = z.object({ canAccess: z.boolean() });

/** Statuts donnant accès au contenu (miroir de isAccessGranting côté backend). */
export function isAccessGranting(status: EnrollmentStatus): boolean {
  return status === "ACTIVE" || status === "COMPLETED";
}
