import { z } from "zod";

/** GET /public/live-sessions/courses/:courseId */
export const liveSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string(),
  durationMinutes: z.number(),
  status: z.string(),
  meetLink: z.string().nullish(),
  replayUrl: z.string().nullish(),
});
export type LiveSession = z.infer<typeof liveSessionSchema>;
