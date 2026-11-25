import { z } from "zod";

import { serverGet } from "@/lib/server-api";

export const legalDocumentSchema = z.object({
  type: z.string(),
  version: z.number(),
  title: z.string(),
  content: z.string(),
  publishedAt: z.string().nullable(),
});
export type LegalDocument = z.infer<typeof legalDocumentSchema>;

/** GET /public/legal/:type — version courante (publique, rendue côté serveur). */
export function getLegalDocument(type: string) {
  return serverGet(`/public/legal/${encodeURIComponent(type)}`, legalDocumentSchema);
}
