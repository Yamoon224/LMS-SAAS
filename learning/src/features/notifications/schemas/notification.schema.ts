import { z } from "zod";

export const notificationSchema = z.object({
  id: z.string(),
  templateKey: z.string(),
  payload: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});

export type AppNotification = z.infer<typeof notificationSchema>;
