import { z } from "zod";

/** GET /public/legal/pending — documents obligatoires dont la version courante n'est pas encore acceptée. */
export const pendingLegalSchema = z.object({
  type: z.string(),
  version: z.number(),
  title: z.string(),
});
export type PendingLegal = z.infer<typeof pendingLegalSchema>;
