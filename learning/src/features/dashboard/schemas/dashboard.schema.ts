import { z } from "zod";

/** GET /public/enrollments/dashboard (PUB-05). */
export const dashboardSchema = z.object({
  inProgress: z.array(
    z.object({
      enrollmentId: z.string(),
      courseId: z.string(),
      courseTitle: z.string().nullish(),
      courseCoverImageUrl: z.string().nullish(),
      progressPercent: z.number(),
      expiresAt: z.string().nullish(),
    }),
  ),
  completed: z.array(
    z.object({
      enrollmentId: z.string(),
      courseId: z.string(),
      courseTitle: z.string().nullish(),
      completedAt: z.string().nullish(),
    }),
  ),
  upcomingSessions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      startAt: z.string(),
      durationMinutes: z.number(),
      status: z.string(),
      meetLink: z.string().nullish(),
      enrollmentId: z.string(),
      courseId: z.string(),
      courseTitle: z.string().nullish(),
    }),
  ),
});
export type Dashboard = z.infer<typeof dashboardSchema>;
